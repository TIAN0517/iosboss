@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   Cloudflare Tunnel - 快速啟動
echo   （不需要管理員權限）
echo ===============================================
echo.

cd /d "%~dp0"

REM 檢查 cloudflared.exe
if not exist cloudflared.exe (
    echo [下載] cloudflared.exe...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
    echo.
    echo ✓ 下載完成
    echo.
)

echo [啟動] Cloudflare Tunnel...
echo.
echo ===============================================
echo   隧道運行中
echo ===============================================
echo.
echo 路由配置：
echo   • bossai.tiankai.it.com → localhost:9999 (Next.js)
echo   • linebot.tiankai.it.com → localhost:8888 (Python AI)
echo.
echo 請保持此視窗開啟
echo 關閉此視窗將停止隧道
echo.
echo ===============================================
echo.

REM 使用配置文件啟動隧道（不需要服務安裝）
cloudflared.exe tunnel --config cloudflared.yml run

pause
