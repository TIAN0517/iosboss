@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   LINE Bot 本地服務啟動
echo   自動監控與重啟
echo ===============================================
echo.

cd /d "%~dp0line_bot_ai"

REM 檢查是否已有服務運行
tasklist /FI "IMAGENAME eq python.exe" 2>nul | find /c "python.exe" >nul
if %errorlevel% geq 1 (
    echo [啟動] 目前沒有運行中的服務
) else (
    echo [停止] 發現運行中的服務，正在停止...
    taskkill /F /IM python.exe /T >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo.
echo [安裝] 檢查依賴...
pip install -q fastapi uvicorn requests python-dotenv line-bot-sdk 2>nul

REM 設定環境變數
set PYTHONIOENCODING=utf-8
set PYTHONUNBUFFERED=1
set PYTHONPATH=%CD%

echo.
echo ===============================================
echo   服務啟動中...
echo ===============================================
echo.
echo 服務地址: http://localhost:9999
echo Webhook:  http://localhost:9999/api/webhook/line
echo.
echo 自動重啟: 已啟用
echo 按 Ctrl+C 停止服務
echo ===============================================
echo.

REM 主循環 - 自動重啟
:main_loop
    python -m uvicorn app.main:app --host 0.0.0.0 --port 9999
    set EXIT_CODE=%errorlevel%

    REM 檢查退出代碼
    if %EXIT_CODE% equ 0 (
        echo.
        echo [正常] 服務正常退出
        goto :end
    )

    if %EXIT_CODE% equ 3221225478 (
        echo.
        echo [終止] 服務被用戶終止 (Ctrl+C)
        goto :end
    )

    REM 其他錯誤 - 自動重啟
    echo.
    echo ===============================================
        echo   服務異常退出（代碼: %EXIT_CODE%）
        echo   系統將在 5 秒後自動重啟...
        echo ===============================================
    echo.

    timeout /t 5 /nobreak >nul
    goto :main_loop

:end
echo.
echo ===============================================
echo   服務已停止
echo ===============================================
echo.
pause
