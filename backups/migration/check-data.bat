@echo off
chcp 65001 >nul
echo ============================================
echo 檢查資料匯入狀態
echo ============================================
echo.

"c:\Program Files\PostgreSQL\16\bin\psql.exe" -h localhost -p 5432 -d postgres -U postgres -c "SELECT 'customers_meilun' as table_name, COUNT(*) as row_count FROM customers_meilun UNION ALL SELECT 'customers_ji_an', COUNT(*) FROM customers_ji_an;"

echo.
echo ============================================
pause
