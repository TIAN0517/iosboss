@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   九九瓦斯行 LINE Bot 服務啟動
echo   自動監控與重啟
echo ===============================================
echo.

cd /d "%~dp0"

REM 設定環境變數
set PYTHONIOENCODING=utf-8
set PYTHONUNBUFFERED=1

REM 1. 先啟動 LINE Bot 服務
echo [1/2] 啟動 LINE Bot 服務...
cd line_bot_ai
start /B python -m uvicorn app.main:app --host 0.0.0.0 --port 9999
cd ..

REM 等待服務啟動
timeout /t 3 /nobreak >nul

REM 檢查服務是否啟動成功
curl -s http://localhost:9999/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] LINE Bot 服務啟動成功
) else (
    echo [錯誤] LINE Bot 服務啟動失敗
    pause
    exit /b 1
)

REM 2. 啟動 Cloudflare Tunnel
echo.
echo [2/2] 啟動 Cloudflare Tunnel...
start /B cloudflared.exe tunnel --url http://localhost:9999

REM 等待隧道建立
timeout /t 8 /nobreak >nul

echo.
echo ===============================================
echo   服務已啟動
echo ===============================================
echo.
echo LINE Bot: http://localhost:9999
echo Webhook: 請查看 Cloudflare Tunnel 輸出獲取 URL
echo.
echo 按任意鍵關閉此視窗（服務會繼續在背景運行）
echo ===============================================
pause
