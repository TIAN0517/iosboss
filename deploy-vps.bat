@echo off
echo ========================================
echo 部署到 VPS: 107.172.46.245
echo ========================================

echo 1. 壓縮專案...
tar -cvf deploy.tar ^
  --exclude=node_modules ^
  --exclude=.next ^
  --exclude=.git ^
  --exclude=logs ^
  --exclude=*.log ^
  --exclude=.env ^
  .

echo 2. 上傳到 VPS...
pscp -r -P 22 -i "C:\Users\tian7\.ssh\id_rsa.ppk" deploy.tar root@107.172.46.245:/root/

echo 3. 在 VPS 上部署...
ssh -i "C:\Users\tian7\.ssh\id_rsa.ppk" root@107.172.46.245 << 'REMOTE'
  cd /root
  echo 停止現有服務...
  pm2 stop gas-station || true
  pm2 delete gas-station || true
  
  echo 解壓並部署...
  tar -xf deploy.tar
  npm install --production
  
  echo 重新啟動...
  pm2 start npm --name "gas-station" -- run start
  pm2 save
  
  echo 清理...
  rm -f deploy.tar
  
  echo 完成！檢查狀態...
  pm2 status
REMOTE

echo ========================================
echo 部署完成！
echo 訪問: https://bossai.tiankai.it.com
echo ========================================
