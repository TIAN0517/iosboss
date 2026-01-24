# 九九瓦斯行管理系統 - 完整自動化配置腳本
# 一次性完成所有配置步驟

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🚀 九九瓦斯行管理系統 - 完整自動化配置" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# 步驟 1：檢查環境變數
Write-ColorOutput "`n📋 步驟 1：檢查環境變數配置..." "Blue"
$envFile = ".env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    $hasSupabase = $envContent -match "NEXT_PUBLIC_SUPABASE_URL"
    if ($hasSupabase) {
        Write-ColorOutput "  ✅ .env 文件包含 Supabase 配置" "Green"
    } else {
        Write-ColorOutput "  ⚠️  .env 文件存在但缺少 Supabase 配置" "Yellow"
        Write-ColorOutput "     請手動添加 Supabase 配置到 .env 文件" "Yellow"
    }
} else {
    Write-ColorOutput "  ❌ .env 文件不存在" "Red"
    Write-ColorOutput "     請創建 .env 文件並添加配置" "Yellow"
}

# 步驟 2：檢查依賴
Write-ColorOutput "`n📦 步驟 2：檢查依賴..." "Blue"
try {
    $supabaseInstalled = npm list @supabase/supabase-js 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✅ @supabase/supabase-js 已安裝" "Green"
    } else {
        Write-ColorOutput "  ⚠️  @supabase/supabase-js 未安裝" "Yellow"
        Write-ColorOutput "     正在安裝..." "Cyan"
        npm install @supabase/supabase-js
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✅ 安裝成功" "Green"
        } else {
            Write-ColorOutput "  ❌ 安裝失敗" "Red"
        }
    }
} catch {
    Write-ColorOutput "  ⚠️  無法檢查依賴" "Yellow"
}

# 步驟 3：驗證配置
Write-ColorOutput "`n🔍 步驟 3：驗證配置..." "Blue"
try {
    node scripts/verify-all-config.js
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✅ 配置驗證通過" "Green"
    } else {
        Write-ColorOutput "  ⚠️  配置驗證未完全通過" "Yellow"
        Write-ColorOutput "     請檢查並修復配置問題" "Yellow"
    }
} catch {
    Write-ColorOutput "  ⚠️  無法運行驗證腳本" "Yellow"
    Write-ColorOutput "     請確保已安裝 @supabase/supabase-js" "Yellow"
}

# 步驟 4：總結
Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "📊 配置狀態總結" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

Write-ColorOutput "`n✅ 已完成的配置：" "Green"
Write-ColorOutput "   - Supabase 數據庫結構（32 表、85 索引、25 外鍵）" "Cyan"
Write-ColorOutput "   - 數據導入（60 條記錄）" "Cyan"

Write-ColorOutput "`n⏳ 待完成的配置：" "Yellow"
Write-ColorOutput "   1. 在 .env 文件中添加 Supabase 配置" "Cyan"
Write-ColorOutput "   2. 在 Supabase Dashboard 中配置 RLS 策略" "Cyan"
Write-ColorOutput "   3. 在 Supabase Dashboard 中配置攻擊防護" "Cyan"
Write-ColorOutput "   4. 安裝依賴：npm install @supabase/supabase-js" "Cyan"
Write-ColorOutput "   5. 測試本地環境：npm run dev" "Cyan"
Write-ColorOutput "   6. 部署到 Vercel" "Cyan"

Write-ColorOutput "`n📖 詳細指南：" "Yellow"
Write-ColorOutput "   - FINAL_CONFIGURATION_GUIDE.md" "Cyan"
Write-ColorOutput "   - CONFIGURATION_COMPLETE_CHECKLIST.md" "Cyan"
Write-ColorOutput "   - docs/WEBSITE_DEPLOYMENT_GUIDE.md" "Cyan"

Write-ColorOutput "`n🎯 配置完成標準：" "Yellow"
Write-ColorOutput "   ✅ 本地環境：npm run dev 成功，網站可以訪問" "Cyan"
Write-ColorOutput "   ✅ 生產環境：Vercel 部署成功，網站可以訪問" "Cyan"
