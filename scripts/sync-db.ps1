<#
.SYNOPSIS
九九瓦斯行数据库同步工具
从 VPS 同步数据库到本地 Windows

.DESCRIPTION
此脚本会自动:
1. 从 VPS 下载最新的数据库备份
2. 解压备份文件
3. 询问确认后恢复本地数据库

.PARAMETER VPSHost
VPS 服务器地址

.PARAMETER VPSUser
VPS 登录用户名

.EXAMPLE
.\sync-db.ps1
#>

param(
    [string]$VPSHost = "107.172.46.245",
    [string]$VPSUser = "root",
    [string]$VPSBackupDir = "/root/backups/remote",
    [string]$LocalBackupDir = "C:\Users\tian7\OneDrive\Desktop\媽媽ios\backups",
    [string]$LocalDBName = "mama_ios",
    [string]$LocalDBUser = "postgres"
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message"
}

function Test-PostgreSQLConnection {
    param([string]$User, [string]$Database)
    try {
        $result = & pg_isready -U $User -d $Database 2>&1
        return $result -match "accepting connections"
    }
    catch {
        return $false
    }
}

function Get-LocalPostgresPassword {
    # 尝试从环境变量获取
    $envPassword = $env:POSTGRES_PASSWORD
    if ($envPassword) { return $envPassword }

    # 尝试从 pgpass 获取
    $pgpassPath = Join-Path $env:APPDATA "postgresql\pgpass.conf"
    if (Test-Path $pgpassPath) {
        $content = Get-Content $pgpassPath | Where-Object { $_ -match "localhost" }
        if ($content) {
            $parts = $content -split ":"
            if ($parts.Length -ge 5) { return $parts[4] }
        }
    }

    # 提示用户输入
    Write-Log "请输入本地 PostgreSQL '$LocalDBUser' 用户的密码:"
    $password = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    return $plainPassword
}

function Remove-ExistingConnections {
    param([string]$Database, [string]$User)
    Write-Log "断开现有数据库连接..."
    $query = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$Database' AND pid <> pg_backend_pid();"
    & psql -U $User -d postgres -c $query 2>&1 | Out-Null
    Start-Sleep -Seconds 1
}

function Restore-Database {
    param(
        [string]$SqlFile,
        [string]$Database,
        [string]$User,
        [string]$Password
    )

    $env:PGPASSWORD = $Password

    Write-Log "删除现有数据库..."
    & dropdb -U $User --if-exists $Database 2>&1 | Out-Null

    Write-Log "创建新数据库..."
    & createdb -U $User $Database 2>&1 | Out-Null

    Write-Log "恢复数据..."
    & psql -U $User -d $Database -f $SqlFile 2>&1 | Out-Null

    $env:PGPASSWORD = ""
}

Write-Log "=============================================="
Write-Log "  九九瓦斯行数据库同步工具"
Write-Log "=============================================="
Write-Log ""
Write-Log "VPS: $VPSHost"
Write-Log "本地数据库: $LocalDBName"
Write-Log ""

# 1. 测试 VPS SSH 连接
Write-Log "[1/4] 测试 VPS 连接..."
$sshTest = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 "$VPSUser@$VPSHost" "echo 'SSH OK'" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Log "ERROR: 无法连接到 VPS: $sshTest"
    exit 1
}
Write-Log "VPS 连接成功"

# 2. 获取最新备份文件
Write-Log "[2/4] 获取最新备份文件..."
$tempDir = [System.IO.Path]::GetTempPathName()
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$latestFile = ssh -o StrictHostKeyChecking=no "$VPSUser@$VPSHost" "ls -t $VPSBackupDir/*.sql.gz 2>/dev/null | head -1"
if (-not $latestFile) {
    Write-Log "ERROR: VPS 上没有找到备份文件"
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    exit 1
}
Write-Log "最新备份: $latestFile"

# 3. 下载备份文件
Write-Log "[3/4] 下载备份文件..."
$remoteFile = [System.IO.Path]::GetFileName($latestFile)
$localGzFile = Join-Path $tempDir $remoteFile
$localSqlFile = $localGzFile.TrimEnd(".gz")

# 使用 scp 下载
$scpResult = scp -o StrictHostKeyChecking=no "$VPSUser@$VPSHost`:$latestFile" $tempDir 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Log "ERROR: 下载失败: $scpResult"
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    exit 1
}
Write-Log "下载成功: $remoteFile"

# 解压
Write-Log "解压文件中..."
& gzip -d -f $localGzFile

# 4. 恢复数据库
Write-Log "[4/4] 准备恢复数据库..."
Write-Log ""
Write-Log "警告: 这将覆盖本地数据库 '$LocalDBName'!"
Write-Host "确认继续? (y/n): " -NoNewline
$confirm = Read-Host
if ($confirm.ToLower() -ne "y") {
    Write-Log "已取消"
    Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
    exit 0
}

# 获取密码
$dbPassword = Get-LocalPostgresPassword

# 断开连接并恢复
Remove-ExistingConnections -Database $LocalDBName -User $LocalDBUser
Restore-Database -SqlFile $localSqlFile -Database $LocalDBName -User $LocalDBUser -Password $dbPassword

# 清理临时文件
Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue

# 复制备份到本地备份目录
New-Item -ItemType Directory -Force -Path $LocalBackupDir | Out-Null
Copy-Item $localSqlFile -Destination (Join-Path $LocalBackupDir "restore_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql") -ErrorAction SilentlyContinue

Write-Log ""
Write-Log "=============================================="
Write-Log "  数据库同步完成!"
Write-Log "=============================================="
Write-Log ""
Write-Log "提示: 如果网站没有更新，请刷新浏览器或清除缓存"
