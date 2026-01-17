@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   LINE Bot 本地啟動 (開發模式)
echo ===============================================
echo.

REM 檢查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 找不到 Python，請先安裝 Python
    pause
    exit /b 1
)

REM 切換到 line_bot_ai 目錄
cd /d "%~dp0line_bot_ai"

echo [1/4] 檢查依賴...
pip install -r requirements.txt -q >nul 2>&1

echo [2/4] 設定環境變數...
set PYTHONUNBUFFERED=1
set TZ=Asia/Taipei

echo [3/4] 啟動服務（自動重啟模式）...
echo.
echo ✅ 服務已啟動！
echo.
echo 服務地址: http://localhost:9999
echo Webhook: http://localhost:9999/api/webhook/line
echo.
echo 按 Ctrl+C 停止服務
echo ===============================================
echo.

REM 使用無限循環實現自動重啟
:restart_loop
python main.py
set EXIT_CODE=%errorlevel%

REM 如果是正常退出（0），不再重啟
if %EXIT_CODE% equ 0 (
    echo.
    echo 服務正常退出
    goto :end
)

REM 異常退出，等待 5 秒後重啟
echo.
echo ===============================================
echo   服務異常退出（代碼: %EXIT_CODE%）
echo   5 秒後自動重啟...
echo ===============================================
echo.

timeout /t 5 /nobreak >nul
goto :restart_loop

:end
pause
