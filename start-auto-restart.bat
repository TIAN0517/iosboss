@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   LINE Bot 本地啟動
echo   自動重啟模式
echo ===============================================
echo.

cd /d "%~dp0"

REM 檢查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 錯誤: 找不到 Python
    pause
    exit /b 1
)

REM 切換到 line_bot_ai 目錄
cd line_bot_ai

REM 安裝依賴
echo [準備] 檢查依賴...
pip install -q fastapi uvicorn requests python-dotenv line-bot-sdk 2>nul

REM 設定環境變數
set PYTHONIOENCODING=utf-8
set PYTHONUNBUFFERED=1

echo.
echo ===============================================
echo   服務啟動中...
echo ===============================================
echo.
echo 服務地址: http://localhost:9999
echo Webhook:  http://localhost:9999/api/webhook/line
echo.
echo 按 Ctrl+C 停止，異常退出會自動重啟
echo ===============================================
echo.

REM 無限循環啟動（自動重啟）
:restart
    python -m uvicorn app.main:app --host 0.0.0.0 --port 9999
    set EXIT_CODE=%errorlevel%

    REM 正常退出
    if %EXIT_CODE% equ 0 (
        echo.
        echo 服務正常退出
        goto :end
    )

    REM 異常退出，等待後重啟
    echo.
    echo ===============================================
    echo   服務異常退出（代碼: %EXIT_CODE%）
    echo   5 秒後自動重啟...
    echo ===============================================
    echo.
    timeout /t 5 /nobreak >nul
    goto :restart

:end
echo.
pause
