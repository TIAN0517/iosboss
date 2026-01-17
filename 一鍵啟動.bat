@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   九九瓦斯行 - 一鍵啟動所有服務
echo   自動監控與重啟
echo ===============================================
echo.

cd /d "%~dp0"

REM 創建日誌目錄
if not exist logs mkdir logs

echo [初始化] 清理舊服務...
tasklist | findstr node.exe >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /F /IM node.exe >nul 2>&1
)

tasklist | findstr python.exe >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /F /IM python.exe >nul 2>&1
)

tasklist | findstr cloudflared.exe >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /F /IM cloudflared.exe >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo    ✓ 舊服務已清理
echo.

REM 啟動 Next.js (端口 9999)
echo [1/3] 啟動 Next.js 後台 (端口 9999)...
start "NextJS-Backend" /MIN cmd /c "npm run dev > logs\nextjs.log 2>&1"
timeout /t 5 /nobreak >nul
echo    ✓ Next.js 啟動中...
echo.

REM 啟動 Python AI (端口 8888)
echo [2/3] 啟動 Python AI 服務 (端口 8888)...
start "Python-AI" /MIN cmd /c "cd line_bot_ai && python -m uvicorn app.main:app --host 0.0.0.0 --port 8888 > ..\logs\pythonai.log 2>&1"
timeout /t 5 /nobreak >nul
echo    ✓ Python AI 啟動中...
echo.

REM 啟動 Cloudflare Tunnel
echo [3/3] 啟動 Cloudflare Tunnel...
start "Cloudflare-Tunnel" /MIN cloudflared.exe tunnel run --token eyJhIjoiMjk0ZWE4NTM5ZDRkMTc5MzRjZTA5NDM4ZDdjMDE5NjciLCJzIjoiWTJJd1pUUmxaVFl0WWpreE5pMDBaRE0yTFdFNFlUSXRZVGMyT0RZM01UQXdObUZtIiwidCI6IjZiOTc1ODUzLWQ2OGEtNDI2Mi05ODcwLWJjMTBhYWRlMjc1OSJ9
timeout /t 8 /nobreak >nul
echo    ✓ Cloudflare Tunnel 啟動中...
echo.

REM 等待服務完全啟動
echo [檢查] 等待服務完全啟動...
timeout /t 10 /nobreak >nul
echo.

echo ===============================================
echo   服務啟動完成
echo ===============================================
echo.
echo 📊 服務狀態:
echo   • Next.js 後台:  http://localhost:9999
echo   • Python AI:      http://localhost:8888
echo   • Cloudflare:     運行中
echo.
echo 🌐 外網訪問:
echo   • LINE Bot:      https://linebot.tiankai.it.com/api/webhook/line
echo   • 後台管理:      https://bossai.tiankai.it.com
echo.
echo 📁 日誌位置:
echo   • logs\nextjs.log
echo   • logs\pythonai.log
echo.
echo ⚠️  關閉此視窗不會影響服務運行
echo    服務會在背景繼續運行
echo.
echo 🛑 停止所有服務請執行: stop-all-services.bat
echo ===============================================
echo.
timeout /t 5
exit
