@echo off
REM LINE Bot AI Service - Windows 启动脚本

echo ====================================
echo LINE Bot AI Service 启动脚本
echo ====================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.11+
    pause
    exit /b 1
)

REM 检查 .env 文件
if not exist .env (
    echo [提示] 未找到 .env 文件，从 .env.example 创建...
    copy .env.example .env
    echo [警告] 请编辑 .env 文件，填入你的 API 密钥！
    echo.
    pause
)

REM 创建虚拟环境（如果不存在）
if not exist venv (
    echo [1/4] 创建 Python 虚拟环境...
    python -m venv venv
)

REM 激活虚拟环境
echo [2/4] 激活虚拟环境...
call venv\Scripts\activate.bat

REM 安装依赖
echo [3/4] 安装 Python 依赖...
pip install -r requirements.txt

REM 创建必要的目录
if not exist logs mkdir logs
if not exist tmp_audio mkdir tmp_audio

REM 启动服务
echo [4/4] 启动 FastAPI 服务...
echo.
echo 服务地址: http://127.0.0.1:9999
echo API 文档: http://127.0.0.1:9999/api/docs
echo LINE Webhook: http://127.0.0.1:9999/api/webhook/line
echo.
echo 按 Ctrl+C 停止服务
echo ====================================
echo.

python main.py
