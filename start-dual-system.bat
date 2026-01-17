@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   九九瓦斯行 - 雙系統啟動
echo   自動監控與重啟
echo ===============================================
echo.

cd /d "%~dp0"

REM 設定環境變數
set PYTHONIOENCODING=utf-8
set PYTHONUNBUFFERED=1

REM 創建日誌目錄
if not exist logs mkdir logs

echo [系統] Next.js 前端 + Python FastAPI 後端
echo.
echo [服務]
echo   • Next.js: http://localhost:3000
echo   • Python API: http://localhost:9999
echo.
echo [功能]
echo   ✓ 雙系統同時運行
echo   ✓ 自動檢測服務狀態
echo   ✓ 斷線自動重啟
echo   ✓ 日誌記錄到 logs\
echo.
echo 按 Ctrl+C 停止所有服務
echo ===============================================
echo.

REM ========================================
REM 啟動 Python FastAPI 服務 (端口 9999 -> 改為 8000)
REM ========================================
echo [1/2] 啟動 Python FastAPI 服務...

cd line_bot_ai

REM 檢查虛擬環境
if not exist venv (
    echo [準備] 創建 Python 虛擬環境...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -q fastapi uvicorn requests python-dotenv line-bot-sdk
) else (
    call venv\Scripts\activate.bat
)

REM 啟動 Python 服務（使用端口 8000 避免衝突）
start /B cmd /c "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > ..\logs\python-api.log 2>&1"

REM 等待 Python 服務啟動
timeout /t 3 /nobreak >nul

REM 檢查 Python 服務
curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Python FastAPI 已啟動 (端口 8000)
) else (
    echo [!] Python FastAPI 啟動中，請稍候...
)

cd ..

REM ========================================
REM 啟動 Next.js 開發服務器 (端口 9999)
REM ========================================
echo [2/2] 啟動 Next.js 開發服務器...

REM 檢查 node_modules
if not exist node_modules (
    echo [準備] 安裝 Node.js 依賴...
    call npm install
)

REM 啟動 Next.js 開發服務器
start /B cmd /c "npm run dev > logs\nextjs.log 2>&1"

REM 等待 Next.js 啟動
timeout /t 5 /nobreak >nul

REM 檢查 Next.js
curl -s http://localhost:9999 >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] Next.js 已啟動 (端口 9999)
) else (
    echo [!] Next.js 啟動中，請稍候...
)

echo.
echo ===============================================
echo   雙系統已啟動
echo ===============================================
echo.
echo [訪問地址]
echo   • 前端界面: http://localhost:9999
echo   • Python API: http://localhost:8000
echo   • API 文檔: http://localhost:8000/api/docs
echo.
echo [監控日誌]
echo   • Python: logs\python-api.log
echo   • Next.js: logs\nextjs.log
echo.
echo [監控模式啟動中...]
echo   • 自動檢測間隔: 10 秒
echo   • 斷線自動重啟
echo.
echo ===============================================
echo.

REM ========================================
REM 監控循環
REM ========================================
:monitor
    timeout /t 10 /nobreak >nul

    REM 檢查 Next.js
    curl -s http://localhost:9999 >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo [警告] Next.js 已斷線，正在重啟...
        taskkill /F /IM node.exe >nul 2>&1
        timeout /t 2 /nobreak >nul
        start /B cmd /c "npm run dev > logs\nextjs.log 2>&1"
        echo [✓] Next.js 已重啟
        echo.
    )

    REM 檢查 Python
    curl -s http://localhost:8000/api/health >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo [警告] Python API 已斷線，正在重啟...
        taskkill /F /IM python.exe >nul 2>&1
        timeout /t 2 /nobreak >nul
        cd line_bot_ai
        start /B cmd /c "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > ..\logs\python-api.log 2>&1"
        cd ..
        echo [✓] Python API 已重啟
        echo.
    )

    REM 顯示監控狀態
    echo [%date% %time%] 系統運行正常...

    goto :monitor

:end
echo.
echo 監控已停止
pause
