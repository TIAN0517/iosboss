@echo off
chcp 65001 >nul
echo ============================================
echo 恢復 SQL Server 備份數據庫
echo ============================================
echo.

echo 正在恢復美崙站 (99999.bak)...
echo.

"C:\Program Files\Microsoft SQL Server\160\Tools\Binn\sqlcmd" -S BOSSJY\BOSSJY -E -i "C:\Users\tian7\OneDrive\Desktop\媽媽ios\scripts\restore-meilun.sql"

if %errorlevel% equ 0 (
    echo.
    echo ✅ 美崙站恢復成功！
) else (
    echo.
    echo ❌ 美崙站恢復失敗！
    echo 嘗試使用完整腳本...
    "C:\Program Files\Microsoft SQL Server\160\Tools\Binn\sqlcmd" -S BOSSJY\BOSSJY -E -i "C:\Users\tian7\OneDrive\Desktop\媽媽ios\scripts\restore-databases.sql"
)

echo.
echo ============================================
pause
