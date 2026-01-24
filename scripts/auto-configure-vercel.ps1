# 使用 Vercel API 自動配置環境變數
# 這會自動添加所有必要的環境變數到 Vercel 專案

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🔧 自動配置 Vercel 環境變數" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# 配置
$CONFIG = @{
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    TeamId = "bossjy"
    ProjectName = "bossai-ten"
}

# 環境變數
$ENV_VARS = @(
    @{ key = "NEXT_PUBLIC_SUPABASE_URL"; value = "https://mdmltksbpdyndoisnqhy.supabase.co" },
    @{ key = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"; value = "sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ" },
    @{ key = "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"; value = "sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2" },
    @{ key = "SUPABASE_JWT_SECRET"; value = "JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==" },
    @{ key = "GLM_API_KEYS"; value = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn" },
    @{ key = "GLM_API_KEY"; value = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn" },
    @{ key = "NODE_ENV"; value = "production" },
    @{ key = "NEXT_TELEMETRY_DISABLED"; value = "1" }
)

# API 端點
$API_BASE = "https://api.vercel.com"
$headers = @{
    "Authorization" = "Bearer $($CONFIG.VercelApiKey)"
    "Content-Type" = "application/json"
}

# 獲取專案 ID
Write-ColorOutput "`n[步驟 1] 獲取專案信息..." "Blue"

try {
    $projectUrl = "$API_BASE/v9/projects/$($CONFIG.ProjectName)?teamId=$($CONFIG.TeamId)"
    $project = Invoke-RestMethod -Uri $projectUrl -Method Get -Headers $headers -ErrorAction Stop
    Write-ColorOutput "  [OK] 專案找到: $($project.name)" "Green"
    $projectId = $project.id
} catch {
    Write-ColorOutput "  [Error] 無法獲取專案: $_" "Red"
    Write-ColorOutput "  請確認專案名稱和團隊 ID 是否正確" "Yellow"
    exit 1
}

# 配置環境變數
Write-ColorOutput "`n[步驟 2] 配置環境變數..." "Blue"

$successCount = 0
$failCount = 0

foreach ($envVar in $ENV_VARS) {
    try {
        $body = @{
            key = $envVar.key
            value = $envVar.value
            type = "encrypted"
            target = @("production", "preview", "development")
        } | ConvertTo-Json -Compress
        
        $envUrl = "$API_BASE/v9/projects/$projectId/env?teamId=$($CONFIG.TeamId)"
        $response = Invoke-RestMethod -Uri $envUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
        
        Write-ColorOutput "  [OK] 已添加: $($envVar.key)" "Green"
        $successCount++
    } catch {
        # 檢查是否已存在
        if ($_.Exception.Response.StatusCode -eq 400) {
            Write-ColorOutput "  [Info] 已存在: $($envVar.key) (跳過)" "Yellow"
            $successCount++
        } else {
            Write-ColorOutput "  [Warning] 無法添加 $($envVar.key): $_" "Yellow"
            $failCount++
        }
    }
}

Write-ColorOutput "`n[結果] 成功: $successCount, 失敗: $failCount" "Cyan"

# 總結
Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "[完成] 環境變數配置完成！" "Green"
Write-ColorOutput "============================================================" "Cyan"

Write-ColorOutput "`n[下一步]" "Yellow"
Write-ColorOutput "  1. 訪問 Vercel Dashboard" "Cyan"
Write-ColorOutput "  2. 進入專案 → Deployments" "Cyan"
Write-ColorOutput "  3. 點擊「Redeploy」或「Deploy」按鈕" "Cyan"
Write-ColorOutput "  4. 等待部署完成" "Cyan"

Write-ColorOutput "`n[重要]" "Yellow"
Write-ColorOutput "  環境變數已自動配置完成！" "Green"
Write-ColorOutput "  現在只需要在 Dashboard 中點擊「Deploy」即可！" "Cyan"

Write-ColorOutput "`n"
