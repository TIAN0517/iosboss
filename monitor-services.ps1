# ========================================
# 服務持久性監控腳本
# 九九瓦斯行管理系統
# 功能：自動檢測並重啟停止的服務
# ========================================

param(
    [switch]$OneTime = $false,
    [int]$CheckInterval = 30
)

# 配置
$ErrorActionPreference = "Stop"
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = Join-Path $ScriptPath "logs\monitor.log"
$Services = @("jyt-gas-app", "jyt-gas-nginx", "jyt-gas-postgres", "jyt-gas-cloudflared")

# 創建日誌目錄
if (-not (Test-Path (Split-Path $LogFile))) {
    New-Item -ItemType Directory -Force -Path (Split-Path $LogFile) | Out-Null
}

# 日誌函數
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # 寫入文件
    Add-Content -Path $LogFile -Value $logMessage -Encoding UTF8
    
    # 控制台輸出（顏色）
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARNING" { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        "INFO" { Write-Host $logMessage -ForegroundColor Cyan }
        default { Write-Host $logMessage -ForegroundColor White }
    }
}

# 檢查 Docker 是否運行
function Test-Docker {
    try {
        $result = docker info 2>&1
        return $?
    }
    catch {
        return $false
    }
}

# 檢查容器狀態
function Get-ContainerStatus {
    param([string]$ContainerName)
    
    try {
        $status = docker ps --filter "name=$ContainerName" --format "{{.Status}}" 2>&1
        
        if ($LASTEXITCODE -eq 0 -and $status -ne "") {
            return $true
        }
        else {
            return $false
        }
    }
    catch {
        return $false
    }
}

# 重啟容器
function Restart-Container {
    param([string]$ContainerName)
    
    Write-Log "嘗試重啟容器: $ContainerName" "WARNING"
    
    try {
        docker restart $ContainerName 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "容器重啟成功: $ContainerName" "SUCCESS"
            return $true
        }
        else {
            Write-Log "容器重啟失敗: $ContainerName" "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "重啟容器時發生錯誤: $($_.Exception.Message)" "ERROR"
        return $false
    }
}

# 檢查所有容器並重啟停止的
function Check-And-Restart-Services {
    Write-Log "開始檢查服務狀態..." "INFO"
    
    # 檢查 Docker
    if (-not (Test-Docker)) {
        Write-Log "❌ Docker 未運行！" "ERROR"
        Write-Log "嘗試啟動 Docker Desktop..." "WARNING"
        
        try {
            Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
            Write-Log "Docker Desktop 已啟動，等待 30 秒..." "INFO"
            Start-Sleep -Seconds 30
            
            # 重新檢查
            if (Test-Docker) {
                Write-Log "✅ Docker 已啟動" "SUCCESS"
            }
            else {
                Write-Log "❌ Docker 啟動失敗，請手動檢查" "ERROR"
                return
            }
        }
        catch {
            Write-Log "❌ 無法啟動 Docker: $($_.Exception.Message)" "ERROR"
            return
        }
    }
    
    # 檢查每個服務
    $restartNeeded = $false
    
    foreach ($service in $Services) {
        $isRunning = Get-ContainerStatus -ContainerName $service
        
        if ($isRunning) {
            Write-Log "✅ $service - 運行中" "INFO"
        }
        else {
            Write-Log "❌ $service - 未運行" "ERROR"
            
            if (Restart-Container -ContainerName $service) {
                $restartNeeded = $true
            }
        }
    }
    
    if ($restartNeeded) {
        Write-Log "⚠️  已重啟停止的服務，等待 10 秒讓服務就緒..." "WARNING"
        Start-Sleep -Seconds 10
        
        # 等待健康檢查
        Write-Log "等待健康檢查..." "INFO"
        Start-Sleep -Seconds 20
        
        # 再次檢查
        Write-Log "最終狀態檢查..." "INFO"
        foreach ($service in $Services) {
            $isRunning = Get-ContainerStatus -ContainerName $service
            if ($isRunning) {
                Write-Log "✅ $service - 運行中" "SUCCESS"
            }
            else {
                Write-Log "❌ $service - 仍然停止，需要手動干預！" "ERROR"
            }
        }
    }
    
    Write-Log "檢查完成！" "INFO"
    Write-Log "----------------------------------------" "INFO"
}

# 清理舊日誌（保留最近 7 天）
function Clean-OldLogs {
    try {
        $logDir = Split-Path $LogFile
        $cutoffDate = (Get-Date).AddDays(-7)
        
        Get-ChildItem -Path $logDir -Filter "*.log" | 
            Where-Object { $_.LastWriteTime -lt $cutoffDate } |
            ForEach-Object {
                Remove-Item $_.FullName -Force
                Write-Log "清理舊日誌: $($_.Name)" "INFO"
            }
    }
    catch {
        Write-Log "清理日誌時出錯: $($_.Exception.Message)" "WARNING"
    }
}

# 主循環
Write-Log "========================================" "INFO"
Write-Log "服務監控守護進程啟動" "INFO"
Write-Log "檢查間隔: $CheckInterval 秒" "INFO"
Write-Log "========================================" "INFO"
Write-Log "" "INFO"

# 清理舊日誌
Clean-OldLogs

if ($OneTime) {
    # 單次運行
    Check-And-Restart-Services
    Write-Log "單次檢查完成！" "INFO"
}
else {
    # 持續監控
    while ($true) {
        Check-And-Restart-Services
        Write-Log "等待 $CheckInterval 秒後進行下一次檢查..." "INFO"
        Write-Log "" "INFO"
        
        Start-Sleep -Seconds $CheckInterval
        
        # 每天清理一次日誌
        if ((Get-Date).Hour -eq 3 -and (Get-Date).Minute -lt $CheckInterval) {
            Clean-OldLogs
        }
    }
}
