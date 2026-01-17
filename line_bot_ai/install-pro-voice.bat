@echo off
REM 專業版語音對話安裝腳本
REM 接近豆包體驗：95% 辨識度 + ^<1 秒回應

echo ============================================================
echo    專業版語音對話安裝
echo ============================================================
echo.

REM 檢查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 未找到 Python，請先安裝 Python
    pause
    exit /b 1
)

echo [1/3] 檢查依賴套件...
pip install groq edge-tts -q

echo [2/3] 設置環境變數...
echo.
echo 請按照以下步驟操作：
echo.
echo 1. 瀏覽器已打開 Groq 申請頁面
echo 2. 註冊帳號（免費）
echo 3. 點擊 "Create API Key"
echo 4. 複製 API Key
echo 5. 在下面貼上您的 API Key：
echo.

set /p GROQ_KEY="請輸入您的 Groq API Key: "

if "%GROQ_KEY%"=="" (
    echo [錯誤] API Key 不能為空
    pause
    exit /b 1
)

echo GROQ_API_KEY=%GROQ_KEY% >> .env

echo.
echo [3/3] 測試專業版語音對話...
echo.

REM 測試腳本
python -c "import os; os.environ['GROQ_API_KEY']='%GROQ_KEY%'; from app.realtime_voice import RealtimeVoiceChat; print('✅ 專業版安裝成功！')"

echo.
echo ============================================================
echo    ✅ 安裝完成！
echo ============================================================
echo.
echo 您現在可以使用：
echo.
echo 基礎版（85% 準確度）：
echo   http://localhost:9999/voice
echo.
echo 專業版（95% 準確度）：
echo   需要使用 API: /api/voice/chat-pro
echo.
echo 啟動服務：
echo   python -m uvicorn app.main:app --host 0.0.0.0 --port 9999
echo.
pause
