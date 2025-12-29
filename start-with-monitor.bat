@echo off
REM ========================================
REM 九九瓦斯行 - 持久性啟動腳本
REM 包含服務監控守護進程
REM ========================================

echo.
echo ========================================
echo   九九瓦斯行 - 持久性啟動
echo ========================================
echo.
echo [功能] 啟動所有服務 + 監控守護進程
echo.

REM 切換到腳本目錄
cd /d "%~dp0"

REM 檢查 Docker
echo [1/4] 檢查 Docker 狀態...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] Docker 未運行，正在啟動 Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo [提示] 等待 Docker Desktop 啟動（約 20 秒）...
    timeout /t 20 /nobreak
)

REM 檢查 Docker 是否已啟動
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [錯誤] Docker 無法啟動！請手動檢查 Docker Desktop
    echo.
    pause
    exit /b 1
)

echo [✓] Docker 運行正常
echo.

REM 啟動服務
echo [2/4] 啟動 Docker 服務...
docker compose --env-file .env.docker up -d
if %errorlevel% neq 0 (
    echo [錯誤] 服務啟動失敗！
    echo.
    docker compose logs --tail 50
    echo.
    pause
    exit /b 1
)
echo [✓] 服務已啟動
echo.

REM 等待服務就緒
echo [3/4] 等待服務就緒（30 秒）...
timeout /t 30 /nobreak

REM 檢查服務狀態
echo [4/4] 檢查服務健康狀態...
echo.
docker compose ps
echo.

REM 檢查所有容器是否運行
docker ps --filter "name=jyt-gas" --format "table {{.Names}}\t{{.Status}}" | findstr "jyt-gas"
echo.

REM 計算運行的容器數量
set running_count=0
for /f %%i in ('docker ps --filter "name=jyt-gas" --format "{{.Names}}" ^| find /c /v ""') do set running_count=%%i

if %running_count% geq 4 (
    echo [✓] 所有服務運行正常！
) else (
    echo [警告] 部分服務未運行（僅 %running_count%/4）
    echo.
    echo 查看詳細日誌:
    docker compose logs --tail 50
)

echo.
echo ========================================
echo   持久性監控模式
echo ========================================
echo.
echo 正在啟動監控守護進程...
echo.
echo [監控功能]
echo   ✓ 自動檢測停止的容器
echo   ✓ 自動重啟停止的服務
echo   ✓ 檢查 Docker 運行狀態
echo   ✓ 每天清理舊日誌（保留 7 天）
echo   ✓ 檢查間隔: 30 秒
echo.
echo [日誌位置]
echo   監控日誌: logs\monitor.log
echo   服務日誌: docker compose logs -f
echo.
echo [重要提示]
echo   • 不要關閉此窗口，關閉會停止監控
echo   • 按 Ctrl+C 停止監控（服務會繼續運行）
echo   • 監控會在後台持續運行並保護服務
echo.
echo ========================================
echo.

REM 啟動 PowerShell 監控腳本（後台運行）
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0monitor-services.ps1"

REM 如果監控意外退出
echo.
echo [警告] 監控守護進程已退出！
echo.
echo 服務可能仍在運行，請檢查:
echo   docker compose ps
echo.
pause
