@echo off
echo 正在停止服務...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo 正在啟動服務...
start "" npm run dev

echo 服務已啟動！
pause
