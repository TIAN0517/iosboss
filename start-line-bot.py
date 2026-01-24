#!/usr/bin/env python3
"""
九九瓦斯行 LINE Bot 啟動腳本
確保乾淨啟動和正確配置
"""

import os
import signal
import subprocess
import sys
import time
import psutil
from pathlib import Path

def kill_port_processes(port):
    """終止指定端口的所有進程"""
    try:
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                for cmd in proc.info['cmdline'] or []:
                    if f':{port}' in cmd:
                        print(f"🛑 終止進程 {proc.info['pid']}: {proc.info['name']}")
                        proc.terminate()
                        time.sleep(1)
                        if proc.is_running():
                            proc.kill()
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception as e:
        print(f"⚠️  清理進程時錯誤: {e}")

def check_and_start_bot():
    """檢查並啟動 LINE Bot"""
    os.chdir('line_bot_ai')
    
    print("🚀 檢查 LINE Bot 狀態...")
    
    # 1. 清理端口 5001
    print("🧹 清理端口 5001...")
    kill_port_processes('5001')
    time.sleep(2)
    
    # 2. 檢查環境變數
    required_vars = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET']
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  缺少環境變數: {', '.join(missing_vars)}")
        print("   請檢查 .env 文件配置")
    
    # 3. 啟動 LINE Bot
    print("🚀 啟動 LINE Bot...")
    env = os.environ.copy()
    env['FLASK_HOST'] = '0.0.0.0'
    env['FLASK_PORT'] = '5001'
    env['FLASK_DEBUG'] = 'False'
    
    try:
        process = subprocess.Popen([
            sys.executable, 'boss_line_bot.py'
        ], env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        
        print(f"✅ LINE Bot 啟動成功 (PID: {process.pid})")
        
        # 等待啟動
        time.sleep(3)
        
        # 檢查狀態
        import requests
        try:
            response = requests.get('http://localhost:5001/health', timeout=5)
            if response.status_code == 200:
                print("✅ LINE Bot 健康檢查通過")
                return process
            else:
                print(f"⚠️  健康檢查失敗: {response.status_code}")
        except Exception as e:
            print(f"⚠️  健康檢查錯誤: {e}")
        
        return process
        
    except Exception as e:
        print(f"❌ 啟動失敗: {e}")
        return None

def main():
    """主函數"""
    print("=" * 60)
    print("    🚀 九九瓦斯行 LINE Bot 啟動工具")
    print("=" * 60)
    
    # 檢查目錄
    if not Path('line_bot_ai').exists():
        print("❌ 錯誤: 未找到 line_bot_ai 目錄")
        return
    
    # 啟動 LINE Bot
    process = check_and_start_bot()
    
    if process:
        print("\n🎉 LINE Bot 啟動成功！")
        print("📍 Webhook URL: http://localhost:5001/api/webhook/line")
        print("📍 健康檢查: http://localhost:5001/health")
        print("\n💡 請在 LINE Bot 控制台中設置 webhook URL")
        print("   然後發送測試訊息到您的 LINE Bot")
        print("\n🛑 按 Ctrl+C 停止服務")
        
        try:
            process.wait()
        except KeyboardInterrupt:
            print("\n🛑 停止服務...")
            process.terminate()
            time.sleep(2)
            if process.poll() is None:
                process.kill()
            print("✅ 服務已停止")
    else:
        print("❌ LINE Bot 啟動失敗")

if __name__ == "__main__":
    main()
