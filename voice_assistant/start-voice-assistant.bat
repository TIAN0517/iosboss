@echo off
chcp 65001 > nul
echo ========================================
echo 豆包語音助手啟動程序
echo ========================================
echo.

cd /d "%~dp0"

if not exist "node_modules" (
    echo [安裝] 檢測到首次啟動，正在安裝依賴...
    echo.
    call npm install
    echo.
    echo [安裝] 依賴安裝完成！
    echo.
)

echo [啟動] 正在啟動豆包語音助手開發服務器...
echo.
echo ========================================
echo 豆包語音助手將在瀏覽器中自動打開
echo 如果沒有自動打開，請訪問：http://localhost:3001
echo 按 Ctrl+C 可以停止服務器
echo ========================================
echo.

call npm run dev

if errorlevel 1 (
    echo.
    echo [錯誤] 啟動失敗，請檢查錯誤訊息
    echo.
    pause
)