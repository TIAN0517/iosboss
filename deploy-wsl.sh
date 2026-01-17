#!/bin/bash
# LINE Bot WSL 部署腳本

set -e

echo "==============================================="
echo "   LINE Bot 自動部署 (WSL)"
echo "==============================================="
echo ""

# 更新套件
echo "[1/6] 更新套件..."
sudo apt-get update > /dev/null 2>&1

# 安裝必要工具
echo "[2/6] 安裝必要工具..."
sudo apt-get install -y curl git > /dev/null 2>&1

# 安裝 Docker
if ! command -v docker &> /dev/null; then
    echo "[3/6] 安裝 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker 安裝完成"
else
    echo "[3/6] Docker 已安裝，跳過..."
fi

# 安裝 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "[4/6] 安裝 Docker Compose..."
    sudo apt-get install -y docker-compose > /dev/null 2>&1
    echo "✅ Docker Compose 安裝完成"
else
    echo "[4/6] Docker Compose 已安裝，跳過..."
fi

# 複製專案到 WSL
echo "[5/6] 複製專案檔案..."
# 專案已掛載在 /mnt/c/Users/tian7/OneDrive/Desktop/媽媽ios
cd /mnt/c/Users/tian7/OneDrive/Desktop/媽媽ios

# 建構並啟動容器
echo "[6/6] 建構並啟動容器..."
docker-compose down 2> /dev/null || true
docker-compose build line-bot-ai
docker-compose up -d line-bot-ai

echo ""
echo "==============================================="
echo "   部署完成"
echo "==============================================="
echo ""
echo "服務狀態："
docker ps
echo ""
echo "日誌："
docker logs line-bot-ai --tail 20
echo ""
echo "✅ 完成！"
echo ""
echo "重要："
echo "1. 容器會在背景運行"
echo "2. 重啟 WSL 後需要手動啟動容器"
echo "3. 請在員工群組發送訊息抓取群組 ID"
echo ""
