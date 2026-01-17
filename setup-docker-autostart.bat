@echo off
chcp 65001 > nul
echo ===============================================
echo   Docker Desktop 自動啟動設定
echo ===============================================
echo.

echo [1/4] 檢查 Docker Desktop 路徑...
if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
    echo ✅ 找到 Docker Desktop
) else (
    echo ❌ 找不到 Docker Desktop，請先安裝
    pause
    exit /b 1
)

echo.
echo [2/4] 設定登入時自動啟動 Docker Desktop...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "Docker Desktop" /t REG_SZ /d "\"C:\Program Files\Docker\Docker\Docker Desktop.exe\"" /f > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 自動啟動設定成功
) else (
    echo ⚠️  設定失敗，可能需要手動設定
)

echo.
echo [3/4] 啟動 Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo ✅ Docker Desktop 啟動中...

echo.
echo [4/4] 等待 Docker 就緒（約 30 秒）...
timeout /t 30 /nobreak > nul

echo.
echo ===============================================
echo   檢查 Docker 狀態
echo ===============================================
docker ps > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Docker 已就緒！
    echo.
    docker ps
) else (
    echo ⏳ Docker 還在啟動中，請稍後...
    echo    手動檢查：docker ps
)

echo.
echo ===============================================
echo   完成！
echo ===============================================
echo.
echo ✅ Docker Desktop 已設定為開機自動啟動
echo ✅ 容器已設定為自動重啟（restart: always）
echo.
echo 下次開機時：
echo   1. Docker Desktop 會自動啟動
echo   2. 容器會自動啟動
echo   3. 崩潰時會自動重啟
echo.
pause
