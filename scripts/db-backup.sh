#!/bin/bash
# Database Backup Script for Gas Station Management System
# 自动备份 PostgreSQL 数据库

set -e

# 配置
BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="gas_station"
DB_USER="postgres"
KEEP_DAYS=7  # 保留最近7天的备份
REMOTE_BACKUP_DIR="/root/backups/remote"

# 日志
LOG_FILE="/var/log/db_backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== 开始数据库备份 =========="

# 创建备份目录
mkdir -p "$BACKUP_DIR"
mkdir -p "$REMOTE_BACKUP_DIR"

# 执行备份
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

log "正在备份数据库到: $BACKUP_FILE"

# 使用 pg_dump 备份
export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"
pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges --clean \
    | gzip > "$BACKUP_FILE"

# 检查备份是否成功
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "备份成功! 文件大小: $FILE_SIZE"

    # 复制到远程备份目录（用于本地同步）
    cp "$BACKUP_FILE" "$REMOTE_BACKUP_DIR/"

    # 上传到云端存储（如果有配置）
    if [ -n "${CLOUD_UPLOAD_CMD:-}" ]; then
        log "正在上传到云端存储..."
        eval "$CLOUD_UPLOAD_CMD" "$BACKUP_FILE"
    fi
else
    log "ERROR: 备份失败或文件为空!"
    exit 1
fi

# 清理旧备份
log "清理 $KEEP_DAYS 天前的旧备份..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$KEEP_DAYS -delete
find "$REMOTE_BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +$KEEP_DAYS -delete

# 创建最新的软链接（方便同步）
ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.sql.gz"
ln -sf "$BACKUP_FILE" "$REMOTE_BACKUP_DIR/latest.sql.gz"

# 同步到本地（如果配置了 SSH 隧道）
if [ -n "${LOCAL_SSH_HOST:-}" ]; then
    log "正在同步备份到本地服务器..."
    scp -o StrictHostKeyChecking=no "$BACKUP_FILE" "${LOCAL_SSH_USER:-root}@${LOCAL_SSH_HOST}:${LOCAL_BACKUP_DIR:-/root/backups}/"
fi

log "========== 备份完成 =========="
log "最新备份: $(readlink -f $BACKUP_DIR/latest.sql.gz)"
