@echo off
echo ========================================
echo   Cloudflare Tunnel - Auto Restart
echo ========================================
echo.

:START
echo [%TIME%] Starting Cloudflare Tunnel...
cloudflared.exe tunnel run --token eyJhIjoiMjk0ZWE4NTM5ZDRkMTc5MzRjZTA5NDM4ZDdjMDE5NjciLCJzIjoiWTJJd1pUUmxaVFl0WWpreE5pMDBaRE0yTFdFNFlUSXRZVGMyT0RZM01UQXdObUZtIiwidCI6IjZiOTc1ODUzLWQ2OGEtNDI2Mi05ODcwLWJjMTBhYWRlMjc1OSJ9

echo [%TIME%] Tunnel disconnected! Reconnecting in 5 seconds...
timeout /t 5 /nobreak >nul
goto START
