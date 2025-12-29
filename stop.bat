@echo off
REM ========================================
REM 快速停止腳本
REM ========================================

echo.
echo [停止服務]...
docker-compose --env-file .env.docker down

echo.
echo 服務已停止
echo.
pause
