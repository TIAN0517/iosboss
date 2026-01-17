@echo off
chcp 65001 > nul
cls

echo.
echo ===============================================
echo   BossJy-99 本地開發 (固定 IP)
echo ===============================================
echo.

cd /d "%~dp0"

:: 清理
echo [清理] 舊進程和快取...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9999 :8888"') do taskkill /PID %%a /F >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul
if exist ".next" rmdir /s /q .next 2>nul
echo     OK
echo.

:: Next.js
echo [1/2] 啟動 Next.js (端口 9999)...
start "NextJS" /MIN cmd /c "npm run dev"
timeout /t 15 /nobreak >nul
echo     OK
echo.

:: Python
echo [2/2] 啟動 Python AI (端口 8888)...
start "PythonAI" /MIN cmd /c "cd line_bot_ai && python -m uvicorn app.main:app --host 0.0.0.0 --port 8888"
timeout /t 5 /nobreak >nul
echo     OK
echo.

echo ===============================================
echo   完成！
echo ===============================================
echo.
echo   本地訪問:
echo     http://localhost:9999
echo     http://localhost:8888/docs
echo.
echo   外網訪問 (需要路由器端口轉發):
echo     https://bossai.tiankai.it.com
echo     https://linebot.tiankai.it.com
echo.
echo ===============================================
echo.

:: 守護進程
echo 啟動守護進程 (自動重啟)? [Y/N]
choice /C YN /N
if errorlevel 2 goto :end
if errorlevel 1 goto :watchdog

:watchdog
    call bossai-守護進程.bat
    goto :eof

:end
    pause
