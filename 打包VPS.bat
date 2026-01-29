@echo off
chcp 65001 >nul
echo 正在打包專案...

set "source=C:\Users\tian7\OneDrive\Desktop\媽媽ios"
set "dest=C:\Users\tian7\OneDrive\Desktop\九九瓦斯行管理系統_VPS_%date:~0,4%%date:~5,2%%date:~8,2%.zip"

echo 來源: %source%
echo 目標: %dest%

REM 切換到來源目錄然後打包
cd /d "%source%"
powershell -Command "$source = '%source%'; $dest = '%dest%'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory($source, $dest); Write-Host '完成!'"

if exist "%dest%" (
    echo 打包成功!
    echo 檔案位置: %dest%
    dir "%dest%"
) else (
    echo 打包失敗!
)
pause
