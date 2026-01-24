@echo off
chcp 65001 >nul

echo 🚀 LINE Bot Go 版本 - 一鍵啟動
echo ===================================

REM 檢查可執行文件是否存在
if not exist "line-bot-go.exe" (
    echo ❌ line-bot-go.exe 不存在
    echo 💡 請先執行 build_and_run.bat 編譯項目
    pause
    exit /b 1
)

echo ✅ 檢測到 Go 版本可執行文件

REM 檢查端口占用
echo 🔍 檢查端口占用情況...
netstat -an | findstr :9997 >nul
if %errorlevel% equ 0 (
    echo ⚠️  端口 9997 已被占用
    echo 💡 LINE Bot Go 可能已在運行
    echo.
    echo 測試現有服務...
    curl -s http://localhost:9997/health >nul
    if %errorlevel% equ 0 (
        echo ✅ LINE Bot Go 已在運行
        echo 🌐 訪問地址: http://localhost:9997/
        echo 📊 健康檢查: http://localhost:9997/health
        echo 🛑 按任意鍵退出...
        pause >nul
        exit /b 0
    ) else (
        echo ❌ 服務無法訪問，請檢查問題
        pause
        exit /b 1
    )
)

REM 設置環境變量
echo 🔧 設置環境變量...
set PORT=9997
set ENVIRONMENT=production

echo.
echo 🎯 啟動 LINE Bot Go 版本...
echo 📍 服務端口: 9997
echo 🌐 訪問地址: http://localhost:9997/
echo 📊 健康檢查: http://localhost:9997/health
echo 🛑 按 Ctrl+C 停止服務
echo.
echo 正在啟動服務...
echo.

REM 啟動服務
line-bot-go.exe