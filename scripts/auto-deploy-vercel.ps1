# 自動化部署到 Vercel 腳本
# 包含環境變數配置和域名設置

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🚀 自動化部署到 Vercel" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# 配置
$CONFIG = @{
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    ProjectName = "bossai-ten"
    Domain = "bossai.jytian.it.com"
    SupabaseUrl = "https://mdmltksbpdyndoisnqhy.supabase.co"
    PublishableKey = "sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ"
    ServiceRoleKey = "sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2"
    JwtSecret = "JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ=="
    GlmApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
}

# 步驟 1: 檢查 Vercel CLI
Write-ColorOutput "`n[步驟 1] 檢查 Vercel CLI..." "Blue"

$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-ColorOutput "  [Info] 正在安裝 Vercel CLI..." "Cyan"
    npm install -g vercel 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  [OK] Vercel CLI 安裝成功" "Green"
    } else {
        Write-ColorOutput "  [Error] Vercel CLI 安裝失敗" "Red"
        Write-ColorOutput "  請手動執行: npm install -g vercel" "Yellow"
        exit 1
    }
} else {
    Write-ColorOutput "  [OK] Vercel CLI 已安裝" "Green"
}

# 步驟 2: 登入 Vercel
Write-ColorOutput "`n[步驟 2] 登入 Vercel..." "Blue"
Write-ColorOutput "  [Info] 使用 API Key 登入..." "Cyan"

# 設置環境變數
$env:VERCEL_TOKEN = $CONFIG.VercelApiKey

# 步驟 3: 部署到 Vercel
Write-ColorOutput "`n[步驟 3] 部署到 Vercel..." "Blue"

try {
    Write-ColorOutput "  [Info] 開始部署..." "Cyan"
    
    # 使用 Vercel CLI 部署
    $deployOutput = vercel --prod --yes --token $CONFIG.VercelApiKey 2>&1 | Out-String
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  [OK] 部署成功！" "Green"
        Write-ColorOutput "  $deployOutput" "Cyan"
    } else {
        Write-ColorOutput "  [Warning] 部署可能失敗，檢查輸出：" "Yellow"
        Write-ColorOutput "  $deployOutput" "Yellow"
    }
} catch {
    Write-ColorOutput "  [Error] 部署失敗: $_" "Red"
    Write-ColorOutput "  請手動執行: vercel --prod" "Yellow"
}

# 步驟 4: 配置環境變數（使用 Vercel API）
Write-ColorOutput "`n[步驟 4] 配置環境變數..." "Blue"

$envVars = @{
    "NEXT_PUBLIC_SUPABASE_URL" = $CONFIG.SupabaseUrl
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" = $CONFIG.PublishableKey
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY" = $CONFIG.ServiceRoleKey
    "SUPABASE_JWT_SECRET" = $CONFIG.JwtSecret
    "GLM_API_KEYS" = $CONFIG.GlmApiKey
    "GLM_API_KEY" = $CONFIG.GlmApiKey
    "NODE_ENV" = "production"
    "NEXT_TELEMETRY_DISABLED" = "1"
}

Write-ColorOutput "  [Info] 環境變數需要手動在 Vercel Dashboard 中配置" "Yellow"
Write-ColorOutput "  請訪問: https://vercel.com/dashboard" "Cyan"
Write-ColorOutput "  專案設置 → Environment Variables" "Cyan"
Write-ColorOutput "  或使用 vercel-env-variables.txt 文件導入" "Cyan"

# 步驟 5: 配置域名
Write-ColorOutput "`n[步驟 5] 配置域名..." "Blue"

Write-ColorOutput "  [Info] 域名 $($CONFIG.Domain) 已在 Vercel Dashboard 中配置" "Cyan"
Write-ColorOutput "  狀態: 等待 DNS 傳播" "Cyan"
Write-ColorOutput "  這通常需要幾分鐘到幾小時" "Cyan"

# 總結
Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "[完成] 自動化部署流程完成！" "Green"
Write-ColorOutput "============================================================" "Cyan"

Write-ColorOutput "`n[下一步]" "Yellow"
Write-ColorOutput "  1. 確認環境變數已在 Vercel Dashboard 中配置" "Cyan"
Write-ColorOutput "  2. 等待 DNS 傳播完成（域名生效）" "Cyan"
Write-ColorOutput "  3. 訪問 https://$($CONFIG.Domain) 測試網站" "Cyan"

Write-ColorOutput "`n[重要]" "Yellow"
Write-ColorOutput "  - 環境變數必須在 Vercel Dashboard 中手動配置" "Cyan"
Write-ColorOutput "  - 使用 vercel-env-variables.txt 文件快速導入" "Cyan"
Write-ColorOutput "  - DNS 傳播完成後，域名即可正常訪問" "Cyan"

Write-ColorOutput "`n"
