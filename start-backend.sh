#!/bin/bash
# PM2 啟動腳本 - 媽媽ios 後台系統
# 確保 Prisma client 正確生成後啟動服務

cd /root/媽媽ios

# 重新生成 Prisma client
npx prisma generate

# 啟動服務
pm2 restart mama-ios-backend || pm2 start 'npm run start' --name mama-ios-backend

echo "服務啟動完成！"
pm2 list
