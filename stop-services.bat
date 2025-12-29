@echo off
chcp 65001 >nul
REM ========================================
REM JYT Gas Management System - Stop Services
REM ========================================

echo ========================================
echo Stopping all services...
echo ========================================

echo Stopping containers...
docker stop jyt-gas-sync-websocket jyt-gas-call-display jyt-gas-app jyt-gas-postgres 2>nul

echo Removing containers...
docker rm jyt-gas-sync-websocket jyt-gas-call-display jyt-gas-app jyt-gas-postgres 2>nul

echo.
echo All services stopped!
echo To remove data volumes, run: docker volume rm jyt-gas-postgres-data jyt-gas-app-data
echo.
pause
