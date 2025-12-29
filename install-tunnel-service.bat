@echo off
REM 九九瓦斯行系統 - Cloudflare Tunnel 服務安裝腳本
REM 將 cloudflared 安裝為 Windows 服務，開機自動啟動

echo ========================================
echo 九九瓦斯行系統 - 安裝 Cloudflare Tunnel 服務
echo ========================================
echo.

REM 檢查是否以管理員身份運行
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [錯誤] 需要管理員權限
    echo.
    echo 請以「以管理員身份運行」執行此腳本
    pause
    exit /b 1
)

REM 檢查 cloudflared 是否存在
if not exist "cloudflared.exe" (
    echo [錯誤] 找不到 cloudflared.exe
    echo 請先將 cloudflared.exe 放到這個目錄
    pause
    exit /b 1
)

echo [1/6] 登入 Cloudflare 帳號...
echo 瀏覽器將會開啟，請登入你的 Cloudflare 帳號
echo.
cloudflared.exe tunnel login
pause

echo.
echo [2/6] 建立隧道...
echo.
cloudflared.exe tunnel create jy99gas
pause

echo.
echo [3/6] 輸入 Tunnel ID...
set /p TUNNEL_ID=請輸入上面顯示的 Tunnel ID:

if "%TUNNEL_ID%"=="" (
    echo [錯誤] Tunnel ID 不能為空
    pause
    exit /b 1
)

echo.
echo [4/6] 建立設定檔...
set CONFIG_DIR=C:\Users\tian7\.cloudflared
set CONFIG_FILE=%cd%\cloudflared-config.yml

if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

(
    echo tunnel: %TUNNEL_ID%
    echo credentials-file: %CONFIG_DIR%\%TUNNEL_ID%.json
    echo.
    echo ingress:
    echo   - hostname: jy99gas.trycloudflare.com
    echo     service: http://localhost:9999
    echo   - service: http://localhost:9999
) > "%CONFIG_FILE%"

echo 設定檔已建立: %CONFIG_FILE%

echo.
echo [5/6] 安裝 Windows 服務...
cloudflared.exe service install
if errorlevel 1 (
    echo [錯誤] 服務安裝失敗
    pause
    exit /b 1
)

echo.
echo [6/6] 設定服務...
echo 正在設定服務，請按照提示操作...
echo.
echo 請輸入以下資訊：
echo - Tunnel ID: %TUNNEL_ID%
echo - Cloudflare account: (選擇你的帳號)
echo - Config path: %CONFIG_FILE%
echo.
cloudflared.exe service config

echo.
echo ========================================
echo 設定完成！
echo ========================================
echo.
echo 服務管理指令:
echo   啟動服務:    net start cloudflared
echo   停止服務:    net stop cloudflared
echo   查看狀態:    sc query cloudflared
echo   設定自動啟動: sc config cloudflared start= auto
echo   卸載服務:    cloudflared.exe service uninstall
echo.

echo 是否要立即啟動服務？ (Y/N)
set /p START_IMMEDIATE=
if /i "%START_IMMEDIATE%"=="Y" (
    net start cloudflared
    echo.
    echo 服務已啟動！
    echo.
    echo 請等待幾秒讓隧道建立連線...
    timeout /t 10 /nobreak >nul
    echo.
    echo 您的系統現在可以通過以下 URL 訪問:
    echo https://jy99gas.trycloudflare.com
)

echo.
pause
