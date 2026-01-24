import requests
import subprocess
import time

def check_service(port, name):
    try:
        response = requests.get(f'http://127.0.0.1:{port}/health', timeout=3)
        if response.status_code == 200:
            data = response.json()
            status = '✅ 正常'
            return True, status, data
        else:
            status = f'⚠️ HTTP {response.status_code}'
            return False, status, None
    except requests.exceptions.RequestException as e:
        status = '❌ 無法連接'
        return False, status, None

def main():
    print("=" * 60)
    print("檢查所有服務狀態")
    print("=" * 60)
    
    services = [
        (5002, "知識庫API"),
        (5003, "LINE Bot"),
    ]
    
    all_ok = True
    
    for port, name in services:
        is_ok, status, data = check_service(port, name)
        print(f"\n{name} (端口 {port}): {status}")
        
        if not is_ok:
            all_ok = False
        elif data:
            print(f"   資料庫: {data.get('database', 'N/A')}")
            print(f"   知識API: {data.get('knowledge_api', 'N/A')}")
    
    print("\n" + "=" * 60)
    
    if all_ok:
        print("✅ 所有服務運行正常")
        print("\n可以開始測試LINE Bot功能")
    else:
        print("❌ 部分服務未運行")
        print("\n建議操作：")
        print("1. 檢查服務是否崩潰")
        print("2. 重新啟動未運行的服務")
        print("3. 查看終端日誌找出錯誤")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
