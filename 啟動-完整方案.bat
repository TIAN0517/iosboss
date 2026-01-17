@echo off
chcp 65001 > nul
cls

echo.
echo ===============================================
echo   BossJy-99 一鍵啟動 (含 Tunnel)
echo ===============================================
echo.

cd /d "%~dp0"

:: 清理舊進程
echo [清理] 舊進程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9999 :8888"') do taskkill /PID %%a /F >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 3 /nobreak >nul

:: 清理快取
echo [清理] 快取...
if exist ".next" rmdir /s /q .next 2>nul
if exist "node_modules\.cache" rmdir /s /q node_modules\.cache 2>nul
echo     OK
echo.

:: 啟動 Next.js
echo [1/3] 啟動 Next.js...
start "NextJS-DevServer" /MIN cmd /c "npm run dev"
echo     OK (等待 15 秒...)
timeout /t 15 /nobreak >nul

:: 啟動 Python AI
echo [2/3] 啟動 Python AI...
start "Python-AI" /MIN cmd /c "cd line_bot_ai && python -m uvicorn app.main:app --host 0.0.0.0 --port 8888"
echo     OK (等待 5 秒...)
timeout /t 5 /nobreak >nul

:: 啟動 Tunnel
echo [3/3] 啟動 Cloudflare Tunnel...
start "Cloudflare-Tunnel" /MIN cloudflared.exe tunnel --config cloudflared.yml run
echo     OK (等待 5 秒...)
timeout /t 5 /nobreak >nul

:: 檢查狀態
echo.
echo ===============================================
echo   服務狀態
echo ===============================================
echo.

netstat -ano | findstr ":9999 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     Next.js: X 失敗
) else (
    echo     Next.js: OK 運行中
)

netstat -ano | findstr ":8888 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     Python AI: X 失敗
) else (
    echo     Python AI: OK 運行中
)

tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I /N "cloudflared.exe">nul
if errorlevel 1 (
    echo     Tunnel:  X 失敗
) else (
    echo     Tunnel:  OK 運行中
)

echo.
echo ===============================================
echo   訪問地址
echo ===============================================
echo.
echo     本地 Next.js:  http://localhost:9999
echo     本地 Python:  http://localhost:8888
echo.
echo     外網 Next.js:  https://bossai.tiankai.it.com
echo     外網 LINE:    https://linebot.tiankai.it.com/api/webhook/line
echo.
echo ===============================================
echo.

:: 啟動守護進程
echo 是否啟動守護進程（自動重啟）？
echo [Y] 是  [N] 否
choice /C YN /N
if errorlevel 2 goto :end
if errorlevel 1 goto :watchdog

:watchdog
    echo.
    echo 啟動守護進程...
    call bossai-守護進程.bat
    goto :eof

:end
    echo.
    echo 按任意鍵離開...
    pause >nul
