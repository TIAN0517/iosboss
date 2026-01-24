# Supabase CLI 設置腳本（PowerShell）
# 用於自動配置 Supabase CLI 和訪問令牌

param(
    [string]$AccessToken = "sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c",
    [string]$ProjectRef = "mdmltksbpdyndoisnqhy"
)

$ErrorActionPreference = "Stop"

# 顏色輸出
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🚀 設置 Supabase CLI..." "Cyan"
Write-ColorOutput ("=" * 60) "Cyan"

# 檢查 Supabase CLI 是否安裝
Write-ColorOutput "`n📦 檢查 Supabase CLI 安裝..." "Blue"
try {
    $version = supabase --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✅ Supabase CLI 已安裝: $version" "Green"
    } else {
        throw "Supabase CLI 未安裝"
    }
} catch {
    Write-ColorOutput "  ❌ Supabase CLI 未安裝" "Red"
    Write-ColorOutput "`n💡 安裝方法：" "Yellow"
    Write-ColorOutput "   1. 使用 npm: npm install -g supabase" "Cyan"
    Write-ColorOutput "   2. 使用 Scoop: scoop install supabase" "Cyan"
    Write-ColorOutput "   3. 訪問: https://supabase.com/docs/reference/cli" "Cyan"
    exit 1
}

# 設置環境變數
Write-ColorOutput "`n🔐 設置訪問令牌..." "Blue"
$env:SUPABASE_ACCESS_TOKEN = $AccessToken
Write-ColorOutput "  ✅ 訪問令牌已設置" "Green"

# 登入
Write-ColorOutput "`n🔑 登入 Supabase..." "Blue"
try {
    $loginOutput = supabase login --token $AccessToken 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✅ 登入成功" "Green"
    } else {
        Write-ColorOutput "  ❌ 登入失敗" "Red"
        Write-ColorOutput "   錯誤: $loginOutput" "Yellow"
        exit 1
    }
} catch {
    Write-ColorOutput "  ❌ 登入失敗: $_" "Red"
    exit 1
}

# 鏈接專案
Write-ColorOutput "`n🔗 鏈接專案..." "Blue"
try {
    $linkOutput = supabase link --project-ref $ProjectRef 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✅ 專案鏈接成功" "Green"
        Write-ColorOutput "   專案 ID: $ProjectRef" "Cyan"
    } else {
        Write-ColorOutput "  ⚠️  鏈接可能失敗，請手動檢查" "Yellow"
        Write-ColorOutput "   輸出: $linkOutput" "Yellow"
    }
} catch {
    Write-ColorOutput "  ⚠️  鏈接失敗: $_" "Yellow"
    Write-ColorOutput "   您可以稍後手動執行: supabase link --project-ref $ProjectRef" "Yellow"
}

# 驗證連接
Write-ColorOutput "`n🔍 驗證連接..." "Blue"
try {
    $statusOutput = supabase status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✅ 連接正常" "Green"
        Write-ColorOutput "`n📊 專案狀態：" "Cyan"
        Write-ColorOutput $statusOutput "White"
    } else {
        Write-ColorOutput "  ⚠️  無法獲取狀態" "Yellow"
    }
} catch {
    Write-ColorOutput "  ⚠️  狀態檢查失敗: $_" "Yellow"
}

# 總結
Write-ColorOutput "`n" + ("=" * 60) "Cyan"
Write-ColorOutput "✅ Supabase CLI 設置完成！" "Green"
Write-ColorOutput "`n💡 常用命令：" "Yellow"
Write-ColorOutput "   supabase status          - 查看專案狀態" "Cyan"
Write-ColorOutput "   supabase db pull         - 拉取數據庫結構" "Cyan"
Write-ColorOutput "   supabase db push         - 推送遷移" "Cyan"
Write-ColorOutput "   supabase functions list  - 列出函數" "Cyan"
Write-ColorOutput "   supabase logs            - 查看日誌" "Cyan"

Write-ColorOutput "`n📖 參考文檔：" "Yellow"
Write-ColorOutput "   docs/SUPABASE_CLI_CONFIGURATION.md" "Cyan"
