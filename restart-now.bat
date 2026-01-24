@echo off
chcp 65001 >nul
echo 正在停止服務...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9999 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)
timeout /t 3 /nobreak >nul

echo 正在啟動服務...
cd /d "%~dp0"
start /B cmd /c "npm run dev > dev.log 2>&1"

echo.
echo ========================================
echo   服務正在啟動...
echo   請稍等約 10 秒後訪問
echo   http://localhost:9999
echo ========================================
echo.
timeout /t 5
exit
