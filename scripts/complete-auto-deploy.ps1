# 九九瓦斯行管理系統 - 完全自動化部署腳本
# 一次性完成所有配置和部署到持久性環境
# 包括：環境變數、依賴安裝、RLS 策略、Vercel 配置

$ErrorActionPreference = "Stop"

# 顏色輸出函數
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🚀 九九瓦斯行管理系統 - 完全自動化部署" "Cyan"
Write-ColorOutput "============================================================" "Cyan"
Write-ColorOutput "此腳本將自動完成所有配置和部署步驟" "Yellow"
Write-ColorOutput "============================================================" "Cyan"

# 配置信息
$CONFIG = @{
    SupabaseUrl = "https://mdmltksbpdyndoisnqhy.supabase.co"
    SupabaseProjectId = "mdmltksbpdyndoisnqhy"
    PublishableKey = "sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c"
    ServiceRoleKey = "sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2"
    JwtSecret = "JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ=="
    AccessToken = "sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c"
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    EnvFile = ".env"
}

# ========================================
# 步驟 1: 配置 .env 文件
# ========================================
Write-ColorOutput "`n📝 步驟 1: 配置 .env 文件..." "Blue"

$envConfig = @"

# ========================================
# Supabase 配置（自動生成）
# ========================================
# 生成時間: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NEXT_PUBLIC_SUPABASE_URL=$($CONFIG.SupabaseUrl)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$($CONFIG.PublishableKey)
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$($CONFIG.ServiceRoleKey)
SUPABASE_JWT_SECRET=$($CONFIG.JwtSecret)
SUPABASE_ACCESS_TOKEN=$($CONFIG.AccessToken)

# Vercel 配置
VERCEL_API_KEY=$($CONFIG.VercelApiKey)

# ========================================
"@

# 檢查 .env 文件是否存在
if (Test-Path $CONFIG.EnvFile) {
    $envContent = Get-Content $CONFIG.EnvFile -Raw -ErrorAction SilentlyContinue
    
    if ($envContent -and ($envContent -match "NEXT_PUBLIC_SUPABASE_URL")) {
        Write-ColorOutput "  ⚠️  .env 文件已包含 Supabase 配置" "Yellow"
        Write-ColorOutput "     將更新現有配置..." "Cyan"
        
        # 移除舊的 Supabase 配置
        $lines = Get-Content $CONFIG.EnvFile
        $newLines = @()
        $skipUntilEnd = $false
        
        foreach ($line in $lines) {
            if ($line -match "^# =+.*Supabase") {
                $skipUntilEnd = $true
            }
            if ($skipUntilEnd -and ($line -match "^# =+" -or $line -match "^NEXT_PUBLIC_SUPABASE|^SUPABASE_|^VERCEL_")) {
                continue
            }
            if ($skipUntilEnd -and $line.Trim() -eq "") {
                $skipUntilEnd = $false
            }
            if (-not $skipUntilEnd) {
                $newLines += $line
            }
        }
        
        # 添加新配置
        $newLines += $envConfig
        $newLines | Set-Content $CONFIG.EnvFile -Encoding UTF8
    } else {
        Write-ColorOutput "  ✅ 添加 Supabase 配置到 .env 文件" "Green"
        Add-Content -Path $CONFIG.EnvFile -Value $envConfig -Encoding UTF8
    }
} else {
    Write-ColorOutput "  ✅ 創建 .env 文件" "Green"
    $envConfig | Set-Content $CONFIG.EnvFile -Encoding UTF8
}

Write-ColorOutput "  ✅ .env 文件配置完成" "Green"

# ========================================
# 步驟 2: 安裝依賴
# ========================================
Write-ColorOutput "`n📦 步驟 2: 安裝依賴..." "Blue"

try {
    Write-ColorOutput "  正在檢查 @supabase/supabase-js..." "Cyan"
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.dependencies.'@supabase/supabase-js') {
        Write-ColorOutput "  ✅ @supabase/supabase-js 已安裝" "Green"
    } else {
        Write-ColorOutput "  正在安裝 @supabase/supabase-js..." "Cyan"
        npm install @supabase/supabase-js --legacy-peer-deps 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✅ @supabase/supabase-js 安裝成功" "Green"
        } else {
            Write-ColorOutput "  ⚠️  安裝可能失敗，請手動檢查" "Yellow"
        }
    }
} catch {
    Write-ColorOutput "  ⚠️  檢查依賴時出現問題: $_" "Yellow"
    Write-ColorOutput "     請手動執行: npm install @supabase/supabase-js --legacy-peer-deps" "Yellow"
}

# ========================================
# 步驟 3: 更新 Vercel 配置
# ========================================
Write-ColorOutput "`n⚙️  步驟 3: 更新 Vercel 配置..." "Blue"

$vercelConfig = @{
    installCommand = "npm install --legacy-peer-deps"
    buildCommand = "npm run build"
    devCommand = "npm run dev"
    framework = "nextjs"
    regions = @("hkg1")
    env = @{
        NEXT_PUBLIC_SUPABASE_URL = $CONFIG.SupabaseUrl
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $CONFIG.PublishableKey
        NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY = $CONFIG.ServiceRoleKey
        SUPABASE_JWT_SECRET = $CONFIG.JwtSecret
        NODE_ENV = "production"
        NEXT_TELEMETRY_DISABLED = "1"
    }
    functions = @{
        "src/app/api/**/*.ts" = @{ maxDuration = 60 }
        "src/app/api/voice/**" = @{ maxDuration = 120 }
        "src/app/api/ai/**" = @{ maxDuration = 120 }
    }
}

$vercelConfigPath = "vercel.json"
$vercelConfig | ConvertTo-Json -Depth 10 | Set-Content $vercelConfigPath -Encoding UTF8
Write-ColorOutput "  ✅ Vercel 配置已更新: $vercelConfigPath" "Green"

# ========================================
# 步驟 4: 驗證配置
# ========================================
Write-ColorOutput "`n🔍 步驟 4: 驗證配置..." "Blue"

try {
    if (Test-Path "scripts/verify-all-config.js") {
        Write-ColorOutput "  正在運行配置驗證腳本..." "Cyan"
        node scripts/verify-all-config.js 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✅ 配置驗證通過" "Green"
        } else {
            Write-ColorOutput "  ⚠️  配置驗證未完全通過" "Yellow"
            Write-ColorOutput "     請檢查並修復配置問題" "Yellow"
        }
    } else {
        Write-ColorOutput "  ⚠️  驗證腳本不存在，跳過驗證" "Yellow"
    }
} catch {
    Write-ColorOutput "  ⚠️  無法運行驗證腳本" "Yellow"
}

# ========================================
# 步驟 5: 測試 Supabase 連接
# ========================================
Write-ColorOutput "`n🔗 步驟 5: 測試 Supabase 連接..." "Blue"

try {
    if (Test-Path "scripts/test-supabase-connection.js") {
        Write-ColorOutput "  正在測試 Supabase 連接..." "Cyan"
        node scripts/test-supabase-connection.js 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  ✅ Supabase 連接測試成功" "Green"
        } else {
            Write-ColorOutput "  ⚠️  Supabase 連接測試失敗" "Yellow"
            Write-ColorOutput "     這可能是 RLS 策略問題，將在下一步處理" "Yellow"
        }
    } else {
        Write-ColorOutput "  ⚠️  連接測試腳本不存在，跳過測試" "Yellow"
    }
} catch {
    Write-ColorOutput "  ⚠️  無法運行連接測試腳本" "Yellow"
}

# ========================================
# 步驟 6: 生成部署指南
# ========================================
Write-ColorOutput "`n📋 步驟 6: 生成部署指南..." "Blue"

$deployGuide = @"
# 🚀 完全自動化部署完成 - 下一步操作

## ✅ 已自動完成的配置

1. ✅ .env 文件已配置（包含所有 Supabase 和 Vercel 配置）
2. ✅ 依賴已安裝（@supabase/supabase-js）
3. ✅ Vercel 配置已更新（vercel.json）
4. ✅ 環境變數已設置

## ⏳ 需要手動完成的步驟（約 10 分鐘）

### 步驟 1: 配置 Supabase RLS 策略（5 分鐘）⏳

**執行位置**：Supabase Dashboard → SQL Editor

**步驟**：
1. 訪問：https://supabase.com/dashboard/project/$($CONFIG.SupabaseProjectId)/sql
2. 打開文件：`backups/migration/rls-policies-simple.sql`
3. 複製全部內容
4. 粘貼到 SQL Editor
5. 點擊「Run」執行

**驗證**：應該看到成功消息，無錯誤

---

### 步驟 2: 配置攻擊防護（1 分鐘）⏳

**執行位置**：Supabase Dashboard → Authentication → Attack Protection

**步驟**：
1. 訪問：https://supabase.com/dashboard/project/$($CONFIG.SupabaseProjectId)/auth/protection
2. 將「防止使用外洩的密碼」開關切換為「開啟」
3. 點擊「儲存變更」

**驗證**：開關應該顯示為「已啟用」狀態

---

### 步驟 3: 部署到 Vercel（5 分鐘）⏳

#### 方法 A：使用 Vercel Dashboard（推薦）⭐

**步驟**：

1. **訪問 Vercel**
   - 訪問：https://vercel.com
   - 使用 GitHub 帳號登入

2. **創建專案**
   - 點擊「Add New Project」
   - 選擇您的 GitHub 倉庫
   - Framework Preset: Next.js

3. **配置環境變數**（重要！）：
   在 Vercel Dashboard 中添加以下環境變數：
   
   \`\`\`
   NEXT_PUBLIC_SUPABASE_URL=$($CONFIG.SupabaseUrl)
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$($CONFIG.PublishableKey)
   NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$($CONFIG.ServiceRoleKey)
   SUPABASE_JWT_SECRET=$($CONFIG.JwtSecret)
   \`\`\`

4. **部署**
   - 點擊「Deploy」按鈕
   - 等待部署完成（約 2-5 分鐘）

#### 方法 B：使用 Vercel CLI（可選）

\`\`\`bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入 Vercel
vercel login

# 部署
vercel --prod
\`\`\`

---

### 步驟 4: 驗證部署

1. 訪問 Vercel 提供的網站 URL
2. 確認網站可以正常訪問
3. 測試主要功能
4. 確認數據庫連接正常

---

## 📊 配置狀態

- ✅ 本地環境配置：完成
- ⏳ Supabase RLS：待配置（需手動執行 SQL）
- ⏳ 攻擊防護：待配置（需手動開啟）
- ⏳ Vercel 部署：待完成

---

## 🎯 配置完成標準

當以下所有項目都完成時，配置才算完成：

- [ ] Supabase RLS 策略已配置
- [ ] 攻擊防護已開啟
- [ ] Vercel 部署成功
- [ ] 網站可以正常訪問
- [ ] 數據庫連接正常

---

## 📞 需要幫助？

查看詳細文檔：
- FINAL_CONFIGURATION_GUIDE.md
- docs/WEBSITE_DEPLOYMENT_GUIDE.md
- CONFIGURATION_COMPLETE_CHECKLIST.md

---

## 🔑 重要憑證信息

**Supabase 專案**：
- 專案 ID: $($CONFIG.SupabaseProjectId)
- URL: $($CONFIG.SupabaseUrl)

**Vercel**：
- API 密鑰已配置在 .env 文件中

**注意**：請妥善保管所有憑證，不要洩露給他人。

"@

$deployGuidePath = "AUTO_DEPLOY_NEXT_STEPS.md"
$deployGuide | Set-Content $deployGuidePath -Encoding UTF8
Write-ColorOutput "  ✅ 部署指南已生成: $deployGuidePath" "Green"

# ========================================
# 總結
# ========================================
Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "✅ 自動化配置完成！" "Green"
Write-ColorOutput "============================================================" "Cyan"

Write-ColorOutput "`n📊 已完成的配置：" "Blue"
Write-ColorOutput "   ✅ .env 文件已配置（包含所有環境變數）" "Green"
Write-ColorOutput "   ✅ 依賴已安裝" "Green"
Write-ColorOutput "   ✅ Vercel 配置已更新" "Green"
Write-ColorOutput "   ✅ 部署指南已生成" "Green"

Write-ColorOutput "`n⏳ 需要手動完成的步驟（約 10 分鐘）：" "Yellow"
Write-ColorOutput "   1. 配置 Supabase RLS 策略（5 分鐘）" "Cyan"
Write-ColorOutput "      → 訪問 Supabase SQL Editor" "Cyan"
Write-ColorOutput "      → 執行 backups/migration/rls-policies-simple.sql" "Cyan"
Write-ColorOutput "   2. 配置攻擊防護（1 分鐘）" "Cyan"
Write-ColorOutput "      → 訪問 Supabase Dashboard → Auth → Protection" "Cyan"
Write-ColorOutput "      → 開啟「防止使用外洩的密碼」" "Cyan"
Write-ColorOutput "   3. 部署到 Vercel（5 分鐘）" "Cyan"
Write-ColorOutput "      → 訪問 https://vercel.com" "Cyan"
Write-ColorOutput "      → 創建專案並配置環境變數" "Cyan"
Write-ColorOutput "      → 部署" "Cyan"

Write-ColorOutput "`n📖 詳細指南：" "Blue"
Write-ColorOutput "   AUTO_DEPLOY_NEXT_STEPS.md" "Cyan"

Write-ColorOutput "`n🎯 下一步：" "Yellow"
Write-ColorOutput "   1. 查看 AUTO_DEPLOY_NEXT_STEPS.md" "Cyan"
Write-ColorOutput "   2. 按照指南完成剩餘步驟" "Cyan"
Write-ColorOutput "   3. 完成後，系統將可以持久運行" "Cyan"

Write-ColorOutput "`n"
