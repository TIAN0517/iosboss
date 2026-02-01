@echo off
chcp 65001 >nul
echo ============================================
echo 匯出美崙站客戶數據到 CSV
echo ============================================
echo.

echo 正在匯出 CPF47.dbo.Cust 到 CSV...
echo.

"C:\Program Files\Microsoft SQL Server\160\Tools\Binn\sqlcmd" -S BOSSJY\BOSSJY -E -d CPF47 -s "," -W -Q "SELECT * FROM Cust" -o "C:\Users\tian7\OneDrive\Desktop\媽媽ios\backups\migration\customers.csv"

if %errorlevel% equ 0 (
    echo.
    echo ✅ 匯出成功！
    echo 檔案: C:\Users\tian7\OneDrive\Desktop\媽媽ios\backups\migration\customers.csv
    echo.
    echo 請告訴我，然後我來匯入到 PostgreSQL
) else (
    echo.
    echo ❌ 匯出失敗
)

echo.
pause
