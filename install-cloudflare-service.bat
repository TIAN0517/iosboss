@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   安裝 Cloudflare Tunnel 服務
echo ===============================================
echo.

REM 檢查管理員權限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ 需要管理員權限！
    echo.
    echo 請右鍵點擊此檔案，選擇「以系統管理員身分執行」
    echo.
    pause
    exit /b 1
)

echo ✓ 管理員權限確認
echo.

cd /d "%~dp0"

REM 檢查 cloudflared.exe
if not exist cloudflared.exe (
    echo ❌ 找不到 cloudflared.exe
    echo.
    echo 正在下載...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    echo.
)

echo [1/2] 安裝 Cloudflare Tunnel 服務...
echo.
echo 使用 Token 安裝...
cloudflared.exe service install eyJhIjoiMjk0ZWE4NTM5ZDRkMTc5MzRjZTA5NDM4ZDdjMDE5NjciLCJ0IjoiNmI5NzU4NTMtZDY4YS00MjYyLTk4NzAtYmMxMGFhZGUyNzU5IiwicyI6IlkySXdaVFJsWlRZdFlqa3hOaTAwWkRNMkxXRTRZVEl0WVRjMk9EWTNNVEF3Tm1GbSJ9

if %errorLevel% equ 0 (
    echo.
    echo [2/2] 啟動服務...
    echo.
    net start cloudflared
    echo.
    echo ===============================================
    echo   ✅ 安裝完成！
    echo ===============================================
    echo.
    echo 服務已安裝並啟動
    echo.
    echo 管理服務命令：
    echo   啟動: net start cloudflared
    echo   停止: net stop cloudflared
    echo   卸載: cloudflared.exe service uninstall
    echo.
) else (
    echo.
    echo ===============================================
    echo   ❌ 安裝失敗
    echo ===============================================
    echo.
)

pause
