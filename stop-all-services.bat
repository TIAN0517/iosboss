@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   停止所有服務
echo ===============================================
echo.

echo [1/3] 停止 Next.js 服務...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Next.js 已停止
) else (
    echo    - Next.js 未運行
)

echo.
echo [2/3] 停止 Python AI 服務...
taskkill /F /IM python.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Python AI 已停止
) else (
    echo    - Python AI 未運行
)

echo.
echo [3/3] 停止 Cloudflare Tunnel...
net stop cloudflared >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Cloudflare Tunnel 已停止
) else (
    echo    - Cloudflare Tunnel 未運行
)

echo.
echo ===============================================
echo   所有服務已停止
echo ===============================================
echo.
pause
