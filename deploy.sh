#!/bin/bash
# ========================================
# 九九瓦斯行管理系統 - Docker 部署腳本
# Jy技術團隊 • 2025
# ========================================

set -e

ENV_FILE=".env.docker"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印標題
print_header() {
    echo ""
    echo "========================================"
    echo "  九九瓦斯行管理系統 - Docker 部署"
    echo "========================================"
    echo ""
}

# 檢查 Docker
check_docker() {
    if ! docker info &> /dev/null; then
        echo -e "${RED}[錯誤] Docker 未運行${NC}"
        exit 1
    fi
}

# 部署
deploy() {
    echo -e "${BLUE}[步驟 1/3] 構建 Docker 鏡像...${NC}"
    docker-compose --env-file $ENV_FILE build

    echo -e "${BLUE}[步驟 2/3] 啟動服務...${NC}"
    docker-compose --env-file $ENV_FILE up -d

    echo -e "${BLUE}[步驟 3/3] 等待服務就緒...${NC}"
    sleep 10

    echo ""
    echo -e "${GREEN}========================================"
    echo "  部署完成！"
    echo "========================================${NC}"
    echo ""
    echo "服務訪問地址："
    echo "  本地: http://localhost:9999"
    echo "  Cloudflare Tunnel: https://bossai.jytian.it.com"
    echo ""
}

# 停止服務
stop() {
    echo -e "${YELLOW}[停止服務]...${NC}"
    docker-compose --env-file $ENV_FILE down
    echo "服務已停止"
}

# 重啟服務
restart() {
    echo -e "${YELLOW}[重啟服務]...${NC}"
    docker-compose --env-file $ENV_FILE restart
    echo "服務已重啟"
}

# 查看狀態
status() {
    echo ""
    echo "========================================"
    echo "  服務狀態"
    echo "========================================"
    echo ""
    docker-compose --env-file $ENV_FILE ps
}

# 查看日誌
logs() {
    echo ""
    echo "========================================"
    echo "  實時日誌 (Ctrl+C 退出)"
    echo "========================================"
    echo ""
    docker-compose --env-file $ENV_FILE logs -f --tail=100
}

# 清理並重新部署
clean_rebuild() {
    echo ""
    echo "[清理並重新部署]"
    echo ""
    echo "[1/4] 停止並刪除容器..."
    docker-compose --env-file $ENV_FILE down

    echo "[2/4] 刪除舊鏡像..."
    docker-compose --env-file $ENV_FILE build --no-cache

    echo "[3/4] 清理 Docker 緩存..."
    docker system prune -f

    echo "[4/4] 重新構建並啟動..."
    docker-compose --env-file $ENV_FILE up -d --build

    echo ""
    echo -e "${GREEN}========================================"
    echo "  重新部署完成！"
    echo "========================================${NC}"
    echo ""
}

# 完全清理
full_clean() {
    echo ""
    read -p "確認刪除所有數據？(yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "已取消"
        exit 0
    fi

    echo ""
    echo "[完全清理]..."
    docker-compose --env-file $ENV_FILE down -v
    docker system prune -af --volumes
    docker volume prune -f

    echo ""
    echo "所有容器、鏡像、卷已刪除"
}

# 主菜單
show_menu() {
    echo "請選擇操作："
    echo "  1. 構建並啟動所有服務 (首次部署)"
    echo "  2. 停止所有服務"
    echo "  3. 重啟所有服務"
    echo "  4. 查看服務狀態"
    echo "  5. 查看日誌"
    echo "  6. 清理並重新部署"
    echo "  7. 完全清理 (包括數據)"
    echo ""
    read -p "請輸入選項 (1-7): " choice

    case $choice in
        1) deploy ;;
        2) stop ;;
        3) restart ;;
        4) status ;;
        5) logs ;;
        6) clean_rebuild ;;
        7) full_clean ;;
        *)
            echo -e "${RED}[錯誤] 無效的選項${NC}"
            exit 1
            ;;
    esac
}

# 主程序
main() {
    print_header
    check_docker

    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}[錯誤] 找不到 $ENV_FILE${NC}"
        exit 1
    fi

    show_menu
}

main
