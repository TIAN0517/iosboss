# ========================================
# Windows 任務計劃器安裝腳本
# 九九瓦斯行管理系統
# 功能：設置開機自動啟動監控守護進程
# ========================================

param(
    [switch]$Uninstall = $false
)

# 配置
$TaskName = "JYT-Gas-Services-Monitor"
$ScriptPath = Join-Path $PSScriptRoot "start-with-monitor.bat"
$Description = "九九瓦斯行管理系統 - 服務監控守護進程"
$WorkingDirectory = $PSScriptRoot

# 管理員權限檢查
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "錯誤：需要管理員權限！" -ForegroundColor Red
    Write-Host "請右鍵單擊此腳本並選擇「以管理員身份運行」" -ForegroundColor Yellow
    exit 1
}

# 檢查腳本是否存在
if (-not (Test-Path $ScriptPath)) {
    Write-Host "錯誤：找不到啟動腳本！" -ForegroundColor Red
    Write-Host "   腳本路徑: $ScriptPath" -ForegroundColor Yellow
    exit 1
}

# 卸載任務
if ($Uninstall) {
    Write-Host "正在卸載任務計劃..." -ForegroundColor Yellow
    
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Write-Host "任務計劃已卸載！" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Message -like "*not found*") {
            Write-Host "任務計劃不存在，無需卸載。" -ForegroundColor Yellow
        }
        else {
            Write-Host "卸載失敗: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    }
    
    exit 0
}

# 創建任務
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "安裝 Windows 任務計劃器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    # 創建觸發器：開機時 + 登錄時
    $triggerBoot = New-ScheduledTaskTrigger -AtStartup
    $triggerLogon = New-ScheduledTaskTrigger -AtLogon
    
    # 設置延遲（確保網絡和 Docker 已就緒）
    $triggerBoot.Delay = "PT2M"
    $triggerLogon.Delay = "PT30S"
    
    # 創建動作：運行批處理腳本
    $action = New-ScheduledTaskAction `
        -Execute "cmd.exe" `
        -Argument "/c $ScriptPath" `
        -WorkingDirectory $WorkingDirectory
    
    # 任務設置
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 5) `
        -ExecutionTimeLimit (New-TimeSpan -Days 365) `
        -DontStopOnIdleEnd `
        -RunOnlyIfNetworkAvailable `
        -WakeToRun `
        -Compatibility Win8
    
    # 註冊任務
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $triggerBoot, $triggerLogon `
        -Settings $settings `
        -Description $Description `
        -RunLevel Highest `
        -Force `
        -ErrorAction Stop
    
    Write-Host "任務計劃安裝成功！" -ForegroundColor Green
    Write-Host "任務詳情:" -ForegroundColor Cyan
    Write-Host "  名稱: $TaskName" -ForegroundColor White
    Write-Host "  描述: $Description" -ForegroundColor White
    Write-Host "  腳本: $ScriptPath" -ForegroundColor White
    Write-Host "  工作目錄: $WorkingDirectory" -ForegroundColor White
    Write-Host "  運行權限: 最高" -ForegroundColor White
    Write-Host "觸發條件:" -ForegroundColor Cyan
    Write-Host "  開機時（延遲 2 分鐘）" -ForegroundColor White
    Write-Host "  用戶登錄時（延遲 30 秒）" -ForegroundColor White
    Write-Host "重試策略:" -ForegroundColor Cyan
    Write-Host "  失敗後每 5 分鐘重試，最多 3 次" -ForegroundColor White
    Write-Host "網絡要求:" -ForegroundColor Cyan
    Write-Host "  僅在網絡可用時運行" -ForegroundColor White
    
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "安裝完成！" -ForegroundColor Green
    Write-Host "現在當您：" -ForegroundColor Yellow
    Write-Host "  1. 重啟電腦時" -ForegroundColor White
    Write-Host "  2. 重新登錄時" -ForegroundColor White
    Write-Host "系統會自動啟動監控守護進程！" -ForegroundColor Green
    Write-Host "手動管理任務:" -ForegroundColor Cyan
    Write-Host "  查看任務: taskschd.msc" -ForegroundColor Gray
    Write-Host "  執行任務: schtasks /run /tn $TaskName" -ForegroundColor Gray
    Write-Host "  卸載任務: .\install-scheduled-task.ps1 -Uninstall" -ForegroundColor Gray
    
}
catch {
    Write-Host "任務安裝失敗！" -ForegroundColor Red
    Write-Host "錯誤: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "按任意鍵退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
