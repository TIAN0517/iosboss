#!/bin/bash

# ========================================
# 九九瓦斯行管理系統 - Docker 數據庫導出腳本
# ========================================

set -e

echo "🗄️ 開始導出 Docker PostgreSQL 數據庫..."

# 檢查容器是否運行
if ! docker ps | grep -q jyt-gas-postgres; then
    echo "❌ 錯誤：jyt-gas-postgres 容器未運行"
    echo "請先執行：docker-compose up -d"
    exit 1
fi

# 設置變量
BACKUP_DIR="./backups/migration"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/gas-management-${TIMESTAMP}.sql"

# 創建備份目錄
mkdir -p "$BACKUP_DIR"

echo "📦 導出數據庫到: $BACKUP_FILE"

# 導出數據庫
docker exec jyt-gas-postgres pg_dump \
    -U postgres \
    -d gas_management \
    --no-owner \
    --no-acl \
    --verbose \
    > "$BACKUP_FILE"

# 檢查導出是否成功
if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ 數據庫導出成功！"
    echo "📁 文件位置: $BACKUP_FILE"
    echo "📊 文件大小: $FILE_SIZE"
    echo ""
    echo "📝 下一步："
    echo "1. 將此文件導入到 Supabase"
    echo "2. 使用命令：psql $SUPABASE_URL < $BACKUP_FILE"
else
    echo "❌ 數據庫導出失敗"
    exit 1
fi
