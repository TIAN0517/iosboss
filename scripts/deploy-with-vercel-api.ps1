# 使用 Vercel API 自動化部署和配置
# 包含環境變數設置和域名配置

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🚀 使用 Vercel API 自動化部署" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# 配置
$CONFIG = @{
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    TeamId = "bossjy"  # 從截圖中看到的團隊名稱
    ProjectName = "bossai-ten"
    Domain = "bossai.jytian.it.com"
}

# 環境變數配置
$ENV_VARS = @{
    "NEXT_PUBLIC_SUPABASE_URL" = "https://mdmltksbpdyndoisnqhy.supabase.co"
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" = "sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ"
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" = "sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2"
    "SUPABASE_JWT_SECRET" = "JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ=="
    "GLM_API_KEYS" = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    "GLM_API_KEY" = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    "NODE_ENV" = "production"
    "NEXT_TELEMETRY_DISABLED" = "1"
}

# Vercel API 端點
$API_BASE = "https://api.vercel.com"

# 獲取專案信息
Write-ColorOutput "`n[步驟 1] 獲取專案信息..." "Blue"

try {
    $headers = @{
        "Authorization" = "Bearer $($CONFIG.VercelApiKey)"
    }
    
    $projectUrl = "$API_BASE/v9/projects/$($CONFIG.ProjectName)?teamId=$($CONFIG.TeamId)"
    $projectResponse = Invoke-RestMethod -Uri $projectUrl -Method Get -Headers $headers -ErrorAction Stop
    
    Write-ColorOutput "  [OK] 專案找到: $($projectResponse.name)" "Green"
    $projectId = $projectResponse.id
} catch {
    Write-ColorOutput "  [Warning] 無法獲取專案信息: $_" "Yellow"
    Write-ColorOutput "  將使用專案名稱: $($CONFIG.ProjectName)" "Cyan"
    $projectId = $CONFIG.ProjectName
}

# 配置環境變數
Write-ColorOutput "`n[步驟 2] 配置環境變數..." "Blue"

foreach ($envVar in $ENV_VARS.GetEnumerator()) {
    try {
        $body = @{
            key = $envVar.Key
            value = $envVar.Value
            type = "encrypted"
            target = @("production", "preview", "development")
        } | ConvertTo-Json
        
        $envUrl = "$API_BASE/v9/projects/$projectId/env?teamId=$($CONFIG.TeamId)"
        $envResponse = Invoke-RestMethod -Uri $envUrl -Method Post -Headers $headers -Body $body -ContentType "application/json" -ErrorAction Stop
        
        Write-ColorOutput "  [OK] 已添加: $($envVar.Key)" "Green"
    } catch {
        Write-ColorOutput "  [Warning] 無法添加 $($envVar.Key): $_" "Yellow"
    }
}

# 檢查域名配置
Write-ColorOutput "`n[步驟 3] 檢查域名配置..." "Blue"

try {
    $domainUrl = "$API_BASE/v5/domains/$($CONFIG.Domain)?teamId=$($CONFIG.TeamId)"
    $domainResponse = Invoke-RestMethod -Uri $domainUrl -Method Get -Headers $headers -ErrorAction Stop
    
    Write-ColorOutput "  [OK] 域名已配置: $($CONFIG.Domain)" "Green"
    Write-ColorOutput "  狀態: $($domainResponse.verified ? '已驗證' : '等待驗證')" "Cyan"
} catch {
    Write-ColorOutput "  [Info] 域名配置需要手動在 Dashboard 中完成" "Yellow"
    Write-ColorOutput "  域名: $($CONFIG.Domain)" "Cyan"
}

# 觸發部署
Write-ColorOutput "`n[步驟 4] 觸發部署..." "Blue"

try {
    $deployUrl = "$API_BASE/v13/deployments?teamId=$($CONFIG.TeamId)"
    $deployBody = @{
        name = $CONFIG.ProjectName
        target = "production"
    } | ConvertTo-Json
    
    $deployResponse = Invoke-RestMethod -Uri $deployUrl -Method Post -Headers $headers -Body $deployBody -ContentType "application/json" -ErrorAction Stop
    
    Write-ColorOutput "  [OK] 部署已觸發！" "Green"
    Write-ColorOutput "  部署 URL: $($deployResponse.url)" "Cyan"
} catch {
    Write-ColorOutput "  [Warning] 無法觸發部署: $_" "Yellow"
    Write-ColorOutput "  請手動在 Vercel Dashboard 中部署" "Cyan"
}

# 總結
Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "[完成] 自動化配置完成！" "Green"
Write-ColorOutput "============================================================" "Cyan"

Write-ColorOutput "`n[下一步]" "Yellow"
Write-ColorOutput "  1. 檢查 Vercel Dashboard 確認環境變數已添加" "Cyan"
Write-ColorOutput "  2. 等待部署完成" "Cyan"
Write-ColorOutput "  3. 等待 DNS 傳播完成（域名生效）" "Cyan"
Write-ColorOutput "  4. 訪問 https://$($CONFIG.Domain) 測試網站" "Cyan"

Write-ColorOutput "`n"
