@echo off
chcp 65001 >nul
echo ==============================================
echo   重啟所有服務脚本
echo ==============================================
echo.

set VPS_HOST=107.172.46.245
set VPS_USER=root
set SSH_KEY=%USERPROFILE%\.ssh\id_ed25519

echo [1/3] 連接伺服器並更新程式碼...
ssh -o StrictHostKeyChecking=no -i "%SSH_KEY%" %VPS_USER%@%VPS_HOST% "cd /root/媽媽ios && git pull origin main" 2>&1

echo.
echo [2/3] 重新建置並重啟服務...
ssh -o StrictHostKeyChecking=no -i "%SSH_KEY%" %VPS_USER%@%VPS_HOST% "cd /root/媽媽ios/gas-project && npm install && npm run build && pm2 restart gas-shop && pm2 restart mama-ios-backend" 2>&1

echo.
echo [3/3] 檢查服務狀態...
ssh -o StrictHostKeyChecking=no -i "%SSH_KEY%" %VPS_USER%@%VPS_HOST% "pm2 status" 2>&1

echo.
echo ==============================================
echo   完成！請手動清除瀏覽器緩存
echo ==============================================
pause
