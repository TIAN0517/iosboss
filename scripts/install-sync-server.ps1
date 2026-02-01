#!/bin/bash
# Auto Sync Service - VPS 端自动同步服务
# 让本地可以通过 HTTP 下载最新备份

set -e

BACKUP_DIR="/root/backups/remote"
PORT=9998
LOG_FILE="/var/log/auto-sync.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 创建 HTTP 服务脚本
cat > /root/backups/sync-server.sh << 'SERVER_EOF'
#!/bin/bash
BACKUP_DIR="/root/backups/remote"
PORT=9998

# 发送 CORS 头
send_headers() {
    echo "HTTP/1.1 200 OK"
    echo "Content-Type: application/octet-stream"
    echo "Access-Control-Allow-Origin: *"
    echo "Connection: close"
    echo ""
}

# 获取最新备份
get_latest() {
    local latest=$(ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | head -1)
    if [ -n "$latest" ] && [ -f "$latest" ]; then
        echo "$latest"
    fi
}

# 处理请求
handle_request() {
    read -r method path version

    if [[ "$path" == "/latest" ]]; then
        local file=$(get_latest)
        if [ -n "$file" ]; then
            send_headers
            cat "$file"
        else
            echo "HTTP/1.1 404 Not Found"
            echo "Content-Type: text/plain"
            echo ""
            echo "No backup found"
        fi
    elif [[ "$path" == "/list" ]]; then
        send_headers
        ls -t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | while read f; do
            basename "$f"
        done
    elif [[ "$path" == "/health" ]]; then
        echo "HTTP/1.1 200 OK"
        echo "Content-Type: text/plain"
        echo ""
        echo "OK"
    else
        echo "HTTP/1.1 404 Not Found"
        echo "Content-Type: text/plain"
        echo ""
        echo "Not Found"
    fi
}

while true; do
    handle_request | nc -l -p 9998 -q 1
done
SERVER_EOF

chmod +x /root/backups/sync-server.sh

# 创建 systemd 服务
cat > /etc/systemd/system/sync-server.service << 'SERVICE_EOF'
[Unit]
Description=Backup Sync HTTP Server
After=network.target

[Service]
Type=simple
User=root
ExecStart=/root/backups/sync-server.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# 创建 PM2 配置（备用）
cat > /root/backups/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'backup-sync-server',
    script: '/root/backups/sync-server.sh',
    cwd: '/root/backups',
    instances: 1,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

log "Installing sync server..."

# 尝试使用 systemd 启动
if command -v systemctl &> /dev/null; then
    systemctl daemon-reload
    systemctl enable sync-server.service
    systemctl start sync-server.service
    log "Sync server started via systemd"
fi

# 也使用 PM2 启动作为备用
if command -v pm2 &> /dev/null; then
    pm2 delete sync-server 2>/dev/null || true
    cd /root/backups && pm2 start ecosystem.config.js
    pm2 save 2>/dev/null || true
    log "Sync server started via PM2 (backup)"
fi

# 开放防火墙端口
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --add-port=$PORT/tcp --permanent 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
fi

log "Sync server installed on port $PORT"
log "Access backups via: http://<VPS_IP>:$PORT/latest"
