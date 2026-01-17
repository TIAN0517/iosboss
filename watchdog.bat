@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ========================================
:: 九九瓦斯行 - 服務守護進程
:: 精準監控並自動重啟服務
:: ========================================

set "LOG_FILE=watchdog.log"
set "CHECK_INTERVAL=10"

:: 服務配置
set "NEXTJS_PORT=9999"
set "TUNNEL_HOST=bossai.tiankai.it.com"

echo [%date% %time%] 守護進程啟動 > %LOG_FILE%
echo ======================================== >> %LOG_FILE%
echo 監控項目: >> %LOG_FILE%
echo   - Next.js (端口 %NEXTJS_PORT%) >> %LOG_FILE%
echo   - Cloudflare Tunnel (%TUNNEL_HOST%) >> %LOG_FILE%
echo ======================================== >> %LOG_FILE%

:main_loop
    call :check_nextjs
    call :check_tunnel
    call :check_services
    timeout /t %CHECK_INTERVAL% /nobreak >nul
    goto main_loop

:: ========================================
:: 檢查 Next.js 服務（端口檢測）
:: ========================================
:check_nextjs
    netstat -ano | findstr ":%NEXTJS_PORT% " | findstr "LISTENING" >nul
    if errorlevel 1 (
        echo [%date% %time%] [⚠] Next.js 服務異常 - 端口 %NEXTJS_PORT% 無回應 >> %LOG_FILE%
        call :kill_zombie_nextjs
        call :start_nextjs
    ) else (
        echo [%date% %time%] [✓] Next.js 運行正常 >> %LOG_FILE%
    )
    goto :eof

:: ========================================
:: 檢查 Cloudflare Tunnel
:: ========================================
:check_tunnel
    tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I /N "cloudflared.exe">nul
    if errorlevel 1 (
        echo [%date% %time%] [⚠] Cloudflare Tunnel 未運行 >> %LOG_FILE%
        call :start_tunnel
    ) else (
        :: 額外檢查：能否連通隧道域名
        ping -n 1 %TUNNEL_HOST% | find "TTL=" >nul
        if errorlevel 1 (
            echo [%date% %time%] [⚠] Tunnel 連線異常 - 無法連通 %TUNNEL_HOST% >> %LOG_FILE%
            call :restart_tunnel
        ) else (
            echo [%date% %time%] [✓] Cloudflare Tunnel 正常 >> %LOG_FILE%
        )
    )
    goto :eof

:: ========================================
:: 檢查其他必要服務（Docker 等）
:: ========================================
:check_services
    :: 檢查 Docker Desktop（如果需要）
    tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>nul | find /I /N "Docker">nul
    if errorlevel 1 (
        echo [%date% %time%] [i] Docker Desktop 未運行（如需要請手動啟動）>> %LOG_FILE%
    )
    goto :eof

:: ========================================
:: 清理 Next.js 殭屍進程
:: ========================================
:kill_zombie_nextjs
    echo [%date% %time%] [→] 清理 Next.js 殭屍進程... >> %LOG_FILE%
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%NEXTJS_PORT% "') do (
        taskkill /PID %%a /F >nul 2>&1
        if errorlevel 1 (
            echo [%date% %time%] [✓] 已殺死殭屍進程 PID:%%a >> %LOG_FILE%
        )
    )
    timeout /t 2 /nobreak >nul
    goto :eof

:: ========================================
:: 啟動 Next.js 服務
:: ========================================
:start_nextjs
    echo [%date% %time%] [→] 啟動 Next.js 服務... >> %LOG_FILE%

    :: 檢查 package.json 是否存在
    if not exist "package.json" (
        echo [%date% %time%] [✗] 錯誤: 找不到 package.json >> %LOG_FILE%
        goto :eof
    )

    :: 使用 start 命令後台啟動
    start "NextJS-DevServer" cmd /c "npm run dev"

    :: 等待服務啟動
    echo [%date% %time%] [→] 等待 Next.js 啟動... >> %LOG_FILE%
    timeout /t 15 /nobreak >nul

    :: 驗證啟動成功
    netstat -ano | findstr ":%NEXTJS_PORT% " | findstr "LISTENING" >nul
    if errorlevel 1 (
        echo [%date% %time%] [✗] Next.js 啟動失敗 - 檢查 dev.log >> %LOG_FILE%
    ) else (
        echo [%date% %time%] [✓] Next.js 啟動成功 >> %LOG_FILE%
    )
    goto :eof

:: ========================================
:: 啟動 Cloudflare Tunnel
:: ========================================
:start_tunnel
    echo [%date% %time%] [→] 啟動 Cloudflare Tunnel... >> %LOG_FILE%

    :: 檢查配置文件
    if not exist "cloudflared.yml" (
        echo [%date% %time%] [✗] 錯誤: 找不到 cloudflared.yml >> %LOG_FILE%
        goto :eof
    )

    :: 檢查 cloudflared.exe
    if not exist "cloudflared.exe" (
        echo [%date% %time%] [✗] 錯誤: 找不到 cloudflared.exe >> %LOG_FILE%
        goto :eof
    )

    :: 啟動隧道
    start "Cloudflare-Tunnel" cloudflared.exe tunnel run --config cloudflared.yml

    :: 等待隧道啟動
    timeout /t 5 /nobreak >nul

    :: 驗證啟動成功
    tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I /N "cloudflared.exe">nul
    if errorlevel 1 (
        echo [%date% %time%] [✗] Tunnel 啟動失敗 >> %LOG_FILE%
    ) else (
        echo [%date% %time%] [✓] Tunnel 啟動成功 >> %LOG_FILE%
    )
    goto :eof

:: ========================================
:: 重啟 Cloudflare Tunnel
:: ========================================
:restart_tunnel
    echo [%date% %time%] [→] 重啟 Cloudflare Tunnel... >> %LOG_FILE%

    :: 殺掉舊進程
    taskkill /IM cloudflared.exe /F >nul 2>&1
    timeout /t 2 /nobreak >nul

    :: 重新啟動
    call :start_tunnel
    goto :eof

:: ========================================
:: 優雅退出（Ctrl+C 時）
:: ========================================
:cleanup
    echo.
    echo [%date% %time%] 守護進程停止 >> %LOG_FILE%
    echo 按任意鍵離開...
    pause >nul
    exit /b
