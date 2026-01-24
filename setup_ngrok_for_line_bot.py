"""
設置ngrok隧道用於LINE Bot webhook
"""

import subprocess
import requests
import time
import re

def start_ngrok():
    print("🚀 啟動ngrok隧道...")
    print("正在為端口5003創建公開URL...")
    
    try:
        # 啟動ngrok
        process = subprocess.Popen(
            ['ngrok', 'http', '5003'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # 等待ngrok啟動
        time.sleep(3)
        
        # 獲取ngrok URL
        try:
            response = requests.get('http://127.0.0.1:4040/api/tunnels', timeout=5)
            tunnels = response.json()['tunnels']
            
            if tunnels:
                public_url = tunnels[0]['public_url']
                print(f"\n✅ ngrok公開URL: {public_url}")
                print(f"\n請在LINE Developers Console設置以下webhook URL:")
                print(f"   {public_url}/webhook")
                print(f"\n按Ctrl+C停止ngrok")
                
                # 保持運行
                process.wait()
            else:
                print("❌ 無法獲取ngrok URL")
        except Exception as e:
            print(f"❌ 獲取ngrok URL失敗: {e}")
            process.terminate()
            
    except FileNotFoundError:
        print("❌ ngrok未安裝")
        print("\n請先安裝ngrok:")
        print("1. 訪問: https://ngrok.com/download")
        print("2. 下載並解壓縮ngrok")
        print("3. 將ngrok.exe添加到PATH或放在當前目錄")
    except Exception as e:
        print(f"❌ 啟動ngrok時發生錯誤: {e}")

if __name__ == "__main__":
    start_ngrok()
