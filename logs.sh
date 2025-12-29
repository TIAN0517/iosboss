#!/bin/bash
echo ""
echo "========================================"
echo "  實時日誌 (Ctrl+C 退出)"
echo "========================================"
echo ""
docker-compose --env-file .env.docker logs -f --tail=100
