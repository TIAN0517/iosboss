@echo off
chcp 65001 > nul
cls

echo ===============================================
echo   Cloudflare Tunnel 啟動腳本
echo ===============================================
echo.

REM 停止舊的 Tunnel 進程
echo [1/3] 停止舊的 Tunnel 進程...
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 /nobreak
echo     [OK] 已停止

echo.
echo [2/3] 啟動 Cloudflare Tunnel...
start "Cloudflare-Tunnel" /MIN "%~dp0cloudflared.exe" tunnel --config "%~dp0cloudflared.yml" run
timeout /t 5 /nobreak
echo     [OK] Tunnel 已啟動

echo.
echo [3/3] 檢查本地服務...
netstat -ano | findstr ":9999" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     [!] Next.js 未運行 (端口 9999)
) else (
    echo     [OK] Next.js 運行中
)

netstat -ano | findstr ":8888" | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     [!] Python AI 未運行 (端口 8888)
) else (
    echo     [OK] Python AI 運行中
)

echo.
echo ===============================================
echo   等待服務就緒 (10 秒)...
echo ===============================================
timeout /t 10 /nobreak

echo.
echo ===============================================
echo   測試連接
echo ===============================================
echo.

echo 測試 LINE Webhook...
curl -s -o nul -w "HTTP 狀態: %%{http_code}\n" https://linebot.tiankai.it.com/api/webhook/line -X POST -H "Content-Type: application/json" -d "{\"test\":true}" --max-time 10

echo.
echo 測試 BossAI...
curl -s -o nul -w "HTTP 狀態: %%{http_code}\n" https://bossai.tiankai.it.com -max-time 10

echo.
echo ===============================================
echo   完成！
echo ===============================================
echo.
echo   LINE Webhook URL:
echo   https://linebot.tiankai.it.com/api/webhook/line
echo.
echo   BossAI URL:
echo   https://bossai.tiankai.it.com
echo.
pause
