@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   九九瓦斯行 - 自動重啟啟動腳本
echo ===============================================
echo.

cd /d "%~dp0"

set RESTART_DELAY=5
set MAX_RESTART=0

REM 檢查端口 9999 是否被占用
echo [初始化] 檢查端口 9999...
netstat -ano | findstr :9999 | findstr LISTENING >nul 2>&1
if %errorlevel% equ 0 (
    echo    端口 9999 已被占用，正在釋放...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9999 ^| findstr LISTENING') do (
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)
echo    ✓ 端口 9999 已就緒
echo.

REM 檢查 Node.js
echo [初始化] 檢查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo    ❌ 找不到 Node.js，請先安裝
    pause
    exit /b 1
)
echo    ✓ Node.js 已就緒
echo.

echo ===============================================
echo   服務啟動中（崩潰自動重啟模式）
echo ===============================================
echo.
echo   本地地址: http://localhost:9999
echo   按 Ctrl+C 停止服務
echo ===============================================
echo.

:restart_loop
set RESTART_COUNT=0

:loop
npm run dev
set EXIT_CODE=%errorlevel%

REM 正常退出
if %EXIT_CODE% equ 0 (
    echo.
    echo ===============================================
    echo   服務正常退出
    echo ===============================================
    goto :end
)

REM Ctrl+C 停止
if %EXIT_CODE% equ -1073741510 (
    echo.
    echo ===============================================
    echo   使用者中斷服務
    echo ===============================================
    goto :end
)

REM 崩潰退出，等待後重啟
set /a RESTART_COUNT+=1
echo.
    echo ===============================================
    echo   服務崩潰（代碼: %EXIT_CODE%）
    echo   %RESTART_DELAY% 秒後自動重啟（第 %RESTART_COUNT% 次）...
    echo ===============================================
    echo.

timeout /t %RESTART_DELAY% /nobreak >nul
goto loop

:end
echo.
pause
