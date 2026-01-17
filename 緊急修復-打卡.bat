@echo off
chcp 65001 > nul
cls

echo ===============================================
echo   緊急修復 - 員工打卡功能
echo ===============================================
echo.

REM 檢查管理員權限
net session >nul 2>&1
if errorlevel 1 (
    echo [!] 需要管理員權限！
    echo     請右鍵點擊此檔案，選擇「以管理員身份執行」
    echo.
    pause
    exit /b 1
)

echo [1/3] 開放防火牆端口...
netsh advfirewall firewall add rule name="Python AI 8888" dir=in action=allow protocol=TCP localport=8888 >nul 2>&1
netsh advfirewall firewall add rule name="Next.js 9999" dir=in action=allow protocol=TCP localport=9999 >nul 2>&1
echo     OK

echo.
echo [2/3] 重啟 Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 /nobreak
start "" /MIN cloudflared.exe tunnel run eyJhIjoiMjk0ZWE4NTM5ZDRkMTc5MzRjZTA5NDM4ZDdjMDE5NjciLCJ0IjoiNmI5NzU4NTMtZDY4YS00MjYyLTk4NzAtYmMxMGFhZGUyNzU5IiwicyI6IlkySXdaVFJsWlRZdFlqa3hOaTAwWkRNMkxXRTRZVEl0WVRjMk9EWTNNVEF3Tm1GbSJ9
timeout /t 10 /nobreak
echo     OK

echo.
echo [3/3] 測試連接...
curl -s -o nul -w "LINE Webhook: %%{http_code}\n" https://linebot.tiankai.it.com/api/webhook/line -X POST -H "Content-Type: application/json" -d "{\"test\":true}" --max-time 10

echo.
echo ===============================================
echo   修復完成
echo ===============================================
echo.
echo   員工可以用 LINE 打卡了！
echo   LINE Webhook URL:
echo   https://linebot.tiankai.it.com/api/webhook/line
echo.
pause
