@echo off
chcp 65001 >nul
echo ========================================
echo Nine Nine Gas - Start Migration
echo ========================================
echo.

echo [1/5] Checking pre-migration status...
echo.
powershell -ExecutionPolicy Bypass -File check-migration-status.ps1
echo.
echo Press any key to continue export...
pause >nul

echo.
echo [2/5] Exporting Docker database...
echo.
powershell -ExecutionPolicy Bypass -File export-docker-db.ps1
echo.
echo Press any key to open migration guide...
pause >nul

echo.
echo [3/5] Opening migration guide...
echo.
start "" MIGRATION_TO_VERCEL_SUPABASE.md

echo.
echo ========================================
echo [OK] Preparation complete!
echo ========================================
echo.
echo Next steps, follow the migration guide:
echo.
echo 1. Create Supabase project
echo 2. Import data to Supabase
echo 3. Deploy to Vercel
echo 4. Configure environment variables
echo 5. Verify deployment
echo.
echo Migration guide has been opened in browser
echo.
pause
