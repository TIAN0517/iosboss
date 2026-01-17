@echo off
chcp 65001 > nul
cls

echo ===============================================
echo   啟動 Caddy (自動 HTTPS)
echo ===============================================
echo.

REM 檢查端口 80 和 443
netstat -ano | findstr ":443" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [!] 警告: 端口 443 已被佔用
    echo     請先停止佔用該端口的程序
    pause
    exit /b 1
)

echo [1/2] 啟動 Caddy...
start "Caddy" caddy.exe run --config Caddyfile
timeout /t 3 /nobreak
echo     OK

echo.
echo [2/2] 檢查 Caddy 狀態...
timeout /t 5 /nobreak
tasklist | findstr "caddy.exe"
if errorlevel 1 (
    echo     [!] Caddy 未運行
) else (
    echo     [OK] Caddy 運行中
)

echo.
echo ===============================================
echo   Caddy 自動 HTTPS 配置
echo ===============================================
echo.
echo   Caddy 會自動：
echo   - 獲取 Let's Encrypt SSL 憑證
echo   - 處理 HTTPS 請求
echo   - 反向代理到本地服務
echo.
echo   LINE Webhook URL:
echo   https://linebot.tiankai.it.com/api/webhook/line
echo.
echo   BossAI URL:
echo   https://bossai.tiankai.it.com
echo.
echo ===============================================
pause
