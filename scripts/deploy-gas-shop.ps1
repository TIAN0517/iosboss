#!/bin/bash
# Gas Shop 自动部署脚本
# 在 VPS 上运行

set -e

echo "=============================================="
echo "  瓦斯商城自动部署脚本"
echo "=============================================="

cd /root/媽媽ios/gas-project

echo "[1/4] 安装依赖..."
npm install 2>&1 | tail -5

echo "[2/4] 构建项目..."
npm run build 2>&1 | tail -10

echo "[3/4] 复制静态文件到 Standalone..."
rm -rf .next/standalone/gas-project/.next/static
cp -r .next/static .next/standalone/gas-project/.next/

echo "[4/4] 重启服务..."
pm2 restart gas-shop
sleep 3

echo ""
echo "=============================================="
echo "  部署完成!"
echo "=============================================="
echo ""
echo "检查状态:"
pm2 status gas-shop
echo ""
echo "测试:"
curl -s -o /dev/null -w "CSS: %{http_code}\n" http://localhost:6666/_next/static/chunks/2473c16c0c2f6b5f.css
curl -s http://localhost:6666/api/products | head -c 200
