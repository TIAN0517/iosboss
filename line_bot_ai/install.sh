#!/bin/bash
set -e

# 颜色定义
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================"
echo -e "🚀 LINE Bot AI Docker 部署"
echo -e "================================${NC}"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  未找到 .env 文件，从 .env.example 创建...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 请编辑 .env 文件，填入你的 API 密钥！${NC}"
    echo ""
    echo -e "必需配置："
    echo -e "  ${GRAY}- GLM_KEY=你的_GLM4.7_API_KEY${NC}"
    echo -e "  ${GRAY}- LINE_CHANNEL_ACCESS_TOKEN=你的_LINE_TOKEN${NC}"
    echo -e "  ${GRAY}- LINE_CHANNEL_SECRET=你的_LINE_SECRET${NC}"
    echo ""
    read -p "配置完成后按 Enter 继续..."
fi

# 停止旧容器
echo -e "${GRAY}🛑 停止旧容器...${NC}"
docker compose down

# 构建镜像
echo -e "${GRAY}🔨 构建 Docker 镜像...${NC}"
docker compose build

# 启动服务
echo -e "${GRAY}🚀 启动服务...${NC}"
docker compose up -d

echo ""
echo -e "${GREEN}================================"
echo -e "✅ 部署完成！"
echo -e "================================${NC}"
echo ""
echo -e "服务状态："
docker ps --filter "name=line-bot-ai"
echo ""
echo -e "查看日志："
echo -e "  ${GRAY}docker logs -f line-bot-ai${NC}"
echo ""
echo -e "Webhook URL："
echo -e "  ${CYAN}https://你的域名/api/webhook/line${NC}"
echo ""
