@echo off
chcp 65001 > nul
cls

echo ===============================================
echo   BossJy-99 本地啟動
echo ===============================================
echo.

cd /d "%~dp0"

REM 清理舊進程
echo [清理] 舊進程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9999 :8888"') do taskkill /PID %%a /F >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak
echo     OK

echo.
echo [1/2] 啟動 Next.js (端口 9999)...
start "NextJS" /MIN cmd /c "npm run dev"
timeout /t 15 /nobreak
echo     OK

echo.
echo [2/2] 啟動 Python AI (端口 8888)...
start "PythonAI" /MIN cmd /c "cd line_bot_ai && python -m uvicorn app.main:app --host 0.0.0.0 --port 8888"
timeout /t 5 /nobreak
echo     OK

echo.
echo ===============================================
echo   訪問地址
echo ===============================================
echo.
echo   本地 Next.js:  http://localhost:9999
echo   本地 Python:   http://localhost:8888
echo   Python API 文檔: http://localhost:8888/docs
echo.
echo   外網 (固定 IP):
echo   http://49.158.236.211:9999
echo   http://49.158.236.211:8888
echo.
echo ===============================================
echo.
pause
