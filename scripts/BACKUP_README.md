# 九九瓦斯行数据库自动备份与同步系统

## 概述

本系统提供完整的数据库自动备份和本地同步功能，确保数据安全。

## 目录结构

```
scripts/
├── complete-vps-setup.sh      # VPS 一键配置脚本
├── install-vps-backup.ps1     # VPS 备份系统安装
├── install-sync-server.ps1    # 同步服务器安装
├── db-backup.sh               # 备份脚本
├── sync-server.sh             # 同步服务器
├── sync-db.ps1                # 本地同步工具
└── auto-sync.ps1              # 自动同步服务
```

## 快速开始

### 步骤 1: 在 VPS 上配置

1. 上传脚本到 VPS:
```bash
scp scripts/complete-vps-setup.sh root@107.172.46.245:/root/
```

2. 连接到 VPS 并运行:
```bash
ssh root@107.172.46.245

# 设置密码并运行
export POSTGRES_PASSWORD=你的数据库密码
chmod +x complete-vps-setup.sh
./complete-vps-setup.sh
```

### 步骤 2: 本地同步

在本地 Windows 上运行 PowerShell:

```powershell
# 手动同步
.\scripts\sync-db.ps1

# 或使用自动同步服务
.\scripts\auto-sync.ps1 -AutoRestore
```

## 功能说明

### VPS 自动备份

- **备份频率**: 每 6 小时自动执行
- **保留策略**: 保留最近 7 天的备份
- **备份位置**: `/root/backups/remote/`
- **日志位置**: `/var/log/db_backup.log`

### 本地同步选项

1. **手动同步** (`sync-db.ps1`):
   - 从 VPS 下载最新备份
   - 询问确认后恢复本地数据库

2. **自动同步** (`auto-sync.ps1`):
   - 定时检查 VPS 是否有新备份
   - 自动下载并恢复（使用 `-AutoRestore` 参数）

## 常用命令

### VPS 上

```bash
# 手动执行备份
/root/backups/backup.sh

# 查看备份文件
ls -lh /root/backups/remote/

# 查看备份日志
tail -f /var/log/db_backup.log

# 检查服务状态
systemctl status db-backup.timer
systemctl status sync-server.service

# 重启同步服务器
systemctl restart sync-server.service
```

### 本地 Windows

```powershell
# 同步数据库（手动确认）
.\scripts\sync-db.ps1

# 自动同步（无需确认）
.\scripts\auto-sync.ps1 -AutoRestore -CheckInterval 30

# 查看备份目录
dir $env:USERPROFILE\Desktop\媽媽ios\backups
```

## 故障排除

### SSH 连接失败
```bash
# 在 VPS 上检查 SSH 服务
systemctl status sshd

# 确保防火墙开放端口
firewall-cmd --list-ports
```

### 数据库连接失败
```bash
# 检查 PostgreSQL
pg_isready -U postgres

# 检查数据库是否存在
psql -U postgres -l | grep gas_station
```

### 同步服务器无响应
```bash
# 检查端口是否监听
netstat -tlnp | grep 9998

# 重启服务
systemctl restart sync-server.service
```

## 定时任务说明

| 时间 | 任务 |
|------|------|
| 每 6 小时 | 自动备份数据库 |
| 实时 | 同步服务器监听端口 9998 |

## 数据流程

```
VPS PostgreSQL (gas_station)
        ↓ 每6小时
    /root/backups/remote/*.sql.gz
        ↓ 端口9998
    本地 Windows 自动下载
        ↓
    本地 PostgreSQL 恢复
```

## 注意事项

1. **密码安全**: 建议使用强密码并定期更换
2. **磁盘空间**: 定期检查 `/root/backups` 目录大小
3. **网络**: 确保 VPS 9998 端口可访问
4. **备份验证**: 定期手动测试恢复流程
