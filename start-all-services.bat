@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   九九瓦斯行 - 統一服務啟動
echo   自動監控與重啟
echo ===============================================
echo.

cd /d "%~dp0"

REM 設定環境變量
set PYTHONIOENCODING=utf-8
set PYTHONUNBUFFERED=1

REM 檢查並停止舊服務
echo [初始化] 檢查現有服務...
tasklist | findstr node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo    停止舊的 Node.js 服務...
    taskkill /F /IM node.exe >nul 2>&1
)

tasklist | findstr python.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo    停止舊的 Python 服務...
    taskkill /F /IM python.exe >nul 2>&1
)

timeout /t 2 /nobreak >nul
echo    ✓ 舊服務已清理
echo.

REM 啟動 Next.js (端口 9999)
echo [1/2] 啟動 Next.js 後台 (端口 9999)...
start "NextJS-Backend" /MIN cmd /c "cd /d "%~dp0" && npm run dev > logs\nextjs.log 2>&1"
timeout /t 5 /nobreak >nul

REM 檢查 Next.js
curl -s http://localhost:9999/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Next.js 啟動成功
) else (
    echo    ⚠ Next.js 啟動中，請稍候...
)
echo.

REM 啟動 Python AI (端口 8888)
echo [2/2] 啟動 Python AI 服務 (端口 8888)...
if not exist logs mkdir logs
start "Python-AI" /MIN cmd /c "cd /d "%~dp0line_bot_ai" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8888 > ..\logs\pythonai.log 2>&1"
timeout /t 5 /nobreak >nul

REM 檢查 Python AI
curl -s http://localhost:8888/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Python AI 啟動成功
) else (
    echo    ⚠ Python AI 啟動中，請稍候...
)
echo.

echo ===============================================
echo   服務啟動完成
echo ===============================================
echo.
echo 服務狀態:
echo   Next.js:   http://localhost:9999
echo   Python AI: http://localhost:8888
echo.
echo 日誌位置:
echo   Next.js:   logs\nextjs.log
echo   Python AI: logs\pythonai.log
echo.
echo 按任意鍵關閉此視窗（服務會繼續在背景運行）
echo ===============================================
pause >nul
