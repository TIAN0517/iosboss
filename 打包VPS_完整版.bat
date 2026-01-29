@echo off
chcp 65001 >nul
echo ============================================
echo    九九瓦斯行管理系統 - VPS打包程式
echo ============================================
echo.

set "source=C:\Users\tian7\OneDrive\Desktop\媽媽ios"
set "date_str=%date:~0,4%%date:~5,2%%date:~8,2%"
set "dest=C:\Users\tian7\OneDrive\Desktop\九九瓦斯行管理系統_VPS_%date_str%.zip"

echo [1/4] 檢查來源目錄...
if not exist "%source%" (
    echo 錯誤: 來源目錄不存在!
    pause
    exit /b 1
)
echo      來源: %source%

echo.
echo [2/4] 清理舊檔案...
if exist "%dest%" del "%dest%" 2>nul

echo.
echo [3/4] 正在壓縮檔案...
echo      目標: %dest%
echo      請稍候，這可能需要幾分鐘...

REM 使用 PowerShell 進行壓縮
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$source = '%source%'; " ^&
    "$dest = '%dest%'; " ^&
    "Add-Type -AssemblyName System.IO.Compression.FileSystem; " ^&
    "[System.IO.Compression.ZipFile]::CreateFromDirectory(\$source, \$dest, [System.IO.Compression.CompressionLevel]::Optimal, \$false); " ^&
    "Write-Host '壓縮完成!'"

echo.
echo [4/4] 驗證結果...
if exist "%dest%" (
    echo.
    echo ============================================
    echo    打包成功!
    echo ============================================
    echo.
    echo 檔案位置: %dest%
    echo.
    for %%I in ("%dest%") do echo 檔案大小: %~zI bytes
    echo.
) else (
    echo.
    echo 錯誤: 打包失敗!
    echo 請手動執行以下命令:
    echo powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('%source%', '%dest%')"
)
pause
