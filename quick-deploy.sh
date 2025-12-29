#!/bin/bash
# ========================================
# 快速部署腳本 - Linux/Mac
# ========================================

echo ""
echo "========================================"
echo "  九九瓦斯行 - 一鍵啟動"
echo "========================================"
echo ""

# 檢查 Docker
if ! docker info &> /dev/null; then
    echo "[錯誤] Docker 未運行"
    exit 1
fi

echo "[1/3] 構建鏡像..."
docker-compose --env-file .env.docker build

echo "[2/3] 啟動服務..."
docker-compose --env-file .env.docker up -d

echo "[3/3] 等待就緒..."
sleep 10

echo ""
echo "========================================"
echo "  啟動完成！"
echo "========================================"
echo ""
echo "本地訪問: http://localhost:9999"
echo "外網訪問: https://bossai.jytian.it.com"
echo ""
echo "查看日誌: ./logs.sh"
echo ""
