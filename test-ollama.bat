@echo off
chcp 65001 >nul
echo ========================================
echo 測試 Ollama API 連線
echo ========================================

echo.
echo [1] 測試本機 API...
curl -s http://localhost:11434/api/tags
echo.

echo.
echo [2] 測試外網 API (需要 Cloudflare Tunnel)...
curl -s https://ollama.tiankai.it.com/api/tags
echo.

echo.
echo [3] 測試 AI 模型回覆 (本機)...
curl -s -X POST http://localhost:11434/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"qwen2.5:14b\",\"messages\":[{\"role\":\"user\",\"content\":\"你好\"}],\"stream\":false}"
echo.

echo.
echo [4] 測試 AI 模型回覆 (外網)...
curl -s -X POST https://ollama.tiankai.it.com/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"qwen2.5:14b\",\"messages\":[{\"role\":\"user\",\"content\":\"你好\"}],\"stream\":false}"
echo.

echo.
echo ========================================
echo 測試完成！
echo ========================================
pause
