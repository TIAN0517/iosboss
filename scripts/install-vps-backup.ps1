#!/bin/bash
# Complete Database Backup & Sync Setup Script
# 在 VPS 上运行此脚本以设置完整的自动备份系统

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=============================================="
echo "  VPS 数据库自动备份系统安装程序"
echo "=============================================="

# 获取数据库密码
if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "请输入 PostgreSQL postgres 用户密码:"
    read -s POSTGRES_PASSWORD
    echo
fi

export PGPASSWORD="$POSTGRES_PASSWORD"

# 检查数据库连接
log_info "检查数据库连接..."
if ! psql -U postgres -c "SELECT 1" > /dev/null 2>&1; then
    log_error "无法连接到数据库，请检查密码是否正确"
    exit 1
fi
log_info "数据库连接成功!"

# 创建备份目录
log_info "创建备份目录..."
mkdir -p /root/backups
mkdir -p /root/backups/remote
mkdir -p /var/log
chmod 755 /root/backups

# 创建备份脚本
log_info "创建备份脚本..."
cat > /root/backups/backup.sh << 'SCRIPT_EOF'
#!/bin/bash
set -e

BACKUP_DIR="/root/backups/remote"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="gas_station"
DB_USER="postgres"

export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

# 清理旧备份函数
cleanup_old() {
    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete
}

# 主备份
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"
echo "[$(date)] 开始备份数据库..."

pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-privileges --clean \
    | gzip > "$BACKUP_FILE"

if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "[$(date)] 备份成功: $(du -h "$BACKUP_FILE" | cut -f1)"
    # 创建软链接指向最新备份
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest.sql.gz"
    # 清理旧备份
    cleanup_old
else
    echo "[$(date)] ERROR: 备份失败!"
    exit 1
fi
SCRIPT_EOF

chmod +x /root/backups/backup.sh

# 添加环境变量
log_info "配置环境变量..."
if ! grep -q "POSTGRES_PASSWORD" /root/.bashrc 2>/dev/null; then
    echo "export POSTGRES_PASSWORD='$POSTGRES_PASSWORD'" >> /root/.bashrc
fi

# 创建 systemd 定时器服务
log_info "创建定时任务..."
cat > /etc/systemd/system/db-backup.service << 'SERVICE_EOF'
[Unit]
Description=Database Backup Service
After=postgresql.service

[Service]
Type=oneshot
User=root
ExecStart=/root/backups/backup.sh
Environment=POSTGRES_PASSWORD=%env(POSTGRES_PASSWORD)
SERVICE_EOF

cat > /etc/systemd/system/db-backup.timer << 'TIMER_EOF'
[Unit]
Description=Run Database Backup Every 6 Hours

[Timer]
OnCalendar=*:0/6
Persistent=true

[Install]
WantedBy=timers.target
TIMER_EOF

# 创建 crontab 条目作为备选
log_info "添加 crontab 定时任务..."
(crontab -l 2>/dev/null || true; echo "0 */6 * * * /root/backups/backup.sh >> /var/log/db_backup.log 2>&1") | crontab -

# 重新加载 systemd
systemctl daemon-reload 2>/dev/null || true
systemctl enable db-backup.timer 2>/dev/null || true
systemctl start db-backup.timer 2>/dev/null || true

# 立即执行一次备份测试
log_info "执行首次备份测试..."
/root/backups/backup.sh

# 创建本地同步脚本模板
log_info "创建本地同步脚本模板..."
cat > /root/backups/sync-to-local.sh << 'SYNC_EOF'
#!/bin/bash
# 从 VPS 同步备份到本地的脚本（需要 SSH 隧道）
# 在本地 Windows 上运行 PowerShell 脚本: sync-db-from-vps.ps1

# 检查是否有本地同步配置
if [ -n "${LOCAL_SYNC_ENABLED:-}" ]; then
    LATEST=$(ls -t /root/backups/remote/*.sql.gz 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
        scp -o StrictHostKeyChecking=no "$LATEST" "${LOCAL_USER:-root}@${LOCAL_HOST}:${LOCAL_DIR:-C:/Users/tian7/OneDrive/Desktop/媽媽ios/backups}/"
        echo "[$(date)] 已同步备份到本地"
    fi
fi
SYNC_EOF

chmod +x /root/backups/sync-to-local.sh

echo ""
echo "=============================================="
echo "  安装完成!"
echo "=============================================="
echo ""
echo "备份配置:"
echo "  - 备份目录: /root/backups/remote"
echo "  - 备份频率: 每6小时自动备份"
echo "  - 保留天数: 7天"
echo "  - 日志文件: /var/log/db_backup.log"
echo ""
echo "命令:"
echo "  - 手动备份: /root/backups/backup.sh"
echo "  - 查看日志: tail -f /var/log/db_backup.log"
echo "  - 查看备份: ls -lh /root/backups/remote/"
echo ""
echo "定时任务已配置，无需手动干预!"
echo ""
