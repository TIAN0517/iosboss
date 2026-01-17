@echo off
chcp 65001 > nul
cls
echo ===============================================
echo   清理所有舊進程並重新啟動
echo ===============================================
echo.

cd /d "%~dp0"

echo [清理] 停止所有 node.exe 和 python.exe...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 3 /nobreak >nul
echo    ✓ 所有舊進程已停止
echo.

echo [啟動] Next.js (端口 9999)...
start "NextJS" /MIN cmd /c "npm run dev"
timeout /t 8 /nobreak >nul

echo [啟動] Python AI (端口 8888)...
start "PythonAI" /MIN cmd /c "cd line_bot_ai && python -m uvicorn app.main:app --host 0.0.0.0 --port 8888"
timeout /t 8 /nobreak >nul

echo [啟動] Cloudflare Tunnel...
start "Tunnel" /MIN cloudflared.exe tunnel run --token eyJhIjoiMjk0ZWE4NTM5ZDRkMTc5MzRjZTA5NDM4ZDdjMDE5NjciLCJzIjoiWTJJd1pUUmxaVFl0WWpreE5pMDBaRE0yTFdFNFlUSXRZVGMyT0RZM01UQXdObUZtIiwidCI6IjZiOTc1ODUzLWQ2OGEtNDI2Mi05ODcwLWJjMTBhYWRlMjc1OSJ9
timeout /t 5 /nobreak >nul

echo.
echo ===============================================
echo   服務已重新啟動
echo ===============================================
echo.
echo 等待 10 秒後檢查服務狀態...
timeout /t 10 /nobreak >nul

echo.
echo [檢查] Next.js...
curl -s http://localhost:9999/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Next.js 正常
) else (
    echo    ✗ Next.js 啟動中...
)

echo.
echo [檢查] Python AI...
curl -s http://localhost:8888/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Python AI 正常
) else (
    echo    ✗ Python AI 啟動中...
)

echo.
echo ===============================================
echo   完成！
echo.
echo 本地: http://localhost:9999
echo LINE Bot: https://linebot.tiankai.it.com/api/webhook/line
echo.
pause
