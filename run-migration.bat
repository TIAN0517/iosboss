@echo off
chcp 65001 >nul
echo ===========================================
echo SQL Server to PostgreSQL 轉換工具
echo ===========================================

REM 檢查是否有 node_modules/mssql
if exist "node_modules\mssql" (
    echo ✅ mssql 已安裝
    node scripts/sqlserver-to-postgres.js
) else (
    echo 📦 安裝 mssql 中...
    npm install mssql --legacy-peer-deps
    if errorlevel 1 (
        echo ❌ 安裝失敗
        pause
        exit /b 1
    )
    echo ✅ 安裝完成，執行轉換...
    node scripts/sqlserver-to-postgres.js
)

pause
