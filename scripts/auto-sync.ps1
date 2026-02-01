<#
.SYNOPSIS
九九瓦斯行自动数据库同步服务
自动从 VPS 下载并恢复数据库备份

.DESCRIPTION
此脚本会:
1. 定时检查 VPS 上是否有新的备份
2. 下载最新备份
3. 自动恢复本地数据库

.PARAMETER VPSHost
VPS 服务器地址

.PARAMETER CheckInterval
检查间隔（分钟）

#>

param(
    [string]$VPSHost = "107.172.46.245",
    [string]$VPSUser = "root",
    [int]$CheckInterval = 60,  # 每60分钟检查一次
    [switch]$AutoRestore  # 自动恢复，无需确认
)

$ErrorActionPreference = "Stop"

# 配置
$LocalBackupDir = "C:\Users\tian7\OneDrive\Desktop\媽媽ios\backups"
$LocalDBName = "mama_ios"
$LocalDBUser = "postgres"
$SyncServerPort = 9998
$StateFile = "$LocalBackupDir\.last_sync"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

function Get-LocalPostgresPassword {
    $envPassword = $env:POSTGRES_PASSWORD
    if ($envPassword) { return $envPassword }

    $pgpassPath = Join-Path $env:APPDATA "postgresql\pgpass.conf"
    if (Test-Path $pgpassPath) {
        $content = Get-Content $pgpassPath | Where-Object { $_ -match "localhost" }
        if ($content) {
            $parts = $content -split ":"
            if ($parts.Length -ge 5) { return $parts[4] }
        }
    }

    Write-Log "请输入本地 PostgreSQL '$LocalDBUser' 用户的密码:"
    $password = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    return [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

function Test-ServerHealth {
    param([string]$Host, [int]$Port)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect($Host, $Port)
        $tcp.Close()
        return $true
    }
    catch { return $false }
}

function Get-LatestBackupFromVPS {
    param([string]$Host, [string]$User, [int]$Port)
    try {
        $client = New-Object System.Net.Sockets.TcpClient($Host, $Port)
        $stream = $client.GetStream()
        $writer = New-Object System.IO.StreamWriter($stream)
        $reader = New-Object System.IO.StreamReader($stream)

        $writer.WriteLine("GET /latest HTTP/1.1")
        $writer.WriteLine("Host: $Host")
        $writer.WriteLine("")
        $writer.Flush()

        # 读取响应头
        $response = $reader.ReadLine()
        if ($response -match "200") {
            # 跳过头
            while ($reader.Peek() -ge 0) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($line)) { break }
            }
            # 读取内容
            $ms = New-Object System.IO.MemoryStream
            $buffer = New-Object byte[] 8192
            while ($reader.Peek() -ge 0) {
                $read = $reader.Read($buffer, 0, $buffer.Length)
                if ($read -le 0) { break }
                $ms.Write($buffer, 0, $read)
            }
            $client.Close()
            return $ms.ToArray()
        }
        $client.Close()
    }
    catch {
        Write-Log "ERROR: 连接同步服务器失败: $_"
    }
    return $null
}

function Remove-ExistingConnections {
    param([string]$Database, [string]$User, [string]$Password)
    $env:PGPASSWORD = $Password
    $query = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$Database' AND pid <> pg_backend_pid();"
    & psql -U $User -d postgres -c $query 2>&1 | Out-Null
    Start-Sleep -Seconds 2
    $env:PGPASSWORD = ""
}

function Restore-Database {
    param(
        [byte[]]$BackupData,
        [string]$Database,
        [string]$User,
        [string]$Password,
        [string]$BackupDir
    )

    $env:PGPASSWORD = $Password

    # 保存临时文件
    $tempFile = Join-Path $BackupDir "temp_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql.gz"
    [System.IO.File]::WriteAllBytes($tempFile, $BackupData)

    # 解压
    $sqlFile = $tempFile.TrimEnd(".gz")
    & gzip -d -f $tempFile 2>&1 | Out-Null

    # 恢复
    Write-Log "正在恢复数据库..."
    & dropdb -U $User --if-exists $Database 2>&1 | Out-Null
    & createdb -U $User $Database 2>&1 | Out-Null
    & psql -U $User -d $Database -f $sqlFile 2>&1 | Out-Null

    # 清理临时文件
    if (Test-Path $sqlFile) { Remove-Item $sqlFile -Force }

    $env:PGPASSWORD = ""
}

function Get-LastSyncTime {
    if (Test-Path $StateFile) {
        return [DateTime]::ParseExact((Get-Content $StateFile), "yyyy-MM-dd HH:mm:ss", $null)
    }
    return [DateTime]::MinValue
}

function Set-LastSyncTime {
    param([DateTime]$Time)
    $Time.ToString("yyyy-MM-dd HH:mm:ss") | Set-Content $StateFile
}

# 主程序
Write-Log "=============================================="
Write-Log "  九九瓦斯行自动数据库同步服务"
Write-Log "=============================================="
Write-Log "VPS: $VPSHost"
Write-Log "检查间隔: $CheckInterval 分钟"
Write-Log "自动恢复: $($AutoRestore.IsPresent)"
Write-Log ""

# 确保备份目录存在
New-Item -ItemType Directory -Force -Path $LocalBackupDir | Out-Null

# 获取数据库密码
$dbPassword = Get-LocalPostgresPassword

# 检查同步服务器
Write-Log "检查同步服务器..."
if (-not (Test-ServerHealth -Host $VPSHost -Port $SyncServerPort)) {
    Write-Log "警告: 同步服务器 ($VPSHost`:$SyncServerPort) 不可用"
    Write-Log "将使用 SSH 直接下载模式..."

    # 备用: 使用 SSH 下载
    $latestFile = ssh -o StrictHostKeyChecking=no "$VPSUser@$VPSHost" "ls -t /root/backups/remote/*.sql.gz 2>/dev/null | head -1"
    if ($latestFile) {
        $tempDir = [System.IO.Path]::GetTempFileName()
        Write-Log "下载备份: $latestFile"
        scp -o StrictHostKeyChecking=no "$VPSUser@$VPSHost`:$latestFile" $tempDir 2>&1

        if ($LASTEXITCODE -eq 0) {
            $backupData = [System.IO.File]::ReadAllBytes($tempDir)
            Remove-Item $tempDir -Force

            if ($AutoRestore -or (Read-Host "发现新备份，是否恢复? (y/n)").ToLower() -eq "y") {
                Remove-ExistingConnections -Database $LocalDBName -User $LocalDBUser -Password $dbPassword
                Restore-Database -BackupData $backupData -Database $LocalDBName -User $LocalDBUser -Password $dbPassword -BackupDir $LocalBackupDir
                Write-Log "数据库已恢复!"
            }
        }
    }
    else {
        Write-Log "未找到备份文件"
    }
    exit 0
}

# 主循环
while ($true) {
    try {
        $lastSync = Get-LastSyncTime
        $backupData = Get-LatestBackupFromVPS -Host $VPSHost -User $VPSUser -Port $SyncServerPort

        if ($backupData -and $backupData.Length -gt 0) {
            # 保存备份
            $backupFile = Join-Path $LocalBackupDir "vps_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql.gz"
            [System.IO.File]::WriteAllBytes($backupFile, $backupData)
            Write-Log "已下载备份: $backupFile ($([Math]::Round($backupData.Length / 1MB, 2)) MB)"

            # 检查是否需要恢复
            if ($AutoRestore) {
                Remove-ExistingConnections -Database $LocalDBName -User $LocalDBUser -Password $dbPassword
                Restore-Database -BackupData $backupData -Database $LocalDBName -User $LocalDBUser -Password $dbPassword -BackupDir $LocalBackupDir
                Set-LastSyncTime -Time (Get-Date)
                Write-Log "数据库已自动恢复!"
            }
            else {
                Write-Log "如需恢复数据库，请运行: sync-db.ps1"
            }
        }
        else {
            Write-Log "未发现新备份"
        }
    }
    catch {
        Write-Log "ERROR: $_"
    }

    Write-Log "等待 $CheckInterval 分钟后再次检查..."
    Start-Sleep -Seconds ($CheckInterval * 60)
}
