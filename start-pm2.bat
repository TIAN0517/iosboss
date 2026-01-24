@echo off
REM PM2 服務啟動腳本
echo ====================================
echo PM2 守護進程啟動中...
echo ====================================
cd /d C:\Users\tian7\OneDrive\Desktop\媽媽ios
pm2 resume
pm2 list
echo.
echo ====================================
echo 服務已啟動！
echo ====================================
pause
