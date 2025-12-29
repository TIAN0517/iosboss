#!/bin/bash
echo ""
echo "[重啟服務]..."
docker-compose --env-file .env.docker restart
echo ""
echo "服務已重啟"
echo ""
