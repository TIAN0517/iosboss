@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ================================================
echo   資料庫重置工具
echo ================================================
echo.
echo 正在重置資料庫...
echo.

REM 設定環境變數並執行
set PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=yes

call npx prisma db push --force-reset --skip-generate

if %errorlevel% neq 0 (
    echo.
    echo ❌ 資料庫重置失敗！
    pause
    exit /b 1
)

echo.
echo ✅ 資料庫重置完成！
echo.
echo 正在建立測試帳號...
echo.

call npm run db:seed

if %errorlevel% neq 0 (
    echo.
    echo ❌ 建立測試帳號失敗！
    pause
    exit /b 1
)

echo.
echo ================================================
echo   ✅ 所有設定完成！
echo ================================================
echo.
echo 📋 測試帳號：
echo    admin    / Uu19700413  (管理員)
echo    bossjy   / ji394su3@@  (超級管理員)
echo    staff    / staff123    (員工)
echo.
echo 🌐 登入網址：http://localhost:3000/login
echo.
pause
