#!/bin/bash
# Database Sync Script - 从 VPS 同步数据库到本地
# 用于将 VPS 上的最新备份同步到本地

set -e

# 配置 - 根据本地环境修改
VPS_HOST="${1:-107.172.46.245}"
VPS_USER="${2:-root}"
VPS_BACKUP_DIR="/root/backups/remote"
LOCAL_DB_NAME="mama_ios"
LOCAL_DB_USER="postgres"
LOCAL_BACKUP_DIR="C:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios\\backups"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "========== 开始从 VPS 同步数据库 =========="
log "VPS: $VPS_HOST"

# 临时下载目录
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# 从 VPS 获取最新备份文件名
log "获取最新备份文件..."
LATEST_FILE=$(ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "ls -t $VPS_BACKUP_DIR/*.sql.gz 2>/dev/null | head -1")

if [ -z "$LATEST_FILE" ]; then
    log "ERROR: VPS 上没有找到备份文件!"
    exit 1
fi

log "最新备份: $LATEST_FILE"

# 下载备份文件
log "下载备份文件..."
REMOTE_FILE=$(basename "$LATEST_FILE")
ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_HOST" "cat $LATEST_FILE" > "$TEMP_DIR/$REMOTE_FILE"

# 解压
log "解压备份文件..."
gunzip -f "$TEMP_DIR/$REMOTE_FILE"
SQL_FILE="${TEMP_DIR}/${REMOTE_FILE%.gz}"

# 询问是否恢复
log "警告: 这将覆盖本地数据库 '$LOCAL_DB_NAME'!"
read -p "确认继续? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    log "已取消"
    exit 0
fi

# 恢复数据库
log "正在恢复数据库..."
export PGPASSWORD="${LOCAL_POSTGRES_PASSWORD:-postgres}"

# 终止现有连接并删除数据库
psql -U "$LOCAL_DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$LOCAL_DB_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true
dropdb -U "$LOCAL_DB_USER" "$LOCAL_DB_NAME" 2>/dev/null || true
createdb -U "$LOCAL_DB_USER" "$LOCAL_DB_NAME"

# 恢复数据
psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME" < "$SQL_FILE"

log "========== 数据库同步完成 =========="
log "备份文件保存在: $TEMP_DIR/$REMOTE_FILE"
