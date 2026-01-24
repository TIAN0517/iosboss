#!/usr/bin/env python3
"""
自動清除進程、POST、重啟功能、斷線自動修護腳本
解決服務斷線問題，自動修復和重啟
"""

import subprocess
import time
import os
import signal
import json
import requests
import threading
from datetime import datetime
import logging

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ServiceManager:
    """服務管理器"""
    
    def __init__(self):
        self.services = {
            'voice': {
                'port': 8889,
                'command': ['python', 'line_bot_ai/ai_voice_chat.py'],
                'name': '語音服務',
                'working_dir': 'c:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios',
                'url': 'http://localhost:8889/health',
                'pid': None
            },
            'mcp': {
                'port': 8744,
                'command': ['python', 'debug_ida_mcp_server.py'],
                'name': 'IDA Pro MCP服務',
                'working_dir': 'c:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios',
                'url': 'http://127.0.0.1:8744/health',
                'pid': None
            },
            'backend': {
                'port': 9999,
                'command': ['npm', 'run', 'dev'],
                'name': '後台管理服務',
                'working_dir': 'c:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios',
                'url': 'http://localhost:9999/login',
                'pid': None
            }
        }
    
    def get_process_by_port(self, port):
        """根據端口查找進程"""
        try:
            result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
            lines = result.stdout.split('\n')
            
            for line in lines:
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.split()
                    if len(parts) >= 5:
                        return parts[-1]  # PID
            return None
        except Exception as e:
            logger.error(f"查找進程失敗 {port}: {e}")
            return None
    
    def kill_process(self, pid):
        """終止進程"""
        try:
            if pid:
                os.kill(int(pid), signal.SIGTERM)
                time.sleep(1)
                logger.info(f"進程 {pid} 已終止")
                return True
        except ProcessLookupError:
            logger.info(f"進程 {pid} 不存在")
            return True
        except Exception as e:
            logger.error(f"終止進程失敗 {pid}: {e}")
            return False
    
    def start_service(self, service_key):
        """啟動服務"""
        service = self.services[service_key]
        
        try:
            logger.info(f"啟動 {service['name']}...")
            
            # 檢查是否已在運行
            existing_pid = self.get_process_by_port(service['port'])
            if existing_pid:
                logger.info(f"{service['name']} 已在運行 (PID: {existing_pid})")
                service['pid'] = existing_pid
                return True
            
            # 啟動服務
            process = subprocess.Popen(
                service['command'],
                cwd=service['working_dir'],
                creationflags=subprocess.CREATE_NEW_CONSOLE
            )
            
            service['pid'] = str(process.pid)
            time.sleep(3)
            
            logger.info(f"{service['name']} 已啟動 (PID: {service['pid']})")
            return True
            
        except Exception as e:
            logger.error(f"啟動 {service['name']} 失敗: {e}")
            return False
    
    def stop_service(self, service_key):
        """停止服務"""
        service = self.services[service_key]
        
        try:
            # 根據端口查找進程
            pid = self.get_process_by_port(service['port'])
            if pid:
                return self.kill_process(pid)
            else:
                logger.info(f"{service['name']} 未運行")
                return True
                
        except Exception as e:
            logger.error(f"停止 {service['name']} 失敗: {e}")
            return False
    
    def restart_service(self, service_key):
        """重啟服務"""
        logger.info(f"重啟 {self.services[service_key]['name']}...")
        
        # 停止服務
        self.stop_service(service_key)
        time.sleep(2)
        
        # 啟動服務
        return self.start_service(service_key)
    
    def check_service_health(self, service_key):
        """檢查服務健康狀態"""
        service = self.services[service_key]
        
        try:
            response = requests.get(service['url'], timeout=5)
            if response.status_code == 200:
                return True
            else:
                logger.warning(f"{service['name']} 健康檢查失敗: HTTP {response.status_code}")
                return False
        except Exception as e:
            logger.warning(f"{service['name']} 健康檢查失敗: {e}")
            return False
    
    def get_service_status(self, service_key):
        """獲取服務狀態"""
        service = self.services[service_key]
        
        try:
            # 檢查進程
            pid = self.get_process_by_port(service['port'])
            
            # 檢查健康狀態
            is_healthy = self.check_service_health(service_key)
            
            if pid and is_healthy:
                return {
                    'status': 'running',
                    'pid': pid,
                    'healthy': True,
                    'message': '正常運行'
                }
            elif pid and not is_healthy:
                return {
                    'status': 'running',
                    'pid': pid,
                    'healthy': False,
                    'message': '運行但不健康'
                }
            else:
                return {
                    'status': 'stopped',
                    'pid': None,
                    'healthy': False,
                    'message': '未運行'
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'pid': None,
                'healthy': False,
                'message': f'檢查錯誤: {e}'
            }
    
    def get_all_status(self):
        """獲取所有服務狀態"""
        status = {}
        for key in self.services:
            status[key] = self.get_service_status(key)
        return status
    
    def auto_fix(self, auto_restart=True):
        """自動修復服務"""
        logger.info("開始自動修復...")
        
        status = self.get_all_status()
        fixed_count = 0
        
        for service_key, service_info in status.items():
            service_name = self.services[service_key]['name']
            
            if service_info['status'] == 'stopped':
                logger.info(f"發現 {service_name} 已停止，嘗試啟動...")
                if self.start_service(service_key):
                    fixed_count += 1
                    logger.info(f"{service_name} 啟動成功")
                else:
                    logger.error(f"{service_name} 啟動失敗")
                    
            elif service_info['status'] == 'running' and not service_info['healthy']:
                logger.info(f"發現 {service_name} 不健康，嘗試重啟...")
                if auto_restart and self.restart_service(service_key):
                    fixed_count += 1
                    logger.info(f"{service_name} 重啟成功")
                else:
                    logger.error(f"{service_name} 重啟失敗")
        
        logger.info(f"自動修復完成，修復了 {fixed_count} 個服務")
        return fixed_count
    
    def force_restart_all(self):
        """強制重啟所有服務"""
        logger.info("強制重啟所有服務...")
        
        # 停止所有服務
        for key in self.services:
            self.stop_service(key)
        
        time.sleep(3)
        
        # 啟動所有服務
        started_count = 0
        for key in self.services:
            if self.start_service(key):
                started_count += 1
        
        logger.info(f"重啟完成，啟動了 {started_count} 個服務")
        return started_count

class AutoRecoveryScript:
    """自動恢復腳本"""
    
    def __init__(self):
        self.service_manager = ServiceManager()
        self.is_monitoring = False
        self.monitor_interval = 30  # 30秒檢查一次
        
    def create_status_report(self):
        """創建狀態報告"""
        status = self.service_manager.get_all_status()
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'services': {},
            'summary': {
                'total': len(status),
                'running': sum(1 for s in status.values() if s['status'] == 'running'),
                'healthy': sum(1 for s in status.values() if s.get('healthy', False)),
                'stopped': sum(1 for s in status.values() if s['status'] == 'stopped')
            }
        }
        
        for key, service_status in status.items():
            service_info = self.service_manager.services[key]
            report['services'][key] = {
                'name': service_info['name'],
                'port': service_info['port'],
                'url': service_info['url'],
                'status': service_status
            }
        
        return report
    
    def save_status_report(self, filename='service_status_report.json'):
        """保存狀態報告"""
        report = self.create_status_report()
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            logger.info(f"狀態報告已保存到 {filename}")
            return True
        except Exception as e:
            logger.error(f"保存狀態報告失敗: {e}")
            return False
    
    def send_status_post(self, webhook_url=None):
        """發送狀態POST請求"""
        if not webhook_url:
            return False
            
        try:
            report = self.create_status_report()
            response = requests.post(webhook_url, json=report, timeout=10)
            
            if response.status_code == 200:
                logger.info("狀態POST請求發送成功")
                return True
            else:
                logger.warning(f"狀態POST請求失敗: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"狀態POST請求錯誤: {e}")
            return False
    
    def monitor_services(self):
        """監控服務"""
        logger.info(f"開始監控服務，間隔 {self.monitor_interval} 秒")
        self.is_monitoring = True
        
        while self.is_monitoring:
            try:
                # 檢查服務狀態
                status = self.service_manager.get_all_status()
                
                # 記錄日誌
                for key, service_status in status.items():
                    service_info = self.service_manager.services[key]
                    if service_status['status'] == 'running':
                        if service_status.get('healthy', False):
                            logger.info(f"✅ {service_info['name']}: 正常運行")
                        else:
                            logger.warning(f"⚠️ {service_info['name']}: 運行但不健康")
                    else:
                        logger.error(f"❌ {service_info['name']}: 未運行")
                
                # 自動修復不健康的服務
                needs_fix = any(
                    s['status'] == 'stopped' or not s.get('healthy', False) 
                    for s in status.values()
                )
                
                if needs_fix:
                    logger.info("發現問題服務，嘗試自動修復...")
                    fixed = self.service_manager.auto_fix()
                    if fixed > 0:
                        logger.info(f"自動修復了 {fixed} 個服務")
                
                # 保存狀態報告
                self.save_status_report()
                
            except Exception as e:
                logger.error(f"監控過程中發生錯誤: {e}")
            
            time.sleep(self.monitor_interval)
    
    def stop_monitoring(self):
        """停止監控"""
        self.is_monitoring = False
        logger.info("停止監控服務")
    
    def interactive_menu(self):
        """交互式菜單"""
        while True:
            print("\n" + "="*60)
            print("🚀 自動服務管理腳本")
            print("="*60)
            print("1. 查看服務狀態")
            print("2. 自動修復服務")
            print("3. 強制重啟所有服務")
            print("4. 啟動監控模式")
            print("5. 停止監控")
            print("6. 發送狀態POST")
            print("7. 保存狀態報告")
            print("8. 退出")
            print("="*60)
            
            choice = input("請選擇操作 (1-8): ").strip()
            
            if choice == '1':
                self.show_status()
            elif choice == '2':
                self.service_manager.auto_fix()
            elif choice == '3':
                self.service_manager.force_restart_all()
            elif choice == '4':
                self.start_monitoring()
            elif choice == '5':
                self.stop_monitoring()
            elif choice == '6':
                webhook_url = input("請輸入Webhook URL (留空跳過): ").strip()
                if webhook_url:
                    self.send_status_post(webhook_url)
                else:
                    print("跳過POST請求")
            elif choice == '7':
                self.save_status_report()
            elif choice == '8':
                self.stop_monitoring()
                print("再見！")
                break
            else:
                print("無效選擇，請重新輸入")
            
            input("\n按任意鍵繼續...")
    
    def show_status(self):
        """顯示狀態"""
        status = self.service_manager.get_all_status()
        
        print("\n📊 服務狀態:")
        print("-" * 80)
        print(f"{'服務名稱':<20} {'端口':<8} {'狀態':<12} {'PID':<10} {'健康':<8} {'描述'}")
        print("-" * 80)
        
        for key, service_status in status.items():
            service_info = self.service_manager.services[key]
            
            status_text = service_status['status']
            if service_status['status'] == 'running':
                if service_status.get('healthy', False):
                    status_text = "✅ 運行"
                else:
                    status_text = "⚠️ 不健康"
            else:
                status_text = "❌ 停止"
            
            pid_text = service_status.get('pid', '-')
            healthy_text = "是" if service_status.get('healthy', False) else "否"
            
            print(f"{service_info['name']:<20} {service_info['port']:<8} {status_text:<12} {pid_text:<10} {healthy_text:<8} {service_status['message']}")
    
    def start_monitoring(self):
        """啟動監控"""
        if self.is_monitoring:
            print("監控已在運行中")
            return
        
        # 在新線程中啟動監控
        monitor_thread = threading.Thread(target=self.monitor_services, daemon=True)
        monitor_thread.start()
        
        print("監控模式已啟動")
        print("按回車鍵停止監控...")
        input()
        self.stop_monitoring()

def main():
    """主函數"""
    print("🚀 自動服務管理腳本")
    print("解決斷線問題，自動修復和重啟")
    print()
    
    script = AutoRecoveryScript()
    
    # 命令行參數處理
    import sys
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'status':
            script.show_status()
        elif command == 'fix':
            script.service_manager.auto_fix()
        elif command == 'restart':
            script.service_manager.force_restart_all()
        elif command == 'monitor':
            script.monitor_services()
        elif command == 'report':
            script.save_status_report()
        else:
            print(f"未知命令: {command}")
            print("可用命令: status, fix, restart, monitor, report")
    else:
        # 交互式模式
        script.interactive_menu()

if __name__ == "__main__":
    main()
