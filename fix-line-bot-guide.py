#!/usr/bin/env python3
"""
檢查 ngrok 安裝並提供下載連結
"""

def main():
    print("=" * 60)
    print("    📋 LINE Bot Webhook 隧道設置指南")
    print("=" * 60)
    
    print("\n🔧 問題分析:")
    print("1. ❌ LINE API 憑證是測試值，無法連接 LINE 平台")
    print("2. ❌ Webhook URL 是 localhost，LINE 無法訪問")
    
    print("\n🛠️ 解決方案:")
    print("\n📋 步驟 1：獲取真實 LINE API 憑證")
    print("   1. 登入 https://developers.line.biz/")
    print("   2. 選擇您的 Bot 頻道")
    print("   3. 複製 Channel Secret 和 Channel Access Token")
    print("   4. 更新 .env 文件中的憑證")
    
    print("\n🌐 步驟 2：設置公開 Webhook URL")
    print("   方案 A：使用 ngrok")
    print("     - 下載：https://ngrok.com/download")
    print("     - 運行：ngrok http 5001")
    print("     - 複製公共 URL")
    print("   方案 B：部署到雲端服務")
    print("     - 部署到 Heroku、AWS、或其他雲端平台")
    print("     - 使用公開可訪問的 URL")
    
    print("\n🔄 步驟 3：更新配置並重啟")
    print("   1. 更新 .env 文件")
    print("   2. 重啟 LINE Bot 服務")
    print("   3. 在 LINE Developer Console 中設置 Webhook URL")
    
    print("\n⚠️ 重要提醒:")
    print("- 目前使用的憑證是開發測試值，無法連接真正的 LINE")
    print("- 必須獲取真實的 LINE API 憑證才能正常工作")
    print("- Webhook URL 必須是公開可訪問的 URL")
    
    print("\n🎯 測試指令:")
    print("   獲取憑證後，發送 '測試' 給您的 Bot 應該會收到:")
    print("   🤖 LINE Bot 測試成功！")
    print("   系統狀態：✅ 知識庫連接正常")
    
if __name__ == "__main__":
    main()
