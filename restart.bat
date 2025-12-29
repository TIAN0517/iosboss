@echo off
REM ========================================
REM 快速重啟腳本
REM ========================================

echo.
echo [重啟服務]...
docker-compose --env-file .env.docker restart

echo.
echo 服務已重啟
echo.
pause
