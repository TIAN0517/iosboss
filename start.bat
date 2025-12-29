@echo off
REM ========================================
REM 快速啟動腳本 - 一鍵部署
REM ========================================

echo.
echo ========================================
echo   九九瓦斯行 - 一鍵啟動
echo ========================================
echo.

REM 檢查 Docker
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [錯誤] Docker 未運行，正在啟動 Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    timeout /t 20 /nobreak
)

echo [1/3] 構建鏡像...
docker-compose --env-file .env.docker build

echo [2/3] 啟動服務...
docker-compose --env-file .env.docker up -d

echo [3/3] 等待就緒...
timeout /t 10 /nobreak

echo.
echo ========================================
echo   啟動完成！
echo ========================================
echo.
echo 本地訪問: http://localhost:9999
echo 外網訪問: https://bossai.jytian.it.com
echo.
echo 查看日誌: docker-compose --env-file .env.docker logs -f
echo.
pause
