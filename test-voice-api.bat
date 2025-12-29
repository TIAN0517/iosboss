@echo off
REM ========================================
REM 语音聊天 API 测试脚本
REM ========================================

echo.
echo ========================================
echo 语音聊天 API 测试
echo ========================================
echo.

REM 1. 检查服务状态
echo [1/2] 检查服务状态...
curl -s http://localhost:9999/api/voice/chat
echo.
echo.

REM 2. 如果有音频文件，可以测试上传
REM 使用方法: test-voice-api.bat audio.webm
if "%~1" neq "" (
    echo [2/2] 测试音频文件: %~1
    echo.
    REM 注意: curl 的 multipart/form-data 上传需要完整实现
    echo 提示: 请使用浏览器界面测试完整流程
    echo.
)

echo ========================================
echo 测试完成
echo ========================================
echo.
echo 浏览器测试地址: http://localhost:9999
echo.
pause
