# Vercel 自動化部署腳本
# 用於自動部署到 Vercel

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🚀 Vercel 自動化部署" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# 檢查 Vercel CLI
Write-ColorOutput "`n📦 檢查 Vercel CLI..." "Blue"
try {
    $version = vercel --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✅ Vercel CLI 已安裝: $version" "Green"
    } else {
        throw "Vercel CLI 未安裝"
    }
} catch {
    Write-ColorOutput "  ❌ Vercel CLI 未安裝" "Red"
    Write-ColorOutput "`n💡 安裝方法：" "Yellow"
    Write-ColorOutput "   npm install -g vercel" "Cyan"
    Write-ColorOutput "`n   或訪問: https://vercel.com/docs/cli" "Cyan"
    exit 1
}

# 檢查 Git 狀態
Write-ColorOutput "`n📋 檢查 Git 狀態..." "Blue"
try {
    $gitStatus = git status --short 2>$null
    if ($gitStatus) {
        Write-ColorOutput "  ⚠️  有未提交的更改" "Yellow"
        Write-ColorOutput "     建議先提交更改：" "Yellow"
        Write-ColorOutput "     git add ." "Cyan"
        Write-ColorOutput "     git commit -m '配置 Supabase 和環境變數'" "Cyan"
    } else {
        Write-ColorOutput "  ✅ Git 工作區乾淨" "Green"
    }
} catch {
    Write-ColorOutput "  ⚠️  無法檢查 Git 狀態" "Yellow"
}

# 檢查環境變數
Write-ColorOutput "`n🔍 檢查環境變數配置..." "Blue"
$envFile = ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    $hasSupabase = $envContent -match "NEXT_PUBLIC_SUPABASE_URL"
    if ($hasSupabase) {
        Write-ColorOutput "  ✅ .env 文件包含 Supabase 配置" "Green"
    } else {
        Write-ColorOutput "  ❌ .env 文件缺少 Supabase 配置" "Red"
        Write-ColorOutput "     請先運行: .\scripts\auto-deploy-complete.ps1" "Yellow"
        exit 1
    }
} else {
    Write-ColorOutput "  ❌ .env 文件不存在" "Red"
    Write-ColorOutput "     請先運行: .\scripts\auto-deploy-complete.ps1" "Yellow"
    exit 1
}

# 部署選項
Write-ColorOutput "`n📋 部署選項：" "Blue"
Write-ColorOutput "   1. 預覽部署（測試環境）" "Cyan"
Write-ColorOutput "   2. 生產部署（正式環境）" "Cyan"
Write-ColorOutput "   3. 僅配置環境變數（不部署）" "Cyan"

$choice = Read-Host "`n請選擇 (1/2/3)"

switch ($choice) {
    "1" {
        Write-ColorOutput "`n🚀 執行預覽部署..." "Blue"
        Write-ColorOutput "   這將創建一個預覽環境" "Cyan"
        vercel --yes
    }
    "2" {
        Write-ColorOutput "`n🚀 執行生產部署..." "Blue"
        Write-ColorOutput "   這將部署到生產環境" "Cyan"
        vercel --prod --yes
    }
    "3" {
        Write-ColorOutput "`n⚙️  配置環境變數..." "Blue"
        Write-ColorOutput "`n請在 Vercel Dashboard 中手動配置環境變數：" "Yellow"
        Write-ColorOutput "`n環境變數列表：" "Cyan"
        Write-ColorOutput "   NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co" "White"
        Write-ColorOutput "   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9" "White"
        Write-ColorOutput "   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2" "White"
        Write-ColorOutput "   SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==" "White"
        Write-ColorOutput "`n配置位置：" "Cyan"
        Write-ColorOutput "   Vercel Dashboard → 專案設置 → Environment Variables" "White"
    }
    default {
        Write-ColorOutput "`n❌ 無效的選擇" "Red"
        exit 1
    }
}

Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "✅ 部署流程完成！" "Green"
Write-ColorOutput "`n📖 詳細指南：" "Yellow"
Write-ColorOutput "   AUTO_DEPLOY_NEXT_STEPS.md" "Cyan"
Write-ColorOutput "   docs/WEBSITE_DEPLOYMENT_GUIDE.md" "Cyan"
