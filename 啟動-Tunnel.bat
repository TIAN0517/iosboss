@echo off
echo Starting Cloudflare Tunnel...
cloudflared.exe tunnel --config cloudflared.yml run
pause
