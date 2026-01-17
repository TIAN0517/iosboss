@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   Cloudflare Tunnel 服務管理
echo ===============================================
echo.
echo 請選擇操作：
echo.
echo [1] 查看服務狀態
echo [2] 啟動服務
echo [3] 停止服務
echo [4] 重啟服務
echo [5] 查看隧道資訊
echo [0] 退出
echo.
echo ===============================================
set /p choice=請輸入選項 (0-5):

if "%choice%"=="1" goto status
if "%choice%"=="2" goto start
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto restart
if "%choice%"=="5" goto info
if "%choice%"=="0" goto end
goto invalid

:status
echo.
echo ===============================================
echo   服務狀態
echo ===============================================
net start | findstr -i cloudflared >nul
if %errorLevel% equ 0 (
    echo ✓ cloudflared 服務正在運行
) else (
    echo ✗ cloudflared 服務未運行
)
echo.
pause
goto end

:start
echo.
echo 正在啟動 cloudflared 服務...
net start cloudflared
if %errorLevel% equ 0 (
    echo ✓ 服務啟動成功
) else (
    echo ✗ 服務啟動失敗
)
echo.
pause
goto end

:stop
echo.
echo 正在停止 cloudflared 服務...
net stop cloudflared
if %errorLevel% equ 0 (
    echo ✓ 服務停止成功
) else (
    echo ✗ 服務停止失敗
)
echo.
pause
goto end

:restart
echo.
echo 正在重啟 cloudflared 服務...
net stop cloudflared >nul 2>&1
timeout /t 2 /nobreak >nul
net start cloudflared
if %errorLevel% equ 0 (
    echo ✓ 服務重啟成功
) else (
    echo ✗ 服務重啟失敗
)
echo.
pause
goto end

:info
echo.
echo ===============================================
echo   隧道資訊
echo ===============================================
echo.
echo 管理員模式查看：
echo https://dash.cloudflare.com/zero-trust/tunnels
echo.
echo 測試連接：
ping -n 1 bossai.tiankai.it.com
echo.
pause
goto end

:invalid
echo.
echo ❌ 無效的選項
pause

:end
