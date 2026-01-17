@echo off
setlocal enabledelayedexpansion

:: ========================================
:: Quick Fix & Restart All Services
:: ========================================

echo ========================================
echo  BossJy-99 Quick Restart
echo ========================================
echo.

echo [1/4] Cleaning old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9999 :8888"') do (
    taskkill /PID %%a /F >nul 2>&1
)
taskkill /IM cloudflared.exe /F >nul 2>&1
echo     Done
echo.

echo [2/4] Cleaning cache...
if exist ".next" rmdir /s /q .next 2>nul
if exist "node_modules\.cache" rmdir /s /q node_modules\.cache 2>nul
echo     Done
echo.

echo [3/4] Starting Next.js...
start "NextJS-DevServer" cmd /c "npm run dev"
echo     Waiting 15 seconds...
timeout /t 15 /nobreak >nul
echo.

echo [4/4] Starting Cloudflare Tunnel...
start "Cloudflare-Tunnel" cmd /c "cloudflared.exe tunnel --config ^%USERPROFILE^%\.cloudflared\config.yml run"
echo     Waiting 5 seconds...
timeout /t 5 /nobreak >nul
echo.

echo ========================================
echo  Service Status
echo ========================================
echo.

:: Check Next.js
netstat -ano | findstr ":9999 " | findstr "LISTENING" >nul
if errorlevel 1 (
    echo     Next.js: X Failed
) else (
    echo     Next.js: OK Running
)
echo.

:: Check Tunnel
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I /N "cloudflared.exe">nul
if errorlevel 1 (
    echo     Tunnel:  X Failed
) else (
    echo     Tunnel:  OK Running
)
echo.

echo ========================================
echo  Access URLs:
echo     Local:   http://localhost:9999
echo     Remote: https://bossai.tiankai.it.com
echo ========================================
echo.

echo Start watchdog process?
echo [Y] Yes  [N] No
choice /C YN /N
if errorlevel 2 goto :end
if errorlevel 1 goto :start_watchdog

:start_watchdog
    echo.
    echo Starting watchdog...
    call watchdog.bat
    goto :eof

:end
    echo.
    echo Press any key to exit...
    pause >nul
