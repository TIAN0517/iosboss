@echo off
chcp 65001 > nul

set "BACKUP_DIR=C:\BossAI-Backups"
set "ONE_DRIVE=C:\Users\%USERNAME%\OneDrive\BossAI-Backups"

echo ===============================================
echo   備份狀態檢查
echo ===============================================
echo.

echo 📁 本地備份:
echo.
if exist "%BACKUP_DIR%" (
    if exist "%BACKUP_DIR%\bossai-backup-*.json" (
        for /f "delims=" %%i in ('dir "%BACKUP_DIR%\bossai-backup-*.json" /B /O-D /A-D 2^>nul') do (
            set "latest=%%i"
            goto :found_local
        )
        :found_local
        echo    最新備份: !latest!
        for %%A in ("%BACKUP_DIR%\!latest!") do (
            set "size=%%~zA"
            set /a sizeMB=!size! / 1048576
            echo    大小: !sizeMB! MB
            echo    日期: %%~tA
        )
    ) else (
        echo    (沒有找到備份檔案)
    )
) else (
    echo    (備份目錄不存在)
)

echo.
echo ☁️ OneDrive 異地備份:
echo.
if exist "%ONE_DRIVE%" (
    if exist "%ONE_DRIVE%\bossai-backup-*.json" (
        for /f "delims=" %%i in ('dir "%ONE_DRIVE%\bossai-backup-*.json" /B /O-D /A-D 2^>nul') do (
            set "latest_one=%%i"
            goto :found_one
        )
        :found_one
        echo    最新備份: !latest_one!
        for %%A in ("%ONE_DRIVE%\!latest_one!") do (
            set "size_one=%%~zA"
            set /a sizeMB_one=!size_one! / 1048576
            echo    大小: !sizeMB_one! MB
            echo    日期: %%~tA
        )
    ) else (
        echo    (OneDrive 沒有備份)
    )
) else (
    echo    (OneDrive 未配置或未同步)
)

echo.
echo 📊 備份統計:
echo.

:: 計算本地備份數量
set count=0
if exist "%BACKUP_DIR%\bossai-backup-*.json" (
    for /f %%i in ('dir "%BACKUP_DIR%\bossai-backup-*.json" 2^>nul ^| find /c ".json"') do set count=%%i
)
echo    本地備份數量: %count%

:: 計算 OneDrive 備份數量
set count_one=0
if exist "%ONE_DRIVE%\bossai-backup-*.json" (
    for /f %%i in ('dir "%ONE_DRIVE%\bossai-backup-*.json" 2^>nul ^| find /c ".json"') do set count_one=%%i
)
echo    OneDrive 備份數量: %count_one%

echo.
echo 💾 磁碟空間:
echo.
for /f "tokens=2" %%a in ('fsinfo volume ^| find "C:"') do set freespace=%%a
echo    C: 剩餘空間可用

echo.
echo ===============================================
echo   備份建議:
echo ===============================================
echo.
if %count% GTR 7 (
    echo    ✓ 本地備份充足 (共 %count% 個)
    echo    → 可以考慮清理舊備份
) else if %count% GTR 0 (
    echo    ! 本地備份正常 (共 %count% 個)
) else (
    echo    ✗ 本地沒有備份！
    echo    → 請立即執行 simple-backup.bat
)

if %count_one% GTR 0 (
    echo    ✓ 異地備份正常 (共 %count_one% 個)
) else (
    echo    ! 沒有異地備份
    echo    → 請確保 OneDrive 正在同步
)

echo.
echo ===============================================
echo   快速操作:
echo ===============================================
echo.
echo   [1] 執行備份         simple-backup.bat
echo   [2] 查看待份目錄     explorer "%BACKUP_DIR%"
echo   [3] 查看_OneDrive    explorer "%ONE_DRIVE%"
echo   [4] 設置定時備份     setup-scheduled-backup.bat
echo.
pause
