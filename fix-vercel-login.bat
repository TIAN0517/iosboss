@echo off
echo === 登出當前 Vercel 帳號 ===
vercel logout

echo.
echo === 請使用有 bossjy 團隊權限的帳號登入 ===
echo 即將開啟瀏覽器進行登入...
timeout /t 3

vercel login

echo.
echo === 登入完成，現在可以部署了 ===
echo 請執行: vercel --prod
pause
