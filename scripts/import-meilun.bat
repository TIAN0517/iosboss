@echo off
chcp 65001 >nul
echo ============================================
echo Import Meilun data to PostgreSQL using COPY
echo ============================================
echo.

set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=postgres
set PGUSER=postgres
set PGPASSWORD=Ss520520

set PGPATH=C:\Program Files\PostgreSQL\16\bin\psql.exe
set CSVFILE=C:\Users\tian7\Desktop\customers_meilun.csv

echo Deleting old data...
"%PGPATH%" -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -c "DELETE FROM customers_meilun;"
echo.

echo Importing CSV using COPY...
"%PGPATH%" -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -c "\COPY customers_meilun FROM '%CSVFILE%' WITH (FORMAT CSV, HEADER true)"
echo.

echo Verifying...
"%PGPATH%" -h %PGHOST% -p %PGPORT% -d %PGDATABASE% -U %PGUSER% -t -c "SELECT COUNT(*) FROM customers_meilun;"
echo.

echo ============================================
pause
