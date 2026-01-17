@echo off

:: ========================================
:: Service Status Check
:: ========================================

echo ========================================
echo  BossJy-99 Service Status
echo ========================================
echo.

:: Check Next.js
echo [1] Next.js Service (Port 9999)
netstat -ano | findstr ":9999 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     Status: X Not Running
) else (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9999 " ^| findstr "LISTENING"') do (
        echo     Status: OK Running ^(PID: %%a^)
    )
)
echo.

:: Check Cloudflare Tunnel
echo [2] Cloudflare Tunnel
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I /N "cloudflared.exe">nul
if errorlevel 1 (
    echo     Status: X Not Running
) else (
    for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq cloudflared.exe" ^| find "cloudflared.exe"') do (
        echo     Status: OK Running ^(PID: %%a^)
    )
)
echo.

:: Check Docker
echo [3] Docker Desktop
tasklist /FI "IMAGENAME eq Docker Desktop.exe" 2>nul | find /I /N "Docker">nul
if errorlevel 1 (
    echo     Status: ! Not Running
) else (
    echo     Status: OK Running
)
echo.

:: Test tunnel connectivity
echo [4] Tunnel Connectivity Test
ping -n 1 bossai.tiankai.it.com | find "TTL=" >nul
if errorlevel 1 (
    echo     bossai.tiankai.it.com: X No Connection
) else (
    echo     bossai.tiankai.it.com: OK Connected
)

ping -n 1 linebot.tiankai.it.com | find "TTL=" >nul
if errorlevel 1 (
    echo     linebot.tiankai.it.com: X No Connection
) else (
    echo     linebot.tiankai.it.com: OK Connected
)
echo.

echo ========================================
echo.
echo Press any key to exit...
pause >nul
