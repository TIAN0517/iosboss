"""
生產等級持久性系統管理器
解決高併發崩潰問題，確保系統正常持久性運作
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
import json
import sqlite3
import socket
import requests
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import queue
from contextlib import contextmanager
import yaml
import shutil
from pathlib import Path

# 設置繁體中文日誌格式
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('production_system.log', encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ServiceConfig:
    """生產等級服務配置"""
    name: str
    command: List[str]
    port: int
    cwd: str
    max_instances: int = 2
    min_instances: int = 1
    health_check_interval: int = 10
    restart_delay: int = 5
    memory_limit_mb: int = 512
    cpu_threshold: float = 80.0
    response_time_limit: float = 5000  # 毫秒
    persistent_data_path: str = ""
    backup_enabled: bool = True
    auto_scaling: bool = True
    resource_monitoring: bool = True

@dataclass
class ServiceInstance:
    """服務實例"""
    pid: int
    port: int
    start_time: datetime
    memory_usage: float = 0.0
    cpu_usage: float = 0.0
    request_count: int = 0
    error_count: int = 0
    status: str = "starting"
    last_health_check: datetime = None
    last_response_time: float = 0.0
    consecutive_failures: int = 0
    recovery_attempts: int = 0

class ProductionDatabase:
    """生產等級數據庫"""
    
    def __init__(self, db_path: str = "production_system.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """初始化數據庫"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # 創建服務狀態表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS service_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_name TEXT NOT NULL,
                instance_id INTEGER NOT NULL,
                pid INTEGER NOT NULL,
                port INTEGER NOT NULL,
                status TEXT NOT NULL,
                memory_usage REAL DEFAULT 0,
                cpu_usage REAL DEFAULT 0,
                request_count INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                start_time TEXT NOT NULL,
                last_health_check TEXT,
                uptime_seconds INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 創建系統指標表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                cpu_percent REAL,
                memory_percent REAL,
                disk_usage REAL,
                network_io TEXT,
                active_instances INTEGER,
                total_requests INTEGER,
                error_rate REAL
            )
        ''')
        
        # 創建錯誤日誌表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                service_name TEXT NOT NULL,
                instance_id INTEGER,
                error_type TEXT NOT NULL,
                error_message TEXT NOT NULL,
                stack_trace TEXT,
                resolved BOOLEAN DEFAULT FALSE,
                resolution_time TEXT
            )
        ''')
        
        # 創建恢復歷史表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recovery_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                service_name TEXT NOT NULL,
                instance_id INTEGER,
                recovery_type TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                recovery_time_seconds REAL,
                details TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def log_service_status(self, service_name: str, instance: ServiceInstance):
        """記錄服務狀態"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO service_status 
            (service_name, instance_id, pid, port, status, memory_usage, cpu_usage, 
             request_count, error_count, start_time, last_health_check, uptime_seconds)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            service_name, instance.pid, instance.pid, instance.port, instance.status,
            instance.memory_usage, instance.cpu_usage, instance.request_count,
            instance.error_count, instance.start_time.isoformat(),
            instance.last_health_check.isoformat() if instance.last_health_check else None,
            (datetime.now() - instance.start_time).total_seconds()
        ))
        
        conn.commit()
        conn.close()
    
    def log_system_metrics(self, cpu_percent: float, memory_percent: float, 
                          disk_usage: float, network_io: str, active_instances: int,
                          total_requests: int, error_rate: float):
        """記錄系統指標"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO system_metrics
            (timestamp, cpu_percent, memory_percent, disk_usage, network_io,
             active_instances, total_requests, error_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(), cpu_percent, memory_percent, disk_usage,
            network_io, active_instances, total_requests, error_rate
        ))
        
        conn.commit()
        conn.close()
    
    def log_error(self, service_name: str, instance_id: int, error_type: str, 
                  error_message: str, stack_trace: str = None):
        """記錄錯誤"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO error_logs
            (timestamp, service_name, instance_id, error_type, error_message, stack_trace)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(), service_name, instance_id, error_type,
            error_message, stack_trace
        ))
        
        conn.commit()
        conn.close()
    
    def log_recovery(self, service_name: str, instance_id: int, recovery_type: str,
                    success: bool, recovery_time: float, details: str = None):
        """記錄恢復歷史"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO recovery_history
            (timestamp, service_name, instance_id, recovery_type, success, recovery_time_seconds, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(), service_name, instance_id, recovery_type,
            success, recovery_time, details
        ))
        
        conn.commit()
        conn.close()

class AdvancedLoadBalancer:
    """進階負載均衡器"""
    
    def __init__(self):
        self.instances: Dict[str, List[ServiceInstance]] = {}
        self.current_index: Dict[str, int] = {}
        self.health_scores: Dict[str, Dict[int, float]] = {}
    
    def register_instance(self, service_name: str, instance: ServiceInstance):
        """註冊實例"""
        if service_name not in self.instances:
            self.instances[service_name] = []
            self.current_index[service_name] = 0
            self.health_scores[service_name] = {}
        
        self.instances[service_name].append(instance)
        self.health_scores[service_name][instance.pid] = 100.0  # 初始健康分數
    
    def unregister_all_instances(self, service_name: str):
        """取消註冊所有實例"""
        if service_name in self.instances:
            del self.instances[service_name]
        if service_name in self.current_index:
            del self.current_index[service_name]
        if service_name in self.health_scores:
            del self.health_scores[service_name]
    
    def update_health_score(self, service_name: str, instance: ServiceInstance, score: float):
        """更新健康分數"""
        if service_name in self.health_scores:
            self.health_scores[service_name][instance.pid] = max(0, min(100, score))
    
    def get_best_instance(self, service_name: str) -> Optional[ServiceInstance]:
        """獲取最佳實例（基於健康分數和負載）"""
        if service_name not in self.instances:
            return None
        
        instances = self.instances[service_name]
        if not instances:
            return None
        
        # 過濾健康的實例
        healthy_instances = []
        for instance in instances:
            score = self.health_scores.get(service_name, {}).get(instance.pid, 0)
            if score > 50 and instance.status == "running":
                healthy_instances.append(instance)
        
        if not healthy_instances:
            # 如果沒有健康的實例，返回請求數最少的
            return min(instances, key=lambda x: x.request_count)
        
        # 選擇健康分數最高且請求數最少的實例
        return min(healthy_instances, key=lambda x: (
            -self.health_scores[service_name][x.pid],  # 負分數，高分優先
            x.request_count  # 請求數最少的優先
        ))

class ProductionMonitor:
    """生產等級監控系統"""
    
    def __init__(self, db: ProductionDatabase):
        self.db = db
        self.running = False
        self.monitoring_thread = None
    
    def start(self):
        """啟動監控"""
        self.running = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        logger.info("🔍 生產等級監控系統已啟動")
    
    def stop(self):
        """停止監控"""
        self.running = False
        if self.monitoring_thread:
            self.monitoring_thread.join()
        logger.info("⏹️ 生產等級監控系統已停止")
    
    def _monitoring_loop(self):
        """監控循環"""
        while self.running:
            try:
                # 收集系統指標
                self._collect_system_metrics()
                
                # 檢查磁碟空間
                self._check_disk_space()
                
                # 檢查記憶體使用
                self._check_memory_usage()
                
                time.sleep(30)  # 每30秒檢查一次
                
            except Exception as e:
                logger.error(f"監控系統出錯: {e}")
                time.sleep(10)
    
    def _collect_system_metrics(self):
        """收集系統指標"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()
            
            # 計算整體指標
            active_instances = sum(len(instances) for instances in 
                                 ProductionManager.get_instance().instances.values())
            total_requests = sum(sum(inst.request_count for inst in instances)
                              for instances in ProductionManager.get_instance().instances.values())
            total_errors = sum(sum(inst.error_count for inst in instances)
                             for instances in ProductionManager.get_instance().instances.values())
            error_rate = (total_errors / max(total_requests, 1)) * 100
            
            self.db.log_system_metrics(
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_usage=(disk.used / disk.total) * 100,
                network_io=f"{network.bytes_sent}:{network.bytes_recv}",
                active_instances=active_instances,
                total_requests=total_requests,
                error_rate=error_rate
            )
            
        except Exception as e:
            logger.error(f"收集系統指標失敗: {e}")
    
    def _check_disk_space(self):
        """檢查磁碟空間"""
        try:
            disk = psutil.disk_usage('/')
            usage_percent = (disk.used / disk.total) * 100
            
            if usage_percent > 90:
                logger.warning(f"⚠️ 磁碟空間不足: {usage_percent:.1f}%")
                self._cleanup_logs()
            
        except Exception as e:
            logger.error(f"檢查磁碟空間失敗: {e}")
    
    def _check_memory_usage(self):
        """檢查記憶體使用"""
        try:
            memory = psutil.virtual_memory()
            
            if memory.percent > 90:
                logger.warning(f"⚠️ 記憶體使用過高: {memory.percent:.1f}%")
                self._emergency_cleanup()
            
        except Exception as e:
            logger.error(f"檢查記憶體使用失敗: {e}")
    
    def _cleanup_logs(self):
        """清理日誌文件"""
        try:
            log_dir = Path("logs")
            if log_dir.exists():
                # 刪除7天前的日誌
                cutoff_time = datetime.now() - timedelta(days=7)
                for log_file in log_dir.glob("*.log"):
                    if log_file.stat().st_mtime < cutoff_time.timestamp():
                        log_file.unlink()
                        logger.info(f"已清理舊日誌: {log_file}")
        except Exception as e:
            logger.error(f"清理日誌失敗: {e}")
    
    def _emergency_cleanup(self):
        """緊急清理"""
        try:
            # 清理臨時文件
            temp_dirs = ["temp", "tmp", "__pycache__"]
            for temp_dir in temp_dirs:
                temp_path = Path(temp_dir)
                if temp_path.exists():
                    shutil.rmtree(temp_path, ignore_errors=True)
                    logger.info(f"已清理臨時目錄: {temp_dir}")
            
            # 強制垃圾回收
            import gc
            gc.collect()
            
        except Exception as e:
            logger.error(f"緊急清理失敗: {e}")

class ProductionManager:
    """生產等級系統管理器"""
    
    _instance = None
    _instance_lock = threading.Lock()
    
    @classmethod
    def get_instance(cls):
        """單例模式"""
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        self.services: Dict[str, ServiceConfig] = {}
        self.instances: Dict[str, List[ServiceInstance]] = {}
        self.running = False
        self.db = ProductionDatabase()
        self.load_balancer = AdvancedLoadBalancer()
        self.monitor = ProductionMonitor(self.db)
        self.health_checker = None
        self.recovery_system = None
        
        # 初始化配置
        self._load_production_config()
    
    def _load_production_config(self):
        """載入生產配置"""
        config_file = "production_config.yaml"
        
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    config_data = yaml.safe_load(f)
                
                for service_name, service_config in config_data.get('services', {}).items():
                    config = ServiceConfig(
                        name=service_name,
                        command=service_config['command'],
                        port=service_config['port'],
                        cwd=service_config['cwd'],
                        max_instances=service_config.get('max_instances', 2),
                        min_instances=service_config.get('min_instances', 1),
                        memory_limit_mb=service_config.get('memory_limit_mb', 512),
                        cpu_threshold=service_config.get('cpu_threshold', 80.0),
                        persistent_data_path=service_config.get('persistent_data_path', ''),
                        backup_enabled=service_config.get('backup_enabled', True)
                    )
                    self.register_service(config)
                
                logger.info(f"已載入 {len(self.services)} 個服務配置")
                
            except Exception as e:
                logger.error(f"載入配置失敗: {e}")
                self._create_default_config()
        else:
            self._create_default_config()
    
    def _create_default_config(self):
        """創建默認配置"""
        default_configs = [
            ServiceConfig(
                name="nextjs",
                command=["npm", "run", "dev"],
                port=9999,
                cwd=os.getcwd(),
                max_instances=2,
                min_instances=1,
                memory_limit_mb=1024,
                cpu_threshold=80.0,
                persistent_data_path="./data/nextjs",
                backup_enabled=True
            ),
            ServiceConfig(
                name="linebot",
                command=["python", "main.py"],
                port=8888,
                cwd=os.path.join(os.getcwd(), "line_bot_ai"),
                max_instances=3,
                min_instances=1,
                memory_limit_mb=512,
                cpu_threshold=70.0,
                persistent_data_path="./data/linebot",
                backup_enabled=True
            ),
            ServiceConfig(
                name="voice",
                command=["python", "instant_voice_test.py"],
                port=8889,
                cwd=os.path.join(os.getcwd(), "line_bot_ai"),
                max_instances=2,
                min_instances=1,
                memory_limit_mb=256,
                cpu_threshold=60.0,
                persistent_data_path="./data/voice",
                backup_enabled=True
            )
        ]
        
        for config in default_configs:
            self.register_service(config)
        
        # 保存配置
        self._save_production_config()
        logger.info("已創建默認服務配置")
    
    def _save_production_config(self):
        """保存生產配置"""
        config_data = {
            'services': {}
        }
        
        for name, config in self.services.items():
            config_data['services'][name] = {
                'command': config.command,
                'port': config.port,
                'cwd': config.cwd,
                'max_instances': config.max_instances,
                'min_instances': config.min_instances,
                'memory_limit_mb': config.memory_limit_mb,
                'cpu_threshold': config.cpu_threshold,
                'persistent_data_path': config.persistent_data_path,
                'backup_enabled': config.backup_enabled
            }
        
        try:
            with open('production_config.yaml', 'w', encoding='utf-8') as f:
                yaml.dump(config_data, f, default_flow_style=False, allow_unicode=True)
        except Exception as e:
            logger.error(f"保存配置失敗: {e}")
    
    def register_service(self, config: ServiceConfig):
        """註冊服務"""
        self.services[config.name] = config
        self.instances[config.name] = []
        
        # 創建持久化目錄
        if config.persistent_data_path:
            os.makedirs(config.persistent_data_path, exist_ok=True)
        
        logger.info(f"✅ 服務已註冊: {config.name}")
    
    def start_service(self, service_name: str, instance_count: int = 1) -> bool:
        """啟動服務實例"""
        if service_name not in self.services:
            logger.error(f"❌ 服務未註冊: {service_name}")
            return False
        
        config = self.services[service_name]
        instances = self.instances[service_name]
        
        # 檢查最小實例數量
        if len(instances) < config.min_instances:
            instance_count = max(instance_count, config.min_instances - len(instances))
        
        # 檢查最大實例數量限制
        if len(instances) + instance_count > config.max_instances:
            instance_count = config.max_instances - len(instances)
            if instance_count <= 0:
                logger.warning(f"⚠️ 服務 {service_name} 已達到最大實例數")
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
                    logger.info(f"✅ 服務 {service_name} 實例 {i+1} 啟動成功 (PID: {instance.pid})")
                else:
                    logger.error(f"❌ 服務 {service_name} 實例 {i+1} 啟動失敗")
            except Exception as e:
                logger.error(f"啟動 {service_name} 實例時出錯: {e}")
        
        # 記錄到數據庫
        for instance in instances[-success_count:]:
            self.db.log_service_status(service_name, instance)
        
        return success_count > 0
    
    def _start_instance(self, config: ServiceConfig) -> Optional[ServiceInstance]:
        """啟動單個實例"""
        try:
            # 檢查端口可用性
            if not self._is_port_available(config.port):
                logger.warning(f"⚠️ 端口 {config.port} 已被占用")
                return None
            
            # 創建進程
            process = subprocess.Popen(
                config.command,
                cwd=config.cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                start_new_session=True,
                env=dict(os.environ, **{
                    'PORT': str(config.port),
                    'SERVICE_NAME': config.name,
                    'PERSISTENT_PATH': config.persistent_data_path
                })
            )
            
            # 等待進程啟動
            time.sleep(3)
            
            # 檢查進程狀態
            if process.poll() is not None:
                logger.error(f"❌ 進程啟動後立即退出")
                return None
            
            # 創建實例
            instance = ServiceInstance(
                pid=process.pid,
                port=config.port,
                start_time=datetime.now(),
                status="running"
            )
            
            return instance
            
        except Exception as e:
            logger.error(f"啟動實例時出錯: {e}")
            return None
    
    def _is_port_available(self, port: int) -> bool:
        """檢查端口是否可用"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
                sock.settimeout(1)
                result = sock.connect_ex(('localhost', port))
                return result != 0
        except:
            return True
    
    def get_best_instance(self, service_name: str) -> Optional[ServiceInstance]:
        """獲取最佳實例"""
        return self.load_balancer.get_best_instance(service_name)
    
    def get_system_status(self) -> Dict:
        """獲取系統狀態"""
        status = {
            "timestamp": datetime.now().isoformat(),
            "running": self.running,
            "services": {},
            "system_metrics": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": (psutil.disk_usage('/').used / psutil.disk_usage('/').total) * 100
            }
        }
        
        for service_name, instances in self.instances.items():
            config = self.services[service_name]
            service_status = {
                "config": asdict(config),
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
                        "uptime_seconds": (datetime.now() - instance.start_time).total_seconds(),
                        "health_score": self.load_balancer.health_scores.get(service_name, {}).get(instance.pid, 0)
                    })
                except psutil.NoSuchProcess:
                    service_status["instances"].append({
                        "pid": instance.pid,
                        "status": "not_found"
                    })
            
            status["services"][service_name] = service_status
        
        return status
    
    def start_all_services(self):
        """啟動所有服務"""
        logger.info("🚀 啟動所有生產等級服務...")
        
        for service_name, config in self.services.items():
            self.start_service(service_name, config.min_instances)
        
        # 啟動監控
        self.monitor.start()
        
        self.running = True
        logger.info("✅ 所有生產等級服務啟動完成")
    
    def stop_all_services(self):
        """停止所有服務"""
        logger.info("⏹️ 停止所有服務...")
        
        self.running = False
        self.monitor.stop()
        
        for service_name in list(self.services.keys()):
            self.stop_service(service_name)
        
        logger.info("✅ 所有服務已停止")
    
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
                    logger.info(f"✅ 實例已停止 (PID: {instance.pid})")
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

def create_production_config():
    """創建生產配置文件"""
    config = {
        'services': {
            'nextjs': {
                'command': ['npm', 'run', 'dev'],
                'port': 9999,
                'cwd': os.getcwd(),
                'max_instances': 2,
                'min_instances': 1,
                'memory_limit_mb': 1024,
                'cpu_threshold': 80.0,
                'persistent_data_path': './data/nextjs',
                'backup_enabled': True
            },
            'linebot': {
                'command': ['python', 'main.py'],
                'port': 8888,
                'cwd': os.path.join(os.getcwd(), 'line_bot_ai'),
                'max_instances': 3,
                'min_instances': 1,
                'memory_limit_mb': 512,
                'cpu_threshold': 70.0,
                'persistent_data_path': './data/linebot',
                'backup_enabled': True
            },
            'voice': {
                'command': ['python', 'instant_voice_test.py'],
                'port': 8889,
                'cwd': os.path.join(os.getcwd(), 'line_bot_ai'),
                'max_instances': 2,
                'min_instances': 1,
                'memory_limit_mb': 256,
                'cpu_threshold': 60.0,
                'persistent_data_path': './data/voice',
                'backup_enabled': True
            }
        }
    }
    
    with open('production_config.yaml', 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
    
    logger.info("✅ 生產配置文件已創建: production_config.yaml")

if __name__ == "__main__":
    import sys
    
    # 創建生產配置
    create_production_config()
    
    # 初始化管理器
    manager = ProductionManager.get_instance()
    
    if len(sys.argv) < 2:
        print("用法: python production_manager.py [start|stop|status|restart]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "start":
        manager.start_all_services()
        
        # 保持運行並顯示狀態
        try:
            while True:
                time.sleep(60)
                status = manager.get_system_status()
                print(f"\n📊 系統狀態更新:")
                print(f"時間: {status['timestamp']}")
                print(f"CPU: {status['system_metrics']['cpu_percent']:.1f}%")
                print(f"記憶體: {status['system_metrics']['memory_percent']:.1f}%")
                print(f"磁碟: {status['system_metrics']['disk_percent']:.1f}%")
                
                for service_name, service_data in status['services'].items():
                    healthy_instances = sum(1 for inst in service_data['instances'] if inst.get('status') == 'running')
                    total_instances = len(service_data['instances'])
                    print(f"  {service_name}: {healthy_instances}/{total_instances} 實例運行中")
                
        except KeyboardInterrupt:
            print("\n🛑 正在停止系統...")
            manager.stop_all_services()
    
    elif command == "stop":
        manager.stop_all_services()
        print("✅ 系統已停止")
    
    elif command == "status":
        status = manager.get_system_status()
        print(json.dumps(status, indent=2, ensure_ascii=False))
    
    elif command == "restart":
        manager.stop_all_services()
        time.sleep(5)
        manager.start_all_services()
        print("🔄 系統已重啟")
    
    else:
        print(f"❌ 未知命令: {command}")
        sys.exit(1)