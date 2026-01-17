@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   九九瓦斯行 - 一鍵啟動所有服務
echo ===============================================
echo.

cd /d "%~dp0"

REM 關閉舊的進程
echo [1/4] 關閉舊的進程...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM 啟動 Next.js 主系統
echo [2/4] 啟動 Next.js 主系統 (port 3000)...
start /B cmd /c "cd /d "%~dp0" && npm run dev"
timeout /t 5 /nobreak >nul

REM 檢查 Next.js
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Next.js 啟動成功
) else (
    echo [警告] Next.js 可能還在啟動中...
)

REM 啟動 LINE Bot AI
echo [3/4] 啟動 LINE Bot AI (port 9999)...
cd line_bot_ai
start /B python -m uvicorn app.main:app --host 0.0.0.0 --port 9999
cd ..
timeout /t 3 /nobreak >nul

REM 檢查 LINE Bot
curl -s http://localhost:9999/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] LINE Bot 啟動成功
) else (
    echo [警告] LINE Bot 可能還在啟動中...
)

echo.
echo ===============================================
echo   所有服務已啟動完成！
echo ===============================================
echo.
echo 🌐 Next.js 主系統: http://localhost:3000
echo 🤖 LINE Bot 文件:  http://localhost:9999/docs
echo 📊 API 文件 (JSON): http://localhost:9999/openapi.json
echo.
echo 💡 提示：
echo    - 服務在背景運行
echo    - 關閉此視窗不會影響服務
echo    - 使用 stop-all.bat 停止所有服務
echo.
echo ===============================================
pause
