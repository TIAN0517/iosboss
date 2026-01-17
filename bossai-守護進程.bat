@echo off
chcp 65001 > nul
title BossJy-99 守護進程
color 0A

:: ===============================================
:: BossJy-99 自動守護進程
:: ===============================================

:: 切換到腳本所在目錄
cd /d "%~dp0"

set "LOG=守護進程.log"
set "NEXTJS_PORT=9999"
set "PYTHON_PORT=8888"

echo.
echo ===============================================
echo   BossJy-99 守護進程啟動
echo   [%date% %time%]
echo   工作目錄: %CD%
echo ===============================================
echo.

:: 清理緩存
echo [清理] 清理舊進程和緩存...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%NEXTJS_PORT% :%PYTHON_PORT%"') do taskkill /PID %%a /F >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
timeout /t 3 /nobreak >nul

:: 強制清理快取
echo     - 清理 .next ...
if exist ".next" rmdir /s /q .next 2>nul
echo     - 清理 node_modules\.cache ...
if exist "node_modules\.cache" rmdir /s /q node_modules\.cache 2>nul
echo     OK
echo.

:: 計數器
set "nextjs_restart=0"
set "python_restart=0"
set "tunnel_restart=0"

:main_loop
echo [%date% %time%] 檢查服務...

:: ===============================================
:: 檢查 Next.js
:: ===============================================
netstat -ano | findstr ":%NEXTJS_PORT% " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     [!] Next.js 未運行，正在啟動...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul

    if exist "package.json" (
        start "NextJS-DevServer" /MIN cmd /c "npm run dev"
        set /a nextjs_restart+=1
        echo     [✓] Next.js 已啟動 (重啟: !nextjs_restart!)
    ) else (
        echo     [X] 錯誤: 找不到 package.json (當前: %CD%)
    )
    timeout /t 15 /nobreak >nul
) else (
    echo     [OK] Next.js 運行中
)

:: ===============================================
:: 檢查 Python AI
:: ===============================================
netstat -ano | findstr ":%PYTHON_PORT% " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     [!] Python AI 未運行，正在啟動...

    if exist "line_bot_ai\app\main.py" (
        start "Python-AI" /MIN cmd /c "cd line_bot_ai && python -m uvicorn app.main:app --host 0.0.0.0 --port %PYTHON_PORT%"
        set /a python_restart+=1
        echo     [✓] Python AI 已啟動 (重啟: !python_restart!)
    ) else (
        echo     [!] 跳過 Python AI (目錄不存在)
    )
    timeout /t 5 /nobreak >nul
) else (
    echo     [OK] Python AI 運行中
)

:: ===============================================
:: 檢查 Cloudflare Tunnel
:: ===============================================
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I /N "cloudflared.exe">nul
if errorlevel 1 (
    echo     [!] Cloudflare Tunnel 未運行，正在啟動...

    if exist "cloudflared.exe" (
        if exist "cloudflared.yml" (
            start "Cloudflare-Tunnel" /MIN cloudflared.exe tunnel --config cloudflared.yml run
            set /a tunnel_restart+=1
            echo     [✓] Tunnel 已啟動 (重啟: !tunnel_restart!)
            timeout /t 5 /nobreak >nul
        ) else (
            echo     [!] 跳過 Tunnel (cloudflared.yml 不存在)
        )
    ) else (
        echo     [!] 跳過 Tunnel (cloudflared.exe 不存在)
    )
) else (
    echo     [OK] Cloudflare Tunnel 運行中
)

:: ===============================================
:: 顯示狀態
:: ===============================================
echo.
echo ===============================================
echo   當前狀態
echo ===============================================
echo   Next.js:   http://localhost:%NEXTJS_PORT%
echo   Python AI: http://localhost:%PYTHON_PORT%
echo   Tunnel:    HTTPS 外網訪問
echo   Next.js 重啟:   %nextjs_restart% 次
echo   Python AI 重啟: %python_restart% 次
echo   Tunnel 重啟:    %tunnel_restart% 次
echo ===============================================
echo.

:: 每 30 秒檢查一次
timeout /t 30 /nobreak >nul
goto main_loop
