#!/bin/bash
echo ""
echo "[停止服務]..."
docker-compose --env-file .env.docker down
echo ""
echo "服務已停止"
echo ""
