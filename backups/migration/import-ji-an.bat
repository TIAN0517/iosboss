@echo off
chcp 65001 >nul
echo ============================================
echo PostgreSQL 資料匯入（UTF-8 編碼）
echo ============================================

set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=postgres
set PGUSER=postgres

echo 正在匯入吉安站資料...
echo.

REM 使用 --set=CLIENT_ENCODING=UTF8 確保 psql 使用 UTF-8 編碼
"c:\Program Files\PostgreSQL\16\bin\psql.exe" -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% --set=CLIENT_ENCODING=UTF8 -f "backups\migration\cpf47_ji_an_to_postgres.sql"

if %errorlevel% equ 0 (
    echo.
    echo ✅ 吉安站資料匯入成功！
) else (
    echo.
    echo ❌ 吉安站資料匯入失敗！
)

echo.
echo ============================================
pause
