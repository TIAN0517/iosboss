@echo off
REM ========================================
REM HTTPS 配置自動化腳本
REM 用於配置 ai.tiankai.it.com 的 HTTPS (443)
REM 配置文件位置: C:\nginx\conf\conf.d\ai.conf
REM SSL 證書位置: C:\nginx\html
REM ========================================

echo ========================================
echo Nginx HTTPS 配置腳本
echo ========================================
echo.

echo [步驟 1/6] 創建必要目錄...
if not exist "C:\nginx\logs" mkdir "C:\nginx\logs"
if not exist "C:\nginx\html\certbot" mkdir "C:\nginx\html\certbot"
echo 完成！

echo.
echo [步驟 2/6] 檢查 SSL 證書文件...
if not exist "C:\nginx\html\ai.tiankai.it.com-crt.pem" (
    echo.
    echo ========================================
    echo 警告：找不到 SSL 證書文件
    echo ========================================
    echo.
    echo 請先從 Cloudflare 下載證書並保存到：
    echo   證書文件：C:\nginx\html\ai.tiankai.it.com-crt.pem
    echo   私鑰文件：C:\nginx\html\ai.tiankai.it.com-key.pem
    echo.
    echo ========================================
    echo 如何獲取 Cloudflare Origin Certificate：
    echo ========================================
    echo 1. 訪問：https://dash.cloudflare.com
    echo 2. 選擇域名：tiankai.it.com
    echo 3. SSL/TLS → Origin Server → Create Certificate
    echo 4. 主機名：ai.tiankai.it.com
    echo 5. 下載 origin.pem 和 origin.key
    echo 6. 重命名為：
    echo    origin.pem → ai.tiankai.it.com-crt.pem
    echo    origin.key → ai.tiankai.it.com-key.pem
    echo 7. 保存到：C:\nginx\html\
    echo.
    pause
    exit /b 1
)

if not exist "C:\nginx\html\ai.tiankai.it.com-key.pem" (
    echo 錯誤：找不到 SSL 私鑰文件
    pause
    exit /b 1
)
echo 完成！

echo.
echo [步驟 3/6] 複製 HTTPS 配置文件...
if not exist "C:\nginx\conf\conf.d" mkdir "C:\nginx\conf\conf.d"
copy nginx-ssl-config.conf "C:\nginx\conf\conf.d\ai.conf"
echo 配置文件已複製到：C:\nginx\conf\conf.d\ai.conf
echo 完成！

echo.
echo [步驟 4/6] 測試 Nginx 配置...
cd C:\nginx
nginx -t
if errorlevel 1 (
    echo.
    echo 錯誤：Nginx 配置文件有誤
    echo.
    pause
    exit /b 1
)
echo 完成！

echo.
echo [步驟 5/6] 重新啟動 Nginx...
taskkill /F /IM nginx.exe 2>nul
start nginx
echo 完成！

echo.
echo [步驟 6/6] 測試 HTTPS 訪問...
echo.
echo 請在瀏覽器訪問：https://ai.tiankai.it.com
echo 應該可以看到 Nginx 歡迎頁面或 AI API
echo.

echo ========================================
echo 接下來的步驟：
echo ========================================
echo.
echo 1. 測試 HTTPS 訪問是否正常
echo.
echo 2. 更新 Netlify 環境變量：
echo    AI_BASE_URL=https://ai.tiankai.it.com
echo    OLLAMA_BASE_URL=https://ai.tiankai.it.com
echo.
echo 3. 配置 Cloudflare CDN：
echo    DNS → CNAME → ai → your-server-ip
echo    SSL/TLS → Full (strict)
echo    Always Use HTTPS → ON
echo.
echo 4. 重新部署 Netlify
echo.

echo ========================================
echo 配置完成！
echo ========================================

pause
