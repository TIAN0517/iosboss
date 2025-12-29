@echo off
chcp 65001 >nul
echo ========================================
echo 九九瓦斯行管理系統 - 直接導入到 Supabase
echo ========================================
echo.

echo [1/3] 準備 SQL 文件...
echo.
echo 請輸入 Supabase 數據庫連接 URL：
echo.
set /p SUPABASE_URL=
echo.
echo 💡 提示：從 Supabase Dashboard 獲取連接 URL
echo    https://supabase.com/dashboard
echo    Settings -^> Database -^> Connection String -^> URI
echo.
echo 按下格式輸入（例如）：
echo postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
echo.
pause

echo.
echo [2/3] 準備 Node.js 環境...
echo.
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 錯誤：未找到 Node.js
    echo.
    echo 請先安裝 Node.js：
    echo    https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [3/3] 開始導入...
echo.
echo 正在使用 Node.js 直接連接 Supabase...
echo.
node import-to-supabase-node.js "%SUPABASE_URL%" ".\backups\migration\gas-management-20251229-212901.sql"

if errorlevel 1 (
    echo.
    echo ========================================
    echo ❌ 導入失敗
    echo ========================================
    echo.
    echo 💡 常見錯誤解決方案：
    echo.
    echo 1. 連接 URL 錯誤
    echo    - 檢查 URL 格式是否正確
    echo    - 確保密碼正確
    echo.
    echo 2. SQL 文件問題
    echo    - 文件路徑是否正確
    echo    - 文件是否存在
    echo.
    echo 3. 網絡問題
    echo    - 檢查網絡連接
    echo    - 確保可以訪問 Supabase
    echo.
    pause
    exit /b 1
) else (
    echo.
    echo ========================================
    echo ✅ 導入完成！
    echo ========================================
    echo.
    echo 📝 請驗證數據：
    echo.
    echo 1. 訪問 Supabase Table Editor
    echo    https://supabase.com/dashboard/project/[PROJECT-REF]/editor
    echo.
    echo 2. 執行以下查詢：
    echo.
    echo    SELECT COUNT(*) FROM "User";
    echo    SELECT COUNT(*) FROM "Customer";
    echo    SELECT COUNT(*) FROM "GasOrder";
    echo.
    echo 3. 然後部署到 Vercel
    echo    https://vercel.com/new
    echo.
    pause
)
