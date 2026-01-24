#!/usr/bin/env python3
"""
Trae MCP 配置自動更新腳本
自動更新 Trae 配置以連接 IDA Pro MCP 服務器
"""

import os
import shutil
import subprocess
import json
import sys

def check_mcp_server():
    """檢查MCP服務器是否運行"""
    try:
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
        if '13337' in result.stdout:
            print("✅ MCP服務器正在運行 (端口13337)")
            return True
        else:
            print("❌ MCP服務器未運行")
            print("   請先運行: python ida_pro_mcp_sim.py")
            return False
    except Exception as e:
        print(f"❌ 檢查MCP服務器失敗: {e}")
        return False

def backup_config():
    """備份當前配置"""
    config_path = r"C:\Users\tian7\.trae\mcp_config.json"
    backup_path = r"C:\Users\tian7\.trae\mcp_config.json.backup"
    
    if os.path.exists(config_path):
        try:
            shutil.copy2(config_path, backup_path)
            print(f"✅ 配置已備份為: {backup_path}")
            return True
        except Exception as e:
            print(f"⚠️  備份失敗: {e}")
            return False
    else:
        print("⚠️  配置文件不存在，將創建新配置")
        return True

def update_config():
    """更新配置"""
    config_dir = r"C:\Users\tian7\.trae"
    config_path = os.path.join(config_dir, "mcp_config.json")
    
    # 確保目錄存在
    os.makedirs(config_dir, exist_ok=True)
    
    # 新配置內容
    new_config = {
        "mcpServers": {
            "ida-pro-m-mcp": {
                "type": "http",
                "url": "http://127.0.0.1:13337/mcp"
            }
        }
    }
    
    try:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(new_config, f, indent=2, ensure_ascii=False)
        print("✅ 配置更新成功")
        return True
    except Exception as e:
        print(f"❌ 配置更新失敗: {e}")
        return False

def verify_config():
    """驗證新配置"""
    config_path = r"C:\Users\tian7\.trae\mcp_config.json"
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        print("✅ 配置驗證成功")
        print("新配置內容:")
        print(json.dumps(config, indent=2, ensure_ascii=False))
        return True
    except Exception as e:
        print(f"❌ 配置驗證失敗: {e}")
        return False

def test_mcp_connection():
    """測試MCP連接"""
    try:
        import requests
        
        # 測試MCP初始化
        test_data = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "test",
                    "version": "1.0"
                }
            }
        }
        
        response = requests.post("http://127.0.0.1:13337/mcp", 
                               json=test_data, timeout=5)
        
        if response.status_code == 200:
            print("✅ MCP服務器連接測試成功")
            return True
        else:
            print(f"⚠️  MCP服務器連接測試失敗: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"⚠️  MCP連接測試失敗: {e}")
        return False

def main():
    """主函數"""
    print("="*50)
    print("🚀 Trae MCP 配置自動更新")
    print("="*50)
    print()
    
    # 1. 檢查MCP服務器
    print("[1/5] 檢查MCP服務器狀態...")
    if not check_mcp_server():
        print()
        print("請先啟動MCP服務器，然後重新運行此腳本")
        input("按任意鍵退出...")
        sys.exit(1)
    
    print()
    
    # 2. 備份配置
    print("[2/5] 備份當前配置...")
    backup_config()
    print()
    
    # 3. 更新配置
    print("[3/5] 更新配置內容...")
    if not update_config():
        print()
        print("配置更新失敗，請檢查權限")
        input("按任意鍵退出...")
        sys.exit(1)
    print()
    
    # 4. 驗證配置
    print("[4/5] 驗證新配置...")
    if not verify_config():
        print()
        print("配置驗證失敗")
        input("按任意鍵退出...")
        sys.exit(1)
    print()
    
    # 5. 測試連接
    print("[5/5] 測試MCP服務器連接...")
    test_mcp_connection()
    print()
    
    # 完成
    print("="*50)
    print("✅ 配置更新完成！")
    print("="*50)
    print()
    print("🔄 下一步操作:")
    print()
    print("1. 完全關閉Trae (包括後台進程)")
    print("2. 重新啟動Trae")
    print("3. 在Trae中測試MCP功能")
    print()
    print("💡 在Trae中試試這些命令:")
    print('   "請列出這個程序的所有函數"')
    print('   "反編譯main函數"')
    print('   "列出所有字符串"')
    print()
    print(f"📍 配置位置: C:\\Users\\tian7\\.trae\\mcp_config.json")
    print("🔗 MCP服務器: http://127.0.0.1:13337/mcp")
    print()
    input("按任意鍵退出...")

if __name__ == "__main__":
    main()
