@echo off
REM ========================================
REM Windows 任務計劃器安裝腳本（管理員模式）
REM 九九瓦斯行管理系統
REM ========================================

echo.
echo ========================================
echo   Windows 任務計劃器安裝
echo ========================================
echo.

REM 檢查是否已經是管理員
net session >nul 2>&1
if %errorlevel% equ 0 (
    echo [✓] 已經是管理員模式
    echo.
) else (
    echo [!] 請求管理員權限...
    echo.
    
    REM 請求 UAC 提權
    PowerShell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile', '-ExecutionPolicy Bypass', '-File', '%~dp0install-task.ps1' -Verb RunAs"
    echo.
    echo 安裝腳本將以管理員身份運行...
    echo.
    pause
    goto :end
)

REM 直接運行 PowerShell 腳本
echo [1/2] 運行安裝腳本...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-task.ps1"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   安裝完成！
    echo ========================================
    echo.
    echo 現在當您：
    echo   1. 重啟電腦時
    echo   2. 重新登錄時
    echo.
    echo 系統會自動啟動監控守護進程！
    echo.
    echo 手動管理任務：
    echo   • 查看任務: taskschd.msc
    echo   • 運行任務: schtasks /run /tn "JYT-Gas-Services-Monitor"
    echo   • 卸載任務: 運行 .\install-task.ps1 -Uninstall
    echo.
) else (
    echo.
    echo ========================================
    echo   安裝失敗！
    echo ========================================
    echo.
    echo 請檢查錯誤訊息並重試。
    echo.
)

pause

:end
