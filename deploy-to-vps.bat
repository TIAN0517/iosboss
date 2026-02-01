@echo off
chcp 65001 >nul
echo ========================================
echo 部署到 VPS: 107.172.46.245
echo ========================================

echo [1/4] 停止現有 PM2 服務...
ssh -o StrictHostKeyChecking=no root@107.172.46.245 "pm2 stop gas-station 2>nul || echo 服務已停止"

echo [2/4] 推送代碼並部署...
ssh -o StrictHostKeyChecking=no root@107.172.46.245 << 'REMOTE_SCRIPT'
  cd /root/媽媽ios

  echo 拉取最新代碼...
  git pull origin main

  echo 安裝依賴...
  npm install --production

  echo 重新啟動服務...
  pm2 restart gas-station || pm2 start npm --name "gas-station" -- run start
  pm2 save

  echo 清理...
  rm -rf .next/cache

  echo 完成！服務狀態：
  pm2 status
REMOTE_SCRIPT

echo ========================================
echo 部署完成！
echo 訪問: https://bossai.tiankai.it.com
echo ========================================
pause
