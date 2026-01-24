"""
高併發穩定系統管理器
解決 Python 和 Node.js 崩潰問題
"""

import asyncio
import multiprocessing
import psutil
import threading
import time
import logging
import subprocess
import signal
import os
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
import queue
import json
import socket
from contextlib import contextmanager

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class ServiceConfig:
    """服務配置"""
    name: str
    command: List[str]
    port: int
    cwd: str
    max_instances: int = 2  # 最大實例數
    health_check_interval: int = 10  # 健康檢查間隔（秒）
    restart_delay: int = 5  # 重啟延遲（秒）
    memory_limit_mb: int = 512  # 內存限制（MB）
    cpu_threshold: float = 80.0  # CPU 使用率閾值（%）

@dataclass
class ServiceInstance:
    """服務實例"""
    pid: int
    port: int
    start_time: datetime
    memory_usage: float
    cpu_usage: float
    request_count: int
    error_count: int
    status: str = "running"  # running, stopped, error, restarting

class HighConcurrencyManager:
    """高併發系統管理器"""
    
    def __init__(self):
        self.services: Dict[str, ServiceConfig] = {}
        self.instances: Dict[str, List[ServiceInstance]] = {}
        self.running = False
        self.load_balancer = LoadBalancer()
        self.monitoring_thread = None
        self.recovery_thread = None
        
    def register_service(self, config: ServiceConfig):
        """註冊服務"""
        self.services[config.name] = config
        self.instances[config.name] = []
        logger.info(f"服務已註冊: {config.name}")
    
    def start_service(self, service_name: str, instance_count: int = 1) -> bool:
        """啟動服務實例"""
        if service_name not in self.services:
            logger.error(f"服務未註冊: {service_name}")
            return False
        
        config = self.services[service_name]
        instances = self.instances[service_name]
        
        # 檢查實例數量限制
        if len(instances) >= config.max_instances:
            logger.warning(f"服務 {service_name} 已達到最大實例數")
            return False
        
        # 創建實例
        success_count = 0
        for i in range(instance_count):
            try:
                instance = self._start_instance(config)
                if instance:
                    instances.append(instance)
                    self.load_balancer.register_instance(service_name, instance)
                    success_count += 1
                    logger.info(f"服務 {service_name} 實例 {i+1} 啟動成功 (PID: {instance.pid})")
                else:
                    logger.error(f"服務 {service_name} 實例 {i+1} 啟動失敗")
            except Exception as e:
                logger.error(f"啟動 {service_name} 實例時出錯: {e}")
        
        return success_count > 0
    
    def _start_instance(self, config: ServiceConfig) -> Optional[ServiceInstance]:
        """啟動單個實例"""
        try:
            # 檢查端口是否可用
            if not self._is_port_available(config.port):
                logger.warning(f"端口 {config.port} 已被占用")
                return None
            
            # 啟動進程
            process = subprocess.Popen(
                config.command,
                cwd=config.cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True
            )
            
            # 等待進程啟動
            time.sleep(2)
            
            # 檢查進程是否還在運行
            if process.poll() is not None:
                logger.error(f"進程啟動後立即退出")
                return None
            
            # 創建實例
            instance = ServiceInstance(
                pid=process.pid,
                port=config.port,
                start_time=datetime.now(),
                memory_usage=0.0,
                cpu_usage=0.0,
                request_count=0,
                error_count=0
            )
            
            return instance
            
        except Exception as e:
            logger.error(f"啟動實例時出錯: {e}")
            return None
    
    def stop_service(self, service_name: str) -> bool:
        """停止服務"""
        if service_name not in self.services:
            return False
        
        instances = self.instances[service_name]
        success_count = 0
        
        for instance in instances:
            try:
                if self._stop_instance(instance):
                    success_count += 1
                    logger.info(f"實例已停止 (PID: {instance.pid})")
                else:
                    logger.error(f"停止實例失敗 (PID: {instance.pid})")
            except Exception as e:
                logger.error(f"停止實例時出錯: {e}")
        
        # 清理實例列表
        self.instances[service_name] = []
        self.load_balancer.unregister_all_instances(service_name)
        
        return success_count > 0
    
    def _stop_instance(self, instance: ServiceInstance) -> bool:
        """停止單個實例"""
        try:
            # 優雅停止
            os.kill(instance.pid, signal.SIGTERM)
            
            # 等待停止
            for _ in range(10):
                time.sleep(0.5)
                try:
                    os.kill(instance.pid, 0)
                except OSError:
                    break
            else:
                # 強制終止
                os.kill(instance.pid, signal.SIGKILL)
            
            instance.status = "stopped"
            return True
            
        except Exception as e:
            logger.error(f"停止實例時出錯: {e}")
            return False
    
    def restart_unhealthy_instances(self):
        """重啟不健康的實例"""
        for service_name, instances in self.instances.items():
            config = self.services[service_name]
            
            for instance in instances[:]:  # 使用切片複製列表
                try:
                    # 檢查進程狀態
                    if not self._is_process_running(instance.pid):
                        logger.warning(f"實例 {instance.pid} 已停止，正在重啟")
                        self._restart_instance(service_name, instance)
                        continue
                    
                    # 檢查資源使用
                    if not self._check_instance_health(instance, config):
                        logger.warning(f"實例 {instance.pid} 健康檢查失敗，正在重啟")
                        self._restart_instance(service_name, instance)
                        
                except Exception as e:
                    logger.error(f"檢查實例健康時出錯: {e}")
    
    def _restart_instance(self, service_name: str, instance: ServiceInstance):
        """重啟實例"""
        # 停止舊實例
        self._stop_instance(instance)
        
        # 從列表中移除
        self.instances[service_name].remove(instance)
        
        # 啟動新實例
        config = self.services[service_name]
        new_instance = self._start_instance(config)
        if new_instance:
            self.instances[service_name].append(new_instance)
            self.load_balancer.register_instance(service_name, new_instance)
            logger.info(f"實例重啟成功 (新 PID: {new_instance.pid})")
    
    def _is_process_running(self, pid: int) -> bool:
        """檢查進程是否運行"""
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False
    
    def _check_instance_health(self, instance: ServiceInstance, config: ServiceConfig) -> bool:
        """檢查實例健康"""
        try:
            # 獲取進程信息
            process = psutil.Process(instance.pid)
            
            # 檢查內存使用
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            instance.memory_usage = memory_mb
            
            if memory_mb > config.memory_limit_mb:
                logger.warning(f"實例內存使用過高: {memory_mb:.1f}MB > {config.memory_limit_mb}MB")
                return False
            
            # 檢查 CPU 使用
            cpu_percent = process.cpu_percent()
            instance.cpu_usage = cpu_percent
            
            if cpu_percent > config.cpu_threshold:
                logger.warning(f"實例 CPU 使用過高: {cpu_percent:.1f}% > {config.cpu_threshold}%")
                return False
            
            # 檢查端口可用性
            if not self._is_port_available(instance.port):
                logger.warning(f"實例端口 {instance.port} 不可用")
                return False
            
            # 檢查響應時間
            response_time = self._check_port_response_time(instance.port)
            if response_time > 5000:  # 5秒
                logger.warning(f"實例響應時間過長: {response_time}ms")
                return False
            
            instance.status = "running"
            return True
            
        except psutil.NoSuchProcess:
            logger.warning(f"實例進程不存在: {instance.pid}")
            return False
        except Exception as e:
            logger.error(f"檢查實例健康時出錯: {e}")
            return False
    
    def _is_port_available(self, port: int) -> bool:
        """檢查端口是否可用"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex(('localhost', port))
                return result != 0
        except:
            return True
    
    def _check_port_response_time(self, port: int) -> float:
        """檢查端口響應時間"""
        try:
            start_time = time.time()
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(3)
                sock.connect(('localhost', port))
                response_time = (time.time() - start_time) * 1000
                return response_time
        except:
            return float('inf')
    
    def get_system_status(self) -> Dict:
        """獲取系統狀態"""
        status = {
            "timestamp": datetime.now().isoformat(),
            "running": self.running,
            "services": {}
        }
        
        for service_name, instances in self.instances.items():
            config = self.services[service_name]
            service_status = {
                "config": {
                    "max_instances": config.max_instances,
                    "memory_limit_mb": config.memory_limit_mb,
                    "cpu_threshold": config.cpu_threshold
                },
                "instances": []
            }
            
            for instance in instances:
                try:
                    process = psutil.Process(instance.pid)
                    service_status["instances"].append({
                        "pid": instance.pid,
                        "port": instance.port,
                        "start_time": instance.start_time.isoformat(),
                        "status": instance.status,
                        "memory_usage_mb": instance.memory_usage,
                        "cpu_usage_percent": instance.cpu_usage,
                        "request_count": instance.request_count,
                        "error_count": instance.error_count,
                        "uptime_seconds": (datetime.now() - instance.start_time).total_seconds()
                    })
                except psutil.NoSuchProcess:
                    service_status["instances"].append({
                        "pid": instance.pid,
                        "status": "not_found"
                    })
            
            status["services"][service_name] = service_status
        
        return status

class LoadBalancer:
    """負載均衡器"""
    
    def __init__(self):
        self.instances: Dict[str, List[ServiceInstance]] = {}
        self.current_index: Dict[str, int] = {}
    
    def register_instance(self, service_name: str, instance: ServiceInstance):
        """註冊實例"""
        if service_name not in self.instances:
            self.instances[service_name] = []
            self.current_index[service_name] = 0
        
        self.instances[service_name].append(instance)
    
    def unregister_all_instances(self, service_name: str):
        """取消註冊所有實例"""
        if service_name in self.instances:
            del self.instances[service_name]
        if service_name in self.current_index:
            del self.current_index[service_name]
    
    def get_best_instance(self, service_name: str) -> Optional[ServiceInstance]:
        """獲取最佳實例（最少使用）"""
        if service_name not in self.instances:
            return None
        
        instances = self.instances[service_name]
        if not instances:
            return None
        
        # 選擇請求數最少的實例
        return min(instances, key=lambda x: x.request_count)

class HealthChecker:
    """健康檢查器"""
    
    def __init__(self, manager: HighConcurrencyManager):
        self.manager = manager
        self.running = False
    
    def start(self):
        """啟動健康檢查"""
        self.running = True
        
        def health_check_loop():
            while self.running:
                try:
                    self.manager.restart_unhealthy_instances()
                    time.sleep(10)  # 每10秒檢查一次
                except Exception as e:
                    logger.error(f"健康檢查出錯: {e}")
                    time.sleep(5)
        
        thread = threading.Thread(target=health_check_loop, daemon=True)
        thread.start()
        logger.info("健康檢查器已啟動")
    
    def stop(self):
        """停止健康檢查"""
        self.running = False

class AutoRecoverySystem:
    """自動恢復系統"""
    
    def __init__(self, manager: HighConcurrencyManager):
        self.manager = manager
        self.running = False
        self.recovery_policies = {}
    
    def add_recovery_policy(self, service_name: str, policy: Dict):
        """添加恢復策略"""
        self.recovery_policies[service_name] = policy
        logger.info(f"已添加恢復策略: {service_name}")
    
    def start(self):
        """啟動自動恢復"""
        self.running = True
        
        def recovery_loop():
            while self.running:
                try:
                    self._check_and_recover()
                    time.sleep(30)  # 每30秒檢查一次
                except Exception as e:
                    logger.error(f"自動恢復出錯: {e}")
                    time.sleep(10)
        
        thread = threading.Thread(target=recovery_loop, daemon=True)
        thread.start()
        logger.info("自動恢復系統已啟動")
    
    def stop(self):
        """停止自動恢復"""
        self.running = False
    
    def _check_and_recover(self):
        """檢查並恢復"""
        for service_name, instances in self.manager.instances.items():
            policy = self.recovery_policies.get(service_name, {})
            
            # 檢查實例數量
            if len(instances) < policy.get('min_instances', 1):
                logger.warning(f"服務 {service_name} 實例數量不足，正在恢復")
                self.manager.start_service(service_name, 1)
            
            # 檢查整體健康狀況
            if self._is_service_unhealthy(service_name):
                logger.error(f"服務 {service_name} 健康狀況不佳，正在執行恢復")
                self._recover_service(service_name)
    
    def _is_service_unhealthy(self, service_name: str) -> bool:
        """檢查服務是否不健康"""
        instances = self.manager.instances.get(service_name, [])
        
        if not instances:
            return True
        
        # 如果超過一半的實例有問題，認為不健康
        healthy_count = sum(1 for inst in instances if inst.status == "running")
        return healthy_count < len(instances) / 2
    
    def _recover_service(self, service_name: str):
        """恢復服務"""
        # 停止所有實例
        self.manager.stop_service(service_name)
        time.sleep(5)
        
        # 重新啟動
        config = self.manager.services[service_name]
        self.manager.start_service(service_name, config.max_instances)
        
        logger.info(f"服務 {service_name} 已恢復")

# 全局管理器實例
manager = HighConcurrencyManager()
health_checker = HealthChecker(manager)
auto_recovery = AutoRecoverySystem(manager)

def initialize_system():
    """初始化高併發系統"""
    logger.info("🚀 初始化高併發穩定系統...")
    
    # 註冊服務
    manager.register_service(ServiceConfig(
        name="nextjs",
        command=["npm", "run", "dev"],
        port=9999,
        cwd=os.getcwd(),
        max_instances=2,
        memory_limit_mb=1024,
        cpu_threshold=80.0
    ))
    
    manager.register_service(ServiceConfig(
        name="linebot",
        command=["python", "main.py"],
        port=8888,
        cwd=os.path.join(os.getcwd(), "line_bot_ai"),
        max_instances=3,
        memory_limit_mb=512,
        cpu_threshold=70.0
    ))
    
    manager.register_service(ServiceConfig(
        name="voice",
        command=["python", "instant_voice_test.py"],
        port=8889,
        cwd=os.path.join(os.getcwd(), "line_bot_ai"),
        max_instances=2,
        memory_limit_mb=256,
        cpu_threshold=60.0
    ))
    
    # 添加恢復策略
    auto_recovery.add_recovery_policy("nextjs", {"min_instances": 1})
    auto_recovery.add_recovery_policy("linebot", {"min_instances": 1})
    auto_recovery.add_recovery_policy("voice", {"min_instances": 1})
    
    # 啟動監控
    health_checker.start()
    auto_recovery.start()
    
    logger.info("✅ 高併發穩定系統初始化完成")

def start_all_services():
    """啟動所有服務"""
    logger.info("🔄 啟動所有服務...")
    
    # 啟動 Next.js
    manager.start_service("nextjs", 1)
    
    # 啟動 LINE Bot
    manager.start_service("linebot", 1)
    
    # 啟動語音服務
    manager.start_service("voice", 1)
    
    logger.info("✅ 所有服務啟動完成")

def stop_all_services():
    """停止所有服務"""
    logger.info("⏹️ 停止所有服務...")
    
    for service_name in ["nextjs", "linebot", "voice"]:
        manager.stop_service(service_name)
    
    logger.info("✅ 所有服務已停止")

def get_system_status() -> Dict:
    """獲取系統狀態"""
    return manager.get_system_status()

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("用法: python high_concurrency_manager.py [start|stop|status]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "start":
        initialize_system()
        start_all_services()
        print("🎉 高併發系統已啟動")
        
        # 保持運行
        try:
            while True:
                time.sleep(30)
                status = get_system_status()
                print(f"系統狀態: {json.dumps(status, indent=2, ensure_ascii=False)}")
        except KeyboardInterrupt:
            print("\n正在停止...")
            stop_all_services()
    
    elif command == "stop":
        stop_all_services()
        print("🛑 系統已停止")
    
    elif command == "status":
        status = get_system_status()
        print(json.dumps(status, indent=2, ensure_ascii=False))
    
    else:
        print(f"未知命令: {command}")
        sys.exit(1)
