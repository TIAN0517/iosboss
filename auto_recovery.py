"""
錯誤自動修護系統
確保 LINE 系統前後端穩定運行
"""

import asyncio
import logging
import subprocess
import psutil
import requests
import time
import os
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ServiceStatus:
    name: str
    port: int
    pid: Optional[int] = None
    status: str = "unknown"  # running, stopped, error, restarting
    last_check: Optional[datetime] = None
    consecutive_failures: int = 0

class AutoRecoverySystem:
    """錯誤自動修護系統"""
    
    def __init__(self):
        self.services: Dict[str, ServiceStatus] = {
            "nextjs": ServiceStatus("Next.js Frontend", 9999),
            "line_bot": ServiceStatus("LINE Bot Service", 8888),
            "voice_service": ServiceStatus("Voice Test Service", 8889)
        }
        self.running = False
        self.check_interval = 30  # 檢查間隔 30 秒
        self.max_failures = 3  # 最大連續失敗次數
        self.working_dir = os.getcwd()
        
    async def start_monitoring(self):
        """啟動監控系統"""
        self.running = True
        logger.info("🔄 錯誤自動修護系統已啟動")
        
        # 初始化服務狀態
        await self._discover_running_services()
        
        # 啟動監控循環
        while self.running:
            try:
                await self._check_all_services()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"監控循環錯誤: {e}")
                await asyncio.sleep(5)  # 錯誤時短暫等待
    
    def stop_monitoring(self):
        """停止監控"""
        self.running = False
        logger.info("⏹️ 錯誤自動修護系統已停止")
    
    async def _discover_running_services(self):
        """發現運行中的服務"""
        for service_name, service in self.services.items():
            port = service.port
            
            # 檢查端口是否被占用
            try:
                result = subprocess.run([
                    'netstat', '-ano', '|', 'findstr', f':{port}'
                ], capture_output=True, text=True, shell=True)
                
                if result.returncode == 0 and 'LISTENING' in result.stdout:
                    # 解析 PID
                    for line in result.stdout.split('\n'):
                        if f':{port}' in line and 'LISTENING' in line:
                            parts = line.strip().split()
                            if len(parts) >= 5:
                                try:
                                    pid = int(parts[4])
                                    service.pid = pid
                                    service.status = "running"
                                    logger.info(f"✅ 發現運行中的 {service.name} (PID: {pid})")
                                    break
                                except ValueError:
                                    continue
            except Exception as e:
                logger.warning(f"檢查端口 {port} 時出錯: {e}")
    
    async def _check_all_services(self):
        """檢查所有服務"""
        current_time = datetime.now()
        
        for service_name, service in self.services.items():
            await self._check_service(service, current_time)
    
    async def _check_service(self, service: ServiceStatus, current_time: datetime):
        """檢查單個服務"""
        service.last_check = current_time
        
        try:
            # 檢查端口響應
            is_healthy = await self._check_port_health(service.port)
            
            if is_healthy:
                if service.status != "running":
                    logger.info(f"✅ {service.name} 恢復正常")
                service.status = "running"
                service.consecutive_failures = 0
            else:
                service.consecutive_failures += 1
                logger.warning(f"⚠️ {service.name} 無響應 (失敗 {service.consecutive_failures} 次)")
                
                if service.consecutive_failures >= self.max_failures:
                    await self._restart_service(service)
        
        except Exception as e:
            logger.error(f"檢查 {service.name} 時出錯: {e}")
            service.consecutive_failures += 1
    
    async def _check_port_health(self, port: int) -> bool:
        """檢查端口健康狀態"""
        try:
            # 使用 curl 檢查端口響應
            url = f"http://localhost:{port}"
            response = requests.get(url, timeout=5)
            return response.status_code in [200, 404]  # 200 或 404 都算正常
        except requests.exceptions.RequestException:
            try:
                # 備用方案：檢查端口是否開放
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(3)
                result = sock.connect_ex(('localhost', port))
                sock.close()
                return result == 0
            except:
                return False
    
    async def _restart_service(self, service: ServiceStatus):
        """重啟服務"""
        logger.info(f"🔄 重啟 {service.name}...")
        service.status = "restarting"
        
        try:
            if service.name == "Next.js Frontend":
                await self._restart_nextjs()
            elif service.name == "LINE Bot Service":
                await self._restart_line_bot()
            elif service.name == "Voice Test Service":
                await self._restart_voice_service()
            
            # 等待重啟完成
            await asyncio.sleep(5)
            
            # 驗證重啟
            is_healthy = await self._check_port_health(service.port)
            if is_healthy:
                service.status = "running"
                service.consecutive_failures = 0
                logger.info(f"✅ {service.name} 重啟成功")
            else:
                service.status = "error"
                logger.error(f"❌ {service.name} 重啟失敗")
                
        except Exception as e:
            service.status = "error"
            logger.error(f"❌ {service.name} 重啟時出錯: {e}")
    
    async def _restart_nextjs(self):
        """重啟 Next.js 服務"""
        # 殺死現有進程
        await self._kill_process_by_port(9999)
        
        # 啟動新服務
        process = await asyncio.create_subprocess_exec(
            'npm', 'run', 'dev',
            cwd=self.working_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        logger.info("🚀 Next.js 服務已重啟")
    
    async def _restart_line_bot(self):
        """重啟 LINE Bot 服務"""
        # 殺死現有進程
        await self._kill_process_by_port(8888)
        
        # 啟動新服務
        process = await asyncio.create_subprocess_exec(
            'python', 'main.py',
            cwd=f"{self.working_dir}/line_bot_ai",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        logger.info("🤖 LINE Bot 服務已重啟")
    
    async def _restart_voice_service(self):
        """重啟語音測試服務"""
        # 殺死現有進程
        await self._kill_process_by_port(8889)
        
        # 啟動新服務
        process = await asyncio.create_subprocess_exec(
            'python', 'instant_voice_test.py',
            cwd=f"{self.working_dir}/line_bot_ai",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        logger.info("🎤 語音測試服務已重啟")
    
    async def _kill_process_by_port(self, port: int):
        """根據端口殺死進程"""
        try:
            result = subprocess.run([
                'netstat', '-ano', '|', 'findstr', f':{port}'
            ], capture_output=True, text=True, shell=True)
            
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if f':{port}' in line and 'LISTENING' in line:
                        parts = line.strip().split()
                        if len(parts) >= 5:
                            try:
                                pid = int(parts[4])
                                subprocess.run(['taskkill', '/f', '/pid', str(pid)], check=False)
                                logger.info(f"🔪 殺死進程 PID: {pid}")
                                break
                            except ValueError:
                                continue
        except Exception as e:
            logger.warning(f"殺死端口 {port} 的進程時出錯: {e}")
    
    def get_status_report(self) -> Dict:
        """獲取狀態報告"""
        current_time = datetime.now()
        
        report = {
            "timestamp": current_time.isoformat(),
            "monitoring_active": self.running,
            "services": {}
        }
        
        for name, service in self.services.items():
            report["services"][name] = {
                "name": service.name,
                "port": service.port,
                "status": service.status,
                "pid": service.pid,
                "last_check": service.last_check.isoformat() if service.last_check else None,
                "consecutive_failures": service.consecutive_failures
            }
        
        return report

# 全局實例
auto_recovery = AutoRecoverySystem()

async def start_auto_recovery():
    """啟動自動修復系統"""
    await auto_recovery.start_monitoring()

async def stop_auto_recovery():
    """停止自動修復系統"""
    auto_recovery.stop_monitoring()

def get_service_status() -> Dict:
    """獲取服務狀態"""
    return auto_recovery.get_status_report()

# CLI 工具
async def main():
    """命令行工具"""
    import argparse
    
    parser = argparse.ArgumentParser(description="LINE 系統錯誤自動修護")
    parser.add_argument("action", choices=["start", "stop", "status"], help="執行動作")
    
    args = parser.parse_args()
    
    if args.action == "start":
        await start_auto_recovery()
    elif args.action == "stop":
        await stop_auto_recovery()
    elif args.action == "status":
        import json
        print(json.dumps(get_service_status(), indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
