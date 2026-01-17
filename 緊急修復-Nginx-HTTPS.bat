@echo off
chcp 65001 > nul
cls

echo ===============================================
echo   緊急修復 - 使用 Nginx + Cloudflare Proxy
echo   (替代故障的 Tunnel)
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

echo [1/5] 停止故障的 Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 /nobreak
echo     OK

echo.
echo [2/5] 開放防火牆端口 80/443...
netsh advfirewall firewall add rule name="Nginx HTTP 80" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
netsh advfirewall firewall add rule name="Nginx HTTPS 443" dir=in action=allow protocol=TCP localport=443 >nul 2>&1
echo     OK

echo.
echo [3/5] 確認 Next.js 運行中...
tasklist | findstr "node.exe" >nul
if errorlevel 1 (
    echo     [!] Next.js 未運行，啟動中...
    start "NextJS" /MIN cmd /c "npm run dev"
    timeout /t 15 /nobreak
) else (
    echo     [OK] Next.js 運行中
)

echo.
echo [4/5] 確認 Python AI 運行中...
tasklist | findstr "python.exe" >nul
if errorlevel 1 (
    echo     [!] Python AI 未運行，啟動中...
    start "PythonAI" /MIN cmd /c "cd line_bot_ai && python -m uvicorn app.main:app --host 0.0.0.0 --port 8888"
    timeout /t 5 /nobreak
) else (
    echo     [OK] Python AI 運行中
)

echo.
echo [5/5] 重新載入 Nginx 配置...
tasklist | findstr "nginx.exe" >nul
if errorlevel 1 (
    echo     [!] Nginx 未運行，啟動中...
    cd /d "%~dp0"
    start "" nginx.exe -c nginx-local.conf
    timeout /t 3 /nobreak
) else (
    echo     [OK] 重新載入配置...
    nginx.exe -s reload -c nginx-local.conf
    timeout /t 2 /nobreak
)
echo     OK

echo.
echo ===============================================
echo   測試連接
echo ===============================================
echo.

echo 測試本地 Nginx (HTTP)...
curl -s -o nul -w "狀態碼: %%{http_code}\n" http://127.0.0.1/ --max-time 5

echo.
echo 測試 LINE Webhook (HTTPS)...
curl -s -o nul -w "狀態碼: %%{http_code}\n" https://linebot.tiankai.it.com/api/webhook/line -X POST -H "Content-Type: application/json" -d "{\"test\":true}" --max-time 10

echo.
echo ===============================================
echo   修復完成
echo ===============================================
echo.
echo   架構說明：
echo   ┌─────────────────────────────────┐
echo   │  LINE Platform                  │
echo   │  (HTTPS 必需)                    │
echo   └─────────────┬───────────────────┘
echo                 │ HTTPS
echo   ┌─────────────▼───────────────────┐
echo   │  Cloudflare Proxy (橙雲)        │
echo   │  SSL 終止                        │
echo   └─────────────┬───────────────────┘
echo                 │ HTTP
echo   ┌─────────────▼───────────────────┐
echo   │  Nginx (本地 80/443)            │
echo   │  反向代理                        │
echo   └─────────────┬───────────────────┘
echo         │             │
echo   ┌─────▼─────┐ ┌────▼────────┐
echo   │ Next.js   │ │ Python AI   │
echo   │ :9999     │ │ :8888       │
echo   └───────────┘ └─────────────┘
echo.
echo   LINE Webhook URL (HTTPS):
echo   https://linebot.tiankai.it.com/api/webhook/line
echo.
echo   BossAI URL (HTTPS):
echo   https://bossai.tiankai.it.com
echo.
echo   員工可以用 LINE 打卡了！
echo.
pause
