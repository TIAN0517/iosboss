#!/bin/bash
# LINE Bot AI Service - Linux/Mac 启动脚本

echo "===================================="
echo "LINE Bot AI Service 启动脚本"
echo "===================================="
echo ""

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "[错误] 未找到 Python，请先安装 Python 3.11+"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "[提示] 未找到 .env 文件，从 .env.example 创建..."
    cp .env.example .env
    echo "[警告] 请编辑 .env 文件，填入你的 API 密钥！"
    echo ""
    read -p "按 Enter 继续..."
fi

# 创建虚拟环境（如果不存在）
if [ ! -d venv ]; then
    echo "[1/4] 创建 Python 虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "[2/4] 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
echo "[3/4] 安装 Python 依赖..."
pip install -r requirements.txt

# 创建必要的目录
mkdir -p logs tmp_audio

# 启动服务
echo "[4/4] 启动 FastAPI 服务..."
echo ""
echo "服务地址: http://127.0.0.1:9999"
echo "API 文档: http://127.0.0.1:9999/api/docs"
echo "LINE Webhook: http://127.0.0.1:9999/api/webhook/line"
echo ""
echo "按 Ctrl+C 停止服务"
echo "===================================="
echo ""

python main.py
