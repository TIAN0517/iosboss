@echo off
echo Adding firewall rules for Cloudflare Tunnel...

REM Allow cloudflared to make outbound connections
netsh advfirewall firewall add rule name="Cloudflare Tunnel Outbound" dir=out action=allow program="C:\Users\tian7\OneDrive\Desktop\媽媽ios\cloudflared.exe" enable=yes >nul 2>&1

REM Allow cloudflared to receive inbound connections
netsh advfirewall firewall add rule name="Cloudflare Tunnel Inbound" dir=in action=allow program="C:\Users\tian7\OneDrive\Desktop\媽媽ios\cloudflared.exe" enable=yes >nul 2>&1

REM Allow Next.js dev server
netsh advfirewall firewall add rule name="Next.js Dev Server" dir=in action=allow protocol=TCP localport=9999 enable=yes >nul 2>&1

echo Firewall rules added successfully.
echo.
echo Trying to restart Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 >nul
start "" cloudflared.exe tunnel --config cloudflared.yml run

echo Cloudflare Tunnel restarted.
echo Please wait 10 seconds for connection to establish.
timeout /t 10 >nul

echo Testing external access...
curl -s -I https://bossai.tiankai.it.com | findstr "HTTP"
echo.
echo Done! Press any key to exit...
pause >nul
