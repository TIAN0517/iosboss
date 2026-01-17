@echo off
echo Testing Cloudflare Tunnel...
echo.

cloudflared.exe tunnel run --config cloudflared.yml

pause
