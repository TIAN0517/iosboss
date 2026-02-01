#!/bin/bash
# VPS Complete Setup Script
# 上传到 VPS 后在 VPS 上运行此脚本

set -e

echo "=============================================="
echo "  九九瓦斯行 VPS 完整配置脚本"
echo "=============================================="
echo ""

# 1. 安装自动备份系统
echo "[1/4] 配置数据库自动备份..."
chmod +x /root/媽媽ios/scripts/install-vps-backup.ps1

# 获取 PostgreSQL 密码
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "请输入 PostgreSQL postgres 用户密码:"
    read -s POSTGRES_PASSWORD
    echo
fi

export POSTGRES_PASSWORD="$POSTGRES_PASSWORD"

# 创建备份脚本
mkdir -p /root/backups/remote

cat > /root/backups/backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/root/backups/remote"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="gas_station"
DB_USER="postgres"

export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "开始备份数据库..."

# 确保目录存在
mkdir -p "$BACKUP_DIR"

# 执行备份
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"
pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges --clean \
    | gzip > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "备份成功! 文件: $BACKUP_FILE ($SIZE)"

    # 创建软链接
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.sql.gz"

    # 清理7天前的旧备份
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete

    log "备份完成"
else
    log "ERROR: 备份失败!"
    exit 1
fi
EOF

chmod +x /root/backups/backup.sh

# 2. 配置定时任务
echo "[2/4] 配置定时任务..."

# 添加 crontab
CRON_CMD="0 */6 * * * /root/backups/backup.sh >> /var/log/db_backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "db_backup.log" || true; echo "$CRON_CMD") | crontab -

echo "定时任务已添加: 每6小时自动备份"

# 3. 执行首次备份
echo "[3/4] 执行首次备份..."
/root/backups/backup.sh

# 4. 配置 PM2 自启动
echo "[4/4] 配置 PM2 自启动..."
if command -v pm2 &> /dev/null; then
    pm2 startup 2>/dev/null || true
    pm2 save 2>/dev/null || true
    echo "PM2 自启动已配置"
fi

echo ""
echo "=============================================="
echo "  VPS 配置完成!"
echo "=============================================="
echo ""
echo "备份系统:"
echo "  - 备份目录: /root/backups/remote"
echo "  - 自动备份: 每6小时"
echo "  - 保留策略: 7天"
echo "  - 日志位置: /var/log/db_backup.log"
echo ""
echo "常用命令:"
echo "  /root/backups/backup.sh    # 手动执行备份"
echo "  ls -lh /root/backups/remote/  # 查看备份文件"
echo "  tail -f /var/log/db_backup.log  # 查看备份日志"
echo ""
