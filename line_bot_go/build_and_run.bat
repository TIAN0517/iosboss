@echo off
chcp 65001 >nul

echo 🚀 開始編譯 Go 版本 LINE Bot...

REM 檢查 Go 是否已安裝
where go >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Go 未安裝，請先安裝 Go 1.21+
    pause
    exit /b 1
)

REM 顯示 Go 版本
echo 📋 Go 版本:
go version

REM 進入項目目錄
cd /d "%~dp0"

REM 清理之前的編譯文件
echo 🧹 清理舊文件...
if exist line-bot-go.exe del /q line-bot-go.exe
if exist bin\ rmdir /s /q bin\

REM 下載依賴
echo 📦 下載依賴...
go mod download
go mod tidy

REM 編譯
echo ⚙️ 編譯中...
go build -o line-bot-go.exe .

REM 檢查編譯是否成功
if %errorlevel% equ 0 (
    echo ✅ 編譯成功！
    
    REM 顯示文件大小
    for %%f in (line-bot-go.exe) do echo 📊 可執行文件大小: %%~zf bytes
    
    REM 啟動服務器
    echo 🚀 啟動 LINE Bot Go 版本...
    echo 📍 服務將在端口 5003 運行
    echo 🌐 健康檢查: http://localhost:5003/health
    echo 📝 API 文檔: http://localhost:5003/
    echo.
    echo 按 Ctrl+C 停止服務器
    echo.
    
    REM 設置環境變量
    set PORT=5003
    set ENVIRONMENT=production
    
    REM 啟動服務器
    line-bot-go.exe
    
) else (
    echo ❌ 編譯失敗，請檢查錯誤
    pause
    exit /b 1
)