@echo off
REM ========================================
REM 九九瓦斯行管理系統 - Docker 部署腳本
REM Jy技術團隊 • 2025
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   九九瓦斯行管理系統 - Docker 部署
echo ========================================
echo.

REM 檢查 Docker 是否運行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [錯誤] Docker 未運行，請先啟動 Docker Desktop
    pause
    exit /b 1
)

REM 設置環境變量
set ENV_FILE=.env.docker
if not exist %ENV_FILE% (
    echo [錯誤] 找不到 %ENV_FILE%
    pause
    exit /b 1
)

REM 選擇操作
echo 請選擇操作：
echo   1. 構建並啟動所有服務 (首次部署)
echo   2. 停止所有服務
echo   3. 重啟所有服務
echo   4. 查看服務狀態
echo   5. 查看日誌
echo   6. 清理並重新部署
echo   7. 完全清理 (包括數據)
echo.

set /p choice=請輸入選項 (1-7):

if "%choice%"=="1" goto deploy
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto status
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto clean_rebuild
if "%choice%"=="7" goto full_clean

echo [錯誤] 無效的選項
pause
exit /b 1

:deploy
echo.
echo [步驟 1/3] 構建 Docker 鏡像...
docker-compose --env-file %ENV_FILE% build
if %errorlevel% neq 0 (
    echo [錯誤] 構建失敗
    pause
    exit /b 1
)

echo.
echo [步驟 2/3] 啟動服務...
docker-compose --env-file %ENV_FILE% up -d
if %errorlevel% neq 0 (
    echo [錯誤] 啟動失敗
    pause
    exit /b 1
)

echo.
echo [步驟 3/3] 等待服務就緒...
timeout /t 10 /nobreak

echo.
echo ========================================
echo   部署完成！
echo ========================================
echo.
echo 服務訪問地址：
echo   本地: http://localhost:9999
echo   Cloudflare Tunnel: https://bossai.jytian.it.com
echo.
echo 使用 "選項 4" 查看服務狀態
echo.
pause
exit /b 0

:stop
echo.
echo [停止服務]...
docker-compose --env-file %ENV_FILE% down
echo.
echo 服務已停止
echo.
pause
exit /b 0

:restart
echo.
echo [重啟服務]...
docker-compose --env-file %ENV_FILE% restart
echo.
echo 服務已重啟
echo.
pause
exit /b 0

:status
echo.
echo ========================================
echo   服務狀態
echo ========================================
echo.
docker-compose --env-file %ENV_FILE% ps
echo.
pause
exit /b 0

:logs
echo.
echo ========================================
echo   實時日誌 (Ctrl+C 退出)
echo ========================================
echo.
docker-compose --env-file %ENV_FILE% logs -f --tail=100
exit /b 0

:clean_rebuild
echo.
echo [清理並重新部署]
echo.
echo [1/4] 停止並刪除容器...
docker-compose --env-file %ENV_FILE% down

echo [2/4] 刪除舊鏡像...
docker-compose --env-file %ENV_FILE% build --no-cache

echo [3/4] 清理 Docker 緩存...
docker system prune -f

echo [4/4] 重新構建並啟動...
docker-compose --env-file %ENV_FILE% up -d --build

echo.
echo ========================================
echo   重新部署完成！
echo ========================================
echo.
pause
exit /b 0

:full_clean
echo.
echo ========================================
echo   ⚠️  警告：將刪除所有數據！
echo ========================================
echo.
set /p confirm=確認刪除所有數據？(yes/no):
if /i not "%confirm%"=="yes" (
    echo 已取消
    pause
    exit /b 0
)

echo.
echo [完全清理]...
docker-compose --env-file %ENV_FILE% down -v
docker system prune -af --volumes
docker volume prune -f

echo.
echo 所有容器、鏡像、卷已刪除
echo.
pause
exit /b 0
