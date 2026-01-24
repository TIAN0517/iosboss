#!/bin/bash

# LINE Bot Go 編譯和啟動腳本
# 版本：1.0
# 描述：編譯和啟動 Go 版本的 LINE Bot

echo "🚀 開始編譯 Go 版本 LINE Bot..."

# 檢查 Go 是否已安裝
if ! command -v go &> /dev/null; then
    echo "❌ Go 未安裝，請先安裝 Go 1.21+"
    exit 1
fi

# 顯示 Go 版本
echo "📋 Go 版本: $(go version)"

# 進入項目目錄
cd "$(dirname "$0")"

# 清理之前的編譯文件
echo "🧹 清理舊文件..."
rm -f line-bot-go
rm -rf bin/

# 下載依賴
echo "📦 下載依賴..."
go mod download
go mod tidy

# 編譯
echo "⚙️ 編譯中..."
go build -o line-bot-go .

# 檢查編譯是否成功
if [ $? -eq 0 ]; then
    echo "✅ 編譯成功！"
    
    # 顯示文件大小
    size=$(du -h line-bot-go | cut -f1)
    echo "📊 可執行文件大小: $size"
    
    # 啟動服務器
    echo "🚀 啟動 LINE Bot Go 版本..."
    echo "📍 服務將在端口 5003 運行"
    echo "🌐 健康檢查: http://localhost:5003/health"
    echo "📝 API 文檔: http://localhost:5003/"
    echo ""
    echo "按 Ctrl+C 停止服務器"
    echo ""
    
    # 設置環境變量
    export PORT=5003
    export ENVIRONMENT=production
    
    # 啟動服務器
    ./line-bot-go
    
else
    echo "❌ 編譯失敗，請檢查錯誤"
    exit 1
fi