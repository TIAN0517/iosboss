@echo off
echo ========================================
echo   Gas System - Cloudflare Tunnel
echo ========================================
echo.

REM 檢查是否以管理員權限運行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [錯誤] 需要管理員權限！
    echo 請右鍵點擊此檔案，選擇「以系統管理員身分執行」
    echo.
    pause
    exit /b 1
)

echo [1/4] 檢查本地服務...
curl -s http://localhost:9999 >nul 2>&1
if %errorLevel% neq 0 (
    echo [警告] 本地服務未運行，請先啟動：npm run dev
    echo.
    pause
    exit /b 1
)
echo [OK] 本地服務正常 (port 9999)

echo.
echo [2/4] 設置防火牆規則...
netsh advfirewall firewall show rule name="Cloudflare Tunnel" >nul 2>&1
if %errorLevel% neq 0 (
    netsh advfirewall firewall add rule name="Cloudflare Tunnel" dir=in action=allow program="%~dp0cloudflared.exe" enable=yes >nul 2>&1
    netsh advfirewall firewall add rule name="Cloudflare Tunnel Out" dir=out action=allow program="%~dp0cloudflared.exe" enable=yes >nul 2>&1
    echo [OK] 防火牆規則已添加
) else (
    echo [OK] 防火牆規則已存在
)

echo.
echo [3/4] 停止舊的隧道進程...
tasklist | findstr /I cloudflared.exe >nul 2>&1
if %errorLevel% equ 0 (
    taskkill /F /IM cloudflared.exe >nul 2>&1
    timeout /t 2 >nul
    echo [OK] 舊的隧道已停止
) else (
    echo [OK] 沒有運行中的隧道
)

echo.
echo [4/4] 啟動 Cloudflare Tunnel...
echo.
echo ========================================
echo   隧道啟動中...
echo ========================================
echo.

start "Cloudflare Tunnel" /MIN cloudflared.exe tunnel --config cloudflared.yml run

echo.
echo 等待隧道連接...
timeout /t 10 >nul

echo.
echo ========================================
echo   測試連接...
echo ========================================
echo.

curl -s -I https://bossai.tiankai.it.com | findstr "HTTP"
echo.

echo ========================================
echo   完成！
echo ========================================
echo.
echo 本地: http://localhost:9999
echo 外部: https://bossai.tiankai.it.com
echo.
echo LINE Bot Webhook URL:
echo https://bossai.tiankai.it.com/api/webhook/line
echo.
echo 按任意鍵關閉此視窗（隧道會繼續在背景運行）
pause >nul
