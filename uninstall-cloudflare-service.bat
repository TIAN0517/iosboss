@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   卸載 Cloudflare Tunnel 服務
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
    pause
    exit /b 1
)

echo [1/2] 停止服務...
net stop cloudflared >nul 2>&1

echo.
echo [2/2] 卸載服務...
echo.
cloudflared.exe service uninstall

if %errorLevel% equ 0 (
    echo.
    echo ===============================================
    echo   ✅ 卸載完成！
    echo ===============================================
) else (
    echo.
    echo ===============================================
    echo   ❌ 卸載失敗
    echo ===============================================
)

echo.
pause
