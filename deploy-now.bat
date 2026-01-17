@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   LINE Bot 自動部署
echo ===============================================
echo.

REM 檢查 Docker Desktop
if not exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo ❌ Docker Desktop 尚未安裝
    echo 請先執行 Docker-Desktop-Installer.exe 完成安裝
    echo.
    pause
    exit /b 1
)

echo ✅ 找到 Docker Desktop
echo.

REM 啟動 Docker Desktop
echo [1/5] 啟動 Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

REM 等待 Docker 就緒
echo [2/5] 等待 Docker 就緒...
set /a count=0
:wait_loop
set /a count+=1
docker ps >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker 已就緒！（嘗試 %count% 次）
    goto :docker_ready
)
if %count% geq 30 (
    echo ❌ Docker 啟動逾時，請手動檢查
    pause
    exit /b 1
)
echo ⏳ 等待中... (%count%/30)
timeout /t 2 /nobreak >nul
goto :wait_loop

:docker_ready
echo.
echo [3/5] 停止舊容器...
docker-compose down 2>nul

echo [4/5] 建構新容器...
docker-compose build line-bot-ai

echo [5/5] 啟動容器...
docker-compose up -d line-bot-ai

echo.
echo ===============================================
echo   部署完成
echo ===============================================
echo.
echo 服務狀態：
docker ps

echo.
echo 日誌：
docker logs line-bot-ai --tail 20

echo.
echo ✅ 完成！服務已啟動
echo.
echo 重要提示：
echo 1. 請在員工群組發送一則訊息（抓取群組 ID）
echo 2. Docker Desktop 已設定為開機自動啟動
echo 3. 容器會自動重啟
echo.
pause
