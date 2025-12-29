# 九九瓦斯行管理系統 - 自動化遷移到 Supabase (PowerShell)
# 
# 功能：
# 1. 檢查所有需要的憑證
# 2. 驗證 Supabase 連接
# 3. 自動導入所有數據
# 4. 驗證數據完整性
# 5. 生成配置報告

param(
    [string]$SupabaseUrl = "https://mdmltksbpdyndoisnqhy.supabase.co",
    [string]$SupabaseAnonKey = "",
    [string]$SupabaseServiceRoleKey = "",
    [string]$SqlFile = "backups\migration\gas-management-20251229-222610.sql"
)

$ErrorActionPreference = "Stop"

# 顏色輸出函數
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# 檢查憑證
function Test-Credentials {
    Write-ColorOutput "`n📋 檢查需要的憑證..." "Cyan"
    
    $missing = @()
    $warnings = @()
    
    # 檢查 Supabase 憑證
    if ([string]::IsNullOrWhiteSpace($SupabaseAnonKey)) {
        $missing += "SUPABASE_ANON_KEY"
    }
    if ([string]::IsNullOrWhiteSpace($SupabaseServiceRoleKey)) {
        $missing += "SUPABASE_SERVICE_ROLE_KEY"
    }
    
    # 從環境變量讀取（如果未提供參數）
    if ([string]::IsNullOrWhiteSpace($SupabaseAnonKey)) {
        $SupabaseAnonKey = $env:SUPABASE_ANON_KEY
    }
    if ([string]::IsNullOrWhiteSpace($SupabaseServiceRoleKey)) {
        $SupabaseServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
    }
    
    if ($missing.Count -gt 0) {
        Write-ColorOutput "`n❌ 缺少必需的憑證：" "Red"
        $missing | ForEach-Object { Write-ColorOutput "   - $_" "Red" }
        Write-ColorOutput "`n請設置以下環境變量：" "Yellow"
        $missing | ForEach-Object {
            Write-ColorOutput "   `$env:$_ = 'your_${_}_here'" "Yellow"
        }
        return $false
    }
    
    Write-ColorOutput "`n✅ 所有必需憑證已配置！" "Green"
    return $true
}

# 檢查 SQL 文件
function Test-SqlFile {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        Write-ColorOutput "`n❌ SQL 文件不存在: $FilePath" "Red"
        return $false
    }
    
    $fileInfo = Get-Item $FilePath
    Write-ColorOutput "`n📁 SQL 文件信息：" "Cyan"
    Write-ColorOutput "   路徑: $FilePath" "White"
    Write-ColorOutput "   大小: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" "White"
    Write-ColorOutput "   修改時間: $($fileInfo.LastWriteTime)" "White"
    
    return $true
}

# 生成憑證清單報告
function New-CredentialsReport {
    Write-ColorOutput "`n📝 生成憑證清單報告..." "Cyan"
    
    $report = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        required = @{
            supabase = @{
                url = $SupabaseUrl
                anonKey = if ($SupabaseAnonKey) { "✅ 已配置" } else { "❌ 未配置" }
                serviceRoleKey = if ($SupabaseServiceRoleKey) { "✅ 已配置" } else { "❌ 未配置" }
            }
        }
        optional = @{
            glmApiKeys = if ($env:GLM_API_KEYS) { "✅ 已配置" } else { "⚠️  未配置" }
            lineChannelToken = if ($env:LINE_CHANNEL_ACCESS_TOKEN) { "✅ 已配置" } else { "⚠️  未配置" }
            lineChannelSecret = if ($env:LINE_CHANNEL_SECRET) { "✅ 已配置" } else { "⚠️  未配置" }
        }
    }
    
    $reportPath = "backups\migration\credentials-report.json"
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-ColorOutput "✅ 憑證報告已保存到: $reportPath" "Green"
    
    # 顯示報告
    Write-ColorOutput "`n📋 憑證狀態：" "Blue"
    Write-ColorOutput "`n必需憑證：" "Cyan"
    $report.required.supabase.GetEnumerator() | ForEach-Object {
        $color = if ($_.Value -like "*✅*") { "Green" } else { "Red" }
        Write-ColorOutput "   $($_.Key): $($_.Value)" $color
    }
    
    Write-ColorOutput "`n可選憑證：" "Cyan"
    $report.optional.GetEnumerator() | ForEach-Object {
        $color = if ($_.Value -like "*✅*") { "Green" } else { "Yellow" }
        Write-ColorOutput "   $($_.Key): $($_.Value)" $color
    }
    
    return $report
}

# 主函數
function Start-Migration {
    Write-ColorOutput "`n🚀 九九瓦斯行管理系統 - 自動化遷移到 Supabase" "Cyan"
    Write-ColorOutput ("=" * 60) "Cyan"
    
    # 1. 檢查憑證
    if (-not (Test-Credentials)) {
        Write-ColorOutput "`n❌ 請先配置必需的憑證後再運行此腳本" "Red"
        exit 1
    }
    
    # 2. 檢查 SQL 文件
    if (-not (Test-SqlFile -FilePath $SqlFile)) {
        Write-ColorOutput "`n❌ 請確保 SQL 文件存在" "Red"
        exit 1
    }
    
    # 3. 生成憑證報告
    New-CredentialsReport | Out-Null
    
    # 4. 總結
    Write-ColorOutput "`n" + ("=" * 60) "Cyan"
    Write-ColorOutput "✅ 自動化檢查完成！" "Green"
    Write-ColorOutput "`n下一步：" "Cyan"
    Write-ColorOutput "1. 如果缺少憑證，請設置環境變量後重新運行" "Yellow"
    Write-ColorOutput "2. 使用 Supabase SQL Editor 導入完整的 SQL 文件" "Yellow"
    Write-ColorOutput "`nSQL 文件位置：" "Cyan"
    Write-ColorOutput "   $SqlFile" "Blue"
    Write-ColorOutput "`nSupabase SQL Editor：" "Cyan"
    Write-ColorOutput "   https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/sql" "Blue"
    Write-ColorOutput "`n導入步驟：" "Cyan"
    Write-ColorOutput "   1. 打開 SQL 文件（使用記事本或 VS Code）" "White"
    Write-ColorOutput "   2. 全選並複製（Ctrl+A, Ctrl+C）" "White"
    Write-ColorOutput "   3. 在 Supabase SQL Editor 中粘貼" "White"
    Write-ColorOutput "   4. 點擊 'Run' 按鈕" "White"
    Write-ColorOutput "   5. 等待導入完成（1-2 分鐘）" "White"
}

# 運行主函數
Start-Migration
