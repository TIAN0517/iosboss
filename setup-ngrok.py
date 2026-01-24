#!/usr/bin/env python3
"""
使用 ngrok 創建公共 webhook URL
"""

import os
import subprocess
import time
import requests
import json

def start_ngrok():
    """啟動 ngrok 隧道"""
    try:
        print("🚀 檢查 ngrok...")
        
        # 檢查 ngrok 是否安裝
        result = subprocess.run(['ngrok', 'version'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ ngrok 未安裝")
            print("請下載並安裝 ngrok: https://ngrok.com/download")
            return None
        
        print("✅ ngrok 已安裝")
        print(f"版本: {result.stdout.strip()}")
        
        # 啟動 ngrok 隧道到端口 5001
        print("🌐 啟動 ngrok 隧道...")
        ngrok_process = subprocess.Popen([
            'ngrok', 'http', '5001'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # 等待 ngrok 啟動
        time.sleep(5)
        
        # 獲取公共 URL
        try:
            response = requests.get('http://localhost:4040/api/tunnels')
            if response.status_code == 200:
                tunnels = response.json()['tunnels']
                public_url = tunnels[0]['public_url']
                print(f"✅ ngrok 隧道已建立")
                print(f"📡 公共 URL: {public_url}")
                print(f"🔗 完整 webhook URL: {public_url}/api/webhook/line")
                
                return {
                    'public_url': public_url,
                    'webhook_url': f"{public_url}/api/webhook/line",
                    'process': ngrok_process
                }
            else:
                print(f"❌ 無法獲取 ngrok 隧道: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ 獲取隧道失敗: {e}")
            return None
            
    except FileNotFoundError:
        print("❌ ngrok 命令未找到")
        print("請確保 ngrok 已正確安裝並在 PATH 中")
        return None
    except Exception as e:
        print(f"❌ 啟動 ngrok 失敗: {e}")
        return None

def test_public_webhook(webhook_url):
    """測試公共 webhook URL"""
    try:
        print(f"🧪 測試公共 webhook: {webhook_url}")
        
        test_data = {
            'events': [{
                'type': 'message',
                'message': {
                    'text': '測試'
                },
                'source': {
                    'userId': 'test-user'
                },
                'timestamp': 1640995200000,
                'replyToken': 'test-token'
            }]
        }
        
        response = requests.post(webhook_url, json=test_data, timeout=5)
        
        if response.status_code == 200:
            print("✅ 公共 webhook 測試成功！")
            return True
        else:
            print(f"❌ 公共 webhook 測試失敗: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 測試失敗: {e}")
        return False

def main():
    """主函數"""
    print("=" * 60)
    print("    🔧 LINE Bot Webhook 公共隧道工具")
    print("=" * 60)
    
    # 檢查 LINE Bot 是否運行
    try:
        response = requests.get('http://localhost:5001/health', timeout=5)
        if response.status_code == 200:
            print("✅ LINE Bot 服務正常運行")
        else:
            print("❌ LINE Bot 服務未運行，請先啟動 LINE Bot")
            return
    except:
        print("❌ LINE Bot 服務未運行，請先啟動 LINE Bot")
        return
    
    # 啟動 ngrok
    ngrok_info = start_ngrok()
    
    if not ngrok_info:
        print("❌ 無法啟動 ngrok，請檢查安裝和配置")
        return
    
    # 測試公共 webhook
    if test_public_webhook(ngrok_info['webhook_url']):
        print("\n🎉 設置完成！")
        print(f"📋 請在 LINE Developer Console 中設置 webhook URL:")
        print(f"   {ngrok_info['webhook_url']}")
        print(f"\n💡 提示:")
        print(f"   - 這個 URL 會在 8 小時後失效")
        print(f"   - 如需持久使用，請升級 ngrok 帳戶")
        print(f"   - 保持終端窗口開啟以維持隧道連接")
    else:
        print("❌ 公共 webhook 測試失敗，請檢查 LINE Bot 設置")
    
    print("\n🛑 按 Ctrl+C 停止 ngrok 隧道")
    try:
        ngrok_info['process'].wait()
    except KeyboardInterrupt:
        print("\n🛑 停止 ngrok...")
        ngrok_info['process'].terminate()
        print("✅ ngrok 已停止")

if __name__ == "__main__":
    main()
