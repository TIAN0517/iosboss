@echo off
chcp 65001 > nul
cls

echo.
echo ===============================================
echo   BossJy-99 - 本地開發環境 (守護進程)
echo ===============================================
echo.
echo   自動監控並重啟服務
echo   關閉此視窗將停止守護
echo.
echo ===============================================
echo.

cd /d "%~dp0"

:main_loop
echo [%date% %time%] 檢查服務狀態...

REM 檢查 Next.js
netstat -ano | findstr ":9999 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     [!] Next.js 未運行，正在啟動...
    taskkill /F /IM node.exe >nul 2>&1
    start "NextJS-DevServer" cmd /c "npm run dev"
    timeout /t 10 /nobreak >nul
) else (
    echo     [OK] Next.js 運行中
)

REM 檢查 Python AI
netstat -ano | findstr ":8888 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     [!] Python AI 未運行，正在啟動...
    if exist "line_bot_ai" (
        start "Python-AI" cmd /c "cd line_bot_ai && python -m uvicorn app.main:app --host 0.0.0.0 --port 8888"
        timeout /t 5 /nobreak >nul
    )
) else (
    echo     [OK] Python AI 運行中
)

echo.
echo ===============================================
echo   服務狀態
echo ===============================================
echo   Next.js:   http://localhost:9999
echo   Python AI: http://localhost:8888
echo ===============================================
echo.

REM 每 30 秒檢查一次
timeout /t 30 /nobreak >nul
goto main_loop
