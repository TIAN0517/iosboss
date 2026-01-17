@echo off
chcp 65001 > nul
echo ===============================================
echo   等待 Docker Desktop 安裝完成
echo ===============================================
echo.

echo 請先完成 Docker Desktop 的安裝...
echo.

:check_install
echo 檢查安裝狀態...
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo ✅ Docker Desktop 已安裝
    goto :start_docker
) else (
    echo ⏳ 還在安裝中，等待 10 秒...
    timeout /t 10 /nobreak > nul
    goto :check_install
)

:start_docker
echo.
echo ===============================================
echo   啟動 Docker Desktop
echo ===============================================
echo.
echo [1/3] 啟動 Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo [2/3] 等待 Docker 就緒（約 60 秒）...
timeout /t 60 /nobreak

echo [3/3] 檢查 Docker 狀態...
docker ps > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker 已就緒！
    goto :start_services
) else (
    echo ⏳ Docker 還在啟動中，再等 30 秒...
    timeout /t 30 /nobreak
    goto :check_docker_again
)

:check_docker_again
docker ps > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker 已就緒！
    goto :start_services
) else (
    echo ❌ Docker 啟動失敗，請手動檢查
    pause
    exit /b 1
)

:start_services
echo.
echo ===============================================
echo   啟動 LINE Bot 服務
echo ===============================================
echo.
cd /d "%~dp0"
docker-compose down 2>nul
docker-compose build line-bot-ai
docker-compose up -d line-bot-ai

echo.
echo ===============================================
echo   服務狀態
echo ===============================================
docker ps

echo.
echo ===============================================
echo   查看即時日誌
echo ===============================================
echo 執行: docker logs -f line-bot-ai
echo.
echo ✅ 完成！
echo.
pause
