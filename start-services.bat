@echo off
chcp 65001 >nul
echo ========================================
echo 九九瓦斯行系統 - 啟動腳本
echo ========================================

echo.
echo [1/4] 檢查 Cloudflare Tunnel...
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I "cloudflared.exe" >nul
if %errorlevel% equ 0 (
    echo     - 找到現有程序，正在停止...
    taskkill /F /IM cloudflared.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
)
echo     - 準備啟動 Tunnel...

echo.
echo [2/4] 啟動 Cloudflare Tunnel (背景)...
start /B cloudflared.exe tunnel --config "C:\Users\tian7\.cloudflared\config.yml" run
echo     - Tunnel 啟動中，請等待連線建立...
timeout /t 5 /nobreak >nul

echo.
echo [3/4] 檢查 Next.js 開發伺服器...
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %errorlevel% neq 0 (
    echo     - Next.js 未運行，請手動啟動：npm run dev
) else (
    echo     - Next.js 已在運行
)

echo.
echo [4/4] 驗證 Tunnel 連線...
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo 服務狀態：
echo ========================================
echo.
echo 🌐 Cloudflare Tunnel:
echo   - bossai.tiankai.it.com (主應用程式)
echo   - linebot.tiankai.it.com (LINE Bot)
echo   - ollama.tiankai.it.com (AI 模型 API)
echo.
echo 🔗 Ollama API (本地 GPU) 可透過以下網址存取：
echo   - http://localhost:11434 (本機)
echo   - https://ollama.tiankai.it.com (外網)
echo.
echo ========================================
echo 提示：如需修改配置，請編輯：
echo   - C:\Users\tian7\.cloudflared\config.yml
echo   - C:\Users\tian7\OneDrive\Desktop\媽媽ios\nginx-bossai.conf
echo ========================================
pause
