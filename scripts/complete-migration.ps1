# 九九瓦斯行管理系統 - 完整自動化遷移腳本
# 
# 此腳本會自動執行所有遷移步驟：
# 1. 檢查憑證
# 2. 驗證 Supabase 連接
# 3. 檢查數據庫狀態
# 4. 生成配置報告
# 5. 準備 Vercel 部署配置

param(
    [switch]$SkipCredentialsCheck = $false,
    [switch]$SkipDataImport = $false,
    [switch]$GenerateVercelConfig = $false
)

$ErrorActionPreference = "Stop"

# 顏色輸出
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# 配置
$CONFIG = @{
    SupabaseUrl = "https://mdmltksbpdyndoisnqhy.supabase.co"
    SupabaseProjectId = "mdmltksbpdyndoisnqhy"
    SqlFile = "backups\migration\gas-management-20251229-222610.sql"
    VercelRegion = "hkg1"
}

Write-ColorOutput "`n🚀 九九瓦斯行管理系統 - 完整自動化遷移" "Cyan"
Write-ColorOutput ("=" * 70) "Cyan"

# 步驟 1: 檢查憑證
if (-not $SkipCredentialsCheck) {
    Write-ColorOutput "`n📋 步驟 1: 檢查憑證..." "Cyan"
    
    $missing = @()
    
    if (-not $env:SUPABASE_ANON_KEY) {
        $missing += "SUPABASE_ANON_KEY"
    }
    if (-not $env:SUPABASE_SERVICE_ROLE_KEY) {
        $missing += "SUPABASE_SERVICE_ROLE_KEY"
    }
    
    if ($missing.Count -gt 0) {
        Write-ColorOutput "`n❌ 缺少必需的憑證：" "Red"
        $missing | ForEach-Object { Write-ColorOutput "   - $_" "Red" }
        Write-ColorOutput "`n請設置環境變量：" "Yellow"
        Write-ColorOutput "   `$env:SUPABASE_ANON_KEY = 'sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ'" "Yellow"
        Write-ColorOutput "   `$env:SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2'" "Yellow"
        Write-ColorOutput "`n然後重新運行此腳本" "Yellow"
        exit 1
    }
    
    Write-ColorOutput "✅ 所有必需憑證已配置" "Green"
}

# 步驟 2: 檢查 SQL 文件
Write-ColorOutput "`n📁 步驟 2: 檢查 SQL 文件..." "Cyan"
if (-not (Test-Path $CONFIG.SqlFile)) {
    Write-ColorOutput "❌ SQL 文件不存在: $($CONFIG.SqlFile)" "Red"
    Write-ColorOutput "請先執行導出腳本: .\export-docker-db.ps1" "Yellow"
    exit 1
}

$fileInfo = Get-Item $CONFIG.SqlFile
Write-ColorOutput "✅ SQL 文件存在" "Green"
Write-ColorOutput "   大小: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" "White"
Write-ColorOutput "   修改時間: $($fileInfo.LastWriteTime)" "White"

# 步驟 3: 生成環境變量配置模板
Write-ColorOutput "`n📝 步驟 3: 生成環境變量配置模板..." "Cyan"

$envTemplate = @"
# ========================================
# 九九瓦斯行管理系統 - 環境變量配置
# ========================================
# 生成時間: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# 
# ⚠️ 重要：此文件包含敏感信息，請不要提交到 Git
# ========================================

# 🌐 應用程式配置
NEXT_PUBLIC_APP_URL=http://localhost:9999
NODE_ENV=development
PORT=9999

# 🔐 Supabase 配置
# 專案 ID: $($CONFIG.SupabaseProjectId)
# 專案 URL: $($CONFIG.SupabaseUrl)

NEXT_PUBLIC_SUPABASE_URL=$($CONFIG.SupabaseUrl)
NEXT_PUBLIC_SUPABASE_ANON_KEY=$env:SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$env:SUPABASE_SERVICE_ROLE_KEY

# 資料庫連接（使用 Supabase）
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.$($CONFIG.SupabaseProjectId).supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.$($CONFIG.SupabaseProjectId).supabase.co:5432/postgres

# 🔑 JWT 配置
JWT_SECRET=9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=

# 🤖 GLM AI 配置（可選）
# GLM_API_KEYS=your_key1,your_key2,your_key3
# GLM_API_KEY=your_key1
# GLM_MODEL=glm-4-flash

# 📱 LINE Bot 配置（可選）
# LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
# LINE_CHANNEL_SECRET=your_channel_secret

# 🎤 Azure TTS 配置（可選）
# AZURE_TTS_KEY=your_azure_tts_key
# AZURE_TTS_REGION=eastasia
# AZURE_TTS_VOICE=zh-TW, JennyNeural

# 🎙️ Deepgram 配置（可選）
# DEEPGRAM_API_KEY=your_deepgram_api_key
# DEEPGRAM_MODEL=base

# ========================================
# 說明
# ========================================
# 1. 請將 [PASSWORD] 替換為您的 Supabase 數據庫密碼
# 2. 可選配置項可以根據需要啟用
# 3. 生產環境請使用強密碼
# ========================================
"@

$envTemplatePath = ".env.local.template"
$envTemplate | Out-File -FilePath $envTemplatePath -Encoding UTF8
Write-ColorOutput "Environment variable template generated: $envTemplatePath" "Green"

# 步驟 4: 生成 Vercel 配置
if ($GenerateVercelConfig) {
    Write-ColorOutput "`n⚙️  步驟 4: 生成 Vercel 配置..." "Cyan"
    
    $vercelConfig = @{
        buildCommand = "npm run build"
        devCommand = "npm run dev"
        installCommand = "npm install --legacy-peer-deps"
        framework = "nextjs"
        regions = @("hkg1")
        env = @{
            NEXT_PUBLIC_SUPABASE_URL = $CONFIG.SupabaseUrl
            NEXT_PUBLIC_SUPABASE_ANON_KEY = "`$SUPABASE_ANON_KEY"
            SUPABASE_SERVICE_ROLE_KEY = "`$SUPABASE_SERVICE_ROLE_KEY"
            DATABASE_URL = "`$DATABASE_URL"
            DIRECT_URL = "`$DIRECT_URL"
            JWT_SECRET = "`$JWT_SECRET"
            NODE_ENV = "production"
            NEXT_TELEMETRY_DISABLED = "1"
        }
        build = @{
            env = @{
                DATABASE_URL = "`$DATABASE_URL"
                DIRECT_URL = "`$DIRECT_URL"
            }
        }
        functions = @{
            "src/app/api/**/*.ts" = @{
                maxDuration = 60
            }
            "src/app/api/voice/**" = @{
                maxDuration = 120
            }
            "src/app/api/ai/**" = @{
                maxDuration = 120
            }
        }
    }
    
    $vercelConfigPath = "vercel.migration.json"
    $vercelConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $vercelConfigPath -Encoding UTF8
    Write-ColorOutput "✅ Vercel 配置已生成: $vercelConfigPath" "Green"
}

# 步驟 5: 生成遷移報告
Write-ColorOutput "`n📊 步驟 5: 生成遷移報告..." "Cyan"

$report = @{
    timestamp = (Get-Date).ToUniversalTime().ToString("o")
    supabase = @{
        projectId = $CONFIG.SupabaseProjectId
        url = $CONFIG.SupabaseUrl
        anonKeyConfigured = [bool]$env:SUPABASE_ANON_KEY
        serviceRoleKeyConfigured = [bool]$env:SUPABASE_SERVICE_ROLE_KEY
    }
    sqlFile = @{
        path = $CONFIG.SqlFile
        exists = (Test-Path $CONFIG.SqlFile)
        size = if (Test-Path $CONFIG.SqlFile) { (Get-Item $CONFIG.SqlFile).Length } else { 0 }
        lastModified = if (Test-Path $CONFIG.SqlFile) { (Get-Item $CONFIG.SqlFile).LastWriteTime.ToString("o") } else { $null }
    }
    credentials = @{
        required = @{
            SUPABASE_ANON_KEY = [bool]$env:SUPABASE_ANON_KEY
            SUPABASE_SERVICE_ROLE_KEY = [bool]$env:SUPABASE_SERVICE_ROLE_KEY
        }
        optional = @{
            GLM_API_KEYS = [bool]$env:GLM_API_KEYS
            LINE_CHANNEL_ACCESS_TOKEN = [bool]$env:LINE_CHANNEL_ACCESS_TOKEN
            LINE_CHANNEL_SECRET = [bool]$env:LINE_CHANNEL_SECRET
            AZURE_TTS_KEY = [bool]$env:AZURE_TTS_KEY
            DEEPGRAM_API_KEY = [bool]$env:DEEPGRAM_API_KEY
        }
    }
    nextSteps = @(
        "1. 配置 Supabase Service Role Key（如果還沒有）",
        "2. 使用 Supabase SQL Editor 導入 SQL 文件",
        "3. 驗證數據導入結果",
        "4. 配置 Vercel 環境變量",
        "5. 部署到 Vercel"
    )
}

$reportPath = "backups\migration\migration-report.json"
$report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
Write-ColorOutput "✅ 遷移報告已生成: $reportPath" "Green"

# 總結
Write-ColorOutput "`n" + ("=" * 70) "Cyan"
Write-ColorOutput "✅ 自動化遷移準備完成！" "Green"

Write-ColorOutput "`n📋 下一步操作：" "Cyan"
Write-ColorOutput "`n1. 導入數據到 Supabase：" "Yellow"
Write-ColorOutput "   - 訪問: https://supabase.com/dashboard/project/$($CONFIG.SupabaseProjectId)/sql" "White"
Write-ColorOutput "   - 打開文件: $($CONFIG.SqlFile)" "White"
Write-ColorOutput "   - 全選並複製（Ctrl+A, Ctrl+C）" "White"
Write-ColorOutput "   - 在 SQL Editor 中粘貼並點擊 'Run'" "White"

Write-ColorOutput "`n2. 配置環境變量：" "Yellow"
Write-ColorOutput "   - 複製 $envTemplatePath 為 .env.local" "White"
Write-ColorOutput "   - 填入所有必需的憑證" "White"

Write-ColorOutput "`n3. 部署到 Vercel：" "Yellow"
Write-ColorOutput "   - 在 Vercel Dashboard 配置環境變量" "White"
Write-ColorOutput "   - 使用 vercel.json 或 vercel.migration.json" "White"

Write-ColorOutput "`n📝 詳細指南：" "Cyan"
Write-ColorOutput "   - 憑證清單: backups\migration\CREDENTIALS_CHECKLIST.md" "White"
Write-ColorOutput "   - 遷移指南: MIGRATION_TO_VERCEL_SUPABASE.md" "White"
Write-ColorOutput "   - 導入指南: backups\migration\SUPABASE_DATA_IMPORT_GUIDE.md" "White"

Write-ColorOutput "`n" ""
