@echo off
chcp 65001 > nul
cls

echo ===============================================
echo   部署到 Vercel（免費）
echo ===============================================
echo.
echo   這將會：
echo   1. 構建 Next.js 應用
echo   2. 部署到 Vercel
echo   3. 使用 Supabase 作為備份數據庫
echo.
echo   ⚠️  注意：
echo   - 本地數據庫是主數據庫
echo   - 雲端只做讀取/備份
echo   - 需要先註冊 Vercel 和 Supabase
echo.

cd /d "%~dp0.."

set /p confirm="確定要部署嗎？(y/N): "
if /i not "%confirm%"=="y" (
    echo 已取消
    pause
    exit /b 0
)

echo.
echo [1/5] 檢查環境...

:: 檢查 Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo ✗ 未安裝 Node.js
    pause
    exit /b 1
)
echo ✓ Node.js 已安裝

:: 檢查 npm
where npm >nul 2>&1
if errorlevel 1 (
    echo ✗ 未安裝 npm
    pause
    exit /b 1
)
echo ✓ npm 已安裝

:: 檢查 Vercel CLI
where vercel >nul 2>&1
if errorlevel 1 (
    echo.
    echo 📦 安裝 Vercel CLI...
    call npm install -g vercel
    if errorlevel 1 (
        echo ✗ 安裝失敗
        pause
        exit /b 1
    )
)
echo ✓ Vercel CLI 已安裝

echo.
echo [2/5] 構建應用...

call npm run build
if errorlevel 1 (
    echo ✗ 構建失敗
    pause
    exit /b 1
)

echo ✓ 構建完成

echo.
echo [3/5] 登入 Vercel...

call vercel login
if errorlevel 1 (
    echo ✗ 登入失敗
    pause
    exit /b 1
)

echo ✓ 已登入

echo.
echo [4/5] 部署到 Vercel...

echo.
echo 💡 請按照提示操作：
echo   - 選擇：Set up and deploy
echo   - 項目名稱：bossai-99（或自訂）
echo   - 框架：Next.js
echo   - 根目錄：./
echo.

call vercel --prod
if errorlevel 1 (
    echo ✗ 部署失敗
    pause
    exit /b 1
)

echo ✓ 部署完成

echo.
echo [5/5] 設置環境變量...

echo.
echo ⚠️  重要：需要在 Vercel Dashboard 設置以下環境變量
echo.
echo   1. DATABASE_URL (Supabase 連接字串)
echo   2. DIRECT_URL (Supabase 直連字串)
echo   3. NEXT_PUBLIC_SUPABASE_URL
echo   4. NEXT_PUBLIC_SUPABASE_KEY
echo   5. GLM_API_KEY (AI 功能)
echo   6. LINE_CHANNEL_ACCESS_TOKEN (LINE Bot)
echo.
echo   📖 詳細說明請參考：FREE_DEPLOYMENT_LOCAL_FIRST.md
echo.

echo ===============================================
echo   部署完成！
echo ===============================================
echo.
echo   🌐 應用已部署到 Vercel
echo.
echo   💡 下一步：
echo   1. 在 Vercel Dashboard 設置環境變量
echo   2. 設置 Supabase 數據庫
echo   3. 測試應用功能
echo.
echo   📋 管理面板：
echo   https://vercel.com/dashboard
echo.
pause
