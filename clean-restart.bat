@echo off
chcp 65001 >nul
echo 正在停止服務...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9999 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul

echo 正在清除 Next.js 緩存...
if exist ".next" rmdir /s /q ".next"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

echo 正在重新生成 Prisma Client...
call npx prisma generate

echo 正在啟動服務...
cd /d "%~dp0"
start /B cmd /c "npm run dev > dev.log 2>&1"

echo.
echo ========================================
echo   清理完成，正在重新編譯...
echo   請稍等約 15 秒後訪問
echo   http://localhost:9999
echo ========================================
echo.
timeout /t 5
exit
