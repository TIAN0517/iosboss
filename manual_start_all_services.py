#!/usr/bin/env python3
"""
手動啟動所有服務
解決斷線問題
"""

import subprocess
import time
import os
import signal

def start_voice_service():
    """啟動語音服務"""
    print("🎤 啟動語音服務...")
    
    try:
        # 檢查是否已運行
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
        if ':8889' in result.stdout:
            print("✅ 語音服務已在運行")
            return True
        
        # 啟動語音服務
        process = subprocess.Popen([
            'python', 
            'line_bot_ai/ai_voice_chat.py'
        ], creationflags=subprocess.CREATE_NEW_CONSOLE)
        
        time.sleep(3)
        print(f"✅ 語音服務已啟動 (PID: {process.pid})")
        return True
        
    except Exception as e:
        print(f"❌ 語音服務啟動失敗: {e}")
        return False

def start_mcp_service():
    """啟動MCP服務"""
    print("🧠 啟動IDA Pro MCP服務...")
    
    try:
        # 檢查是否已運行
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
        if ':8744' in result.stdout:
            print("✅ MCP服務已在運行")
            return True
        
        # 啟動MCP服務
        process = subprocess.Popen([
            'python', 
            'debug_ida_mcp_server.py'
        ], creationflags=subprocess.CREATE_NEW_CONSOLE)
        
        time.sleep(3)
        print(f"✅ MCP服務已啟動 (PID: {process.pid})")
        return True
        
    except Exception as e:
        print(f"❌ MCP服務啟動失敗: {e}")
        return False

def start_backend_service():
    """啟動後台服務"""
    print("🔐 啟動後台管理服務...")
    
    try:
        # 檢查是否已運行
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
        if ':9999' in result.stdout:
            print("✅ 後台服務已在運行")
            return True
        
        # 啟動後台服務
        process = subprocess.Popen([
            'npm', 'run', 'dev'
        ], creationflags=subprocess.CREATE_NEW_CONSOLE)
        
        time.sleep(5)
        print(f"✅ 後台服務已啟動 (PID: {process.pid})")
        return True
        
    except Exception as e:
        print(f"❌ 後台服務啟動失敗: {e}")
        return False

def check_services():
    """檢查所有服務狀態"""
    print("🔍 檢查服務狀態...")
    
    try:
        result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
        
        # 檢查語音服務
        if ':8889' in result.stdout:
            print("✅ 語音服務 (8889): 正常運行")
        else:
            print("❌ 語音服務 (8889): 未運行")
        
        # 檢查MCP服務
        if ':8744' in result.stdout:
            print("✅ MCP服務 (8744): 正常運行")
        else:
            print("❌ MCP服務 (8744): 未運行")
            
        # 檢查後台服務
        if ':9999' in result.stdout:
            print("✅ 後台服務 (9999): 正常運行")
        else:
            print("❌ 後台服務 (9999): 未運行")
            
    except Exception as e:
        print(f"❌ 檢查服務狀態失敗: {e}")

def main():
    """主函數"""
    print("="*60)
    print("🚀 手動啟動所有服務")
    print("解決斷線問題")
    print("="*60)
    print()
    
    # 檢查當前狀態
    check_services()
    print()
    
    # 啟動服務
    print("🎯 啟動服務...")
    print("-" * 40)
    
    voice_ok = start_voice_service()
    mcp_ok = start_mcp_service()
    backend_ok = start_backend_service()
    
    print()
    print("="*60)
    print("📊 啟動結果")
    print("="*60)
    print(f"🎤 語音服務: {'✅ 成功' if voice_ok else '❌ 失敗'}")
    print(f"🧠 MCP服務: {'✅ 成功' if mcp_ok else '❌ 失敗'}")
    print(f"🔐 後台服務: {'✅ 成功' if backend_ok else '❌ 失敗'}")
    print()
    
    # 最終狀態檢查
    time.sleep(5)
    check_services()
    
    print()
    print("🎯 服務地址:")
    print("🎤 語音服務: http://localhost:8889/voice")
    print("🧠 MCP服務: http://127.0.0.1:8744/mcp")
    print("🔐 後台服務: http://localhost:9999/login")
    print()
    
    if voice_ok and mcp_ok and backend_ok:
        print("🎉 所有服務啟動成功！")
    else:
        print("⚠️  部分服務啟動失敗，請檢查錯誤信息")

if __name__ == "__main__":
    main()
    input("\n按任意鍵退出...")
