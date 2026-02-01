#!/bin/bash
# 九九瓦斯行 VPS 完整自动配置脚本
# 在 VPS 上运行此脚本，所有配置自动完成

set -e

echo "=============================================="
echo "  九九瓦斯行 VPS 自动配置系统"
echo "=============================================="
echo ""

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[配置]${NC} $1"; }
warn() { echo -e "${YELLOW}[警告]${NC} $1"; }

# 检查 PostgreSQL 密码
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "请输入 PostgreSQL postgres 用户密码:"
    read -s POSTGRES_PASSWORD
    echo ""
fi

export POSTGRES_PASSWORD="$POSTGRES_PASSWORD"

# 验证数据库连接
log "验证数据库连接..."
if ! pg_isready -U postgres > /dev/null 2>&1; then
    warn "无法连接数据库，请确保 PostgreSQL 正在运行"
fi

# 1. 创建备份目录
log "创建备份目录..."
mkdir -p /root/backups/remote
mkdir -p /var/log
chmod 755 /root/backups

# 2. 创建自动备份脚本
log "创建自动备份脚本..."
cat > /root/backups/backup.sh << 'EOF'
#!/bin/bash
set -e

BACKUP_DIR="/root/backups/remote"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mama_ios"

export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

echo "[$(date)] 开始备份数据库..."

# 备份
pg_dump -h localhost -U postgres -d "$DB_NAME" \
    --no-owner --no-privileges --clean \
    | gzip > "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# 保留最新软链接
ln -sf "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz" "$BACKUP_DIR/latest.sql.gz"

# 清理7天前
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete

echo "[$(date)] 备份完成"
EOF

chmod +x /root/backups/backup.sh

# 3. 创建同步服务器
log "创建同步服务器..."
cat > /root/backups/sync-server.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/root/backups/remote"

while true; do
    echo "[$(date)] 同步服务器运行中..." > /dev/null 2>&1
    (echo -e "HTTP/1.1 200 OK\nContent-Type: application/octet-stream\nAccess-Control-Allow-Origin: *\n" && cat "$BACKUP_DIR/latest.sql.gz" 2>/dev/null) | nc -l -p 9998 -q 1
done
EOF

chmod +x /root/backups/sync-server.sh

# 4. 创建 systemd 服务
log "创建系统服务..."

# 备份服务
cat > /etc/systemd/system/db-backup.service << 'EOF'
[Unit]
Description=Database Backup
After=postgresql.service

[Service]
Type=oneshot
ExecStart=/root/backups/backup.sh
Environment=POSTGRES_PASSWORD=%env(POSTGRES_PASSWORD)
EOF

cat > /etc/systemd/system/db-backup.timer << 'EOF'
[Unit]
Description=Database Backup Timer

[Timer]
OnCalendar=*:0/6
Persistent=true

[Install]
WantedBy=timers.target
EOF

# 同步服务器服务
cat > /etc/systemd/system/sync-server.service << 'EOF'
[Unit]
Description=Backup Sync Server
After=network.target

[Service]
Type=simple
ExecStart=/root/backups/sync-server.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 5. 重新加载 systemd
log "启动服务..."
systemctl daemon-reload

# 启用并启动定时器
systemctl enable db-backup.timer
systemctl start db-backup.timer

# 启用并启动同步服务器
systemctl enable sync-server.service
systemctl start sync-server.service

# 6. 添加 crontab 作为备用
log "配置 crontab..."
CRON_LINE="0 */6 * * * /root/backups/backup.sh >> /var/log/db_backup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "db_backup" || true; echo "$CRON_LINE") | crontab -

# 7. 执行首次备份
log "执行首次备份..."
/root/backups/backup.sh

# 8. 启动同步服务器
log "启动同步服务器..."
if ! systemctl is-active --quiet sync-server.service; then
    # 使用 PM2 作为备用
    if command -v pm2 &> /dev/null; then
        cat > /root/backups/ecosystem.config.js << 'JSEOF'
module.exports = {
  apps: [{
    name: 'backup-sync',
    script: '/root/backups/sync-server.sh',
    cwd: '/root/backups',
    instances: 1
  }]
}
JSEOF
        cd /root/backups && pm2 delete sync-server 2>/dev/null || true
        pm start ecosystem.config.js
    fi
fi

echo ""
echo "=============================================="
echo "  配置完成!"
echo "=============================================="
echo ""
echo "服务状态:"
systemctl status db-backup.timer --no-pager | head -5
systemctl status sync-server.service --no-pager | head -5
echo ""
echo "备份位置: /root/backups/remote/"
echo "同步端口: 9998"
echo "定时任务: 每6小时自动备份"
echo ""
echo "查看备份: ls -lh /root/backups/remote/"
echo "查看日志: tail -f /var/log/db_backup.log"
echo ""
echo "本地同步命令:"
echo "  PowerShell: .\\sync-db.ps1 -VPSHost 107.172.46.245"
echo ""
