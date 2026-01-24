# 添加 GLM API Key 到 .env 文件

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🔑 添加 GLM API Key 到配置..." "Cyan"
Write-ColorOutput "============================================================" "Cyan"

$GLM_API_KEY = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
$envFile = ".env"

# 檢查 .env 文件是否存在
if (-not (Test-Path $envFile)) {
    Write-ColorOutput "  ⚠️  .env 文件不存在，正在創建..." "Yellow"
    New-Item -Path $envFile -ItemType File -Force | Out-Null
}

# 讀取現有內容
$envContent = Get-Content $envFile -Raw -ErrorAction SilentlyContinue

# 檢查是否已存在 GLM_API_KEY 或 GLM_API_KEYS
$hasGLMKey = $envContent -match "GLM_API_KEY"
$hasGLMKeys = $envContent -match "GLM_API_KEYS"

if ($hasGLMKey -or $hasGLMKeys) {
    Write-ColorOutput "  ⚠️  檢測到現有的 GLM API Key 配置" "Yellow"
    
    # 更新現有的配置
    if ($hasGLMKeys) {
        # 更新 GLM_API_KEYS（多 Key 格式）
        $lines = Get-Content $envFile
        $newLines = @()
        $updated = $false
        
        foreach ($line in $lines) {
            if ($line -match "^GLM_API_KEYS=") {
                # 檢查是否已包含這個 key
                if ($line -notmatch $GLM_API_KEY) {
                    # 添加到現有的 keys 列表
                    $existingKeys = $line -replace "^GLM_API_KEYS=", ""
                    $newKeys = if ($existingKeys.Trim()) {
                        "$existingKeys,$GLM_API_KEY"
                    } else {
                        $GLM_API_KEY
                    }
                    $newLines += "GLM_API_KEYS=$newKeys"
                    $updated = $true
                    Write-ColorOutput "  ✅ 已添加到 GLM_API_KEYS" "Green"
                } else {
                    $newLines += $line
                    Write-ColorOutput "  ℹ️  GLM_API_KEYS 已包含此 Key" "Cyan"
                }
            } elseif ($line -match "^GLM_API_KEY=" -and -not $updated) {
                # 將單個 Key 轉換為多 Key 格式
                $newLines += "GLM_API_KEYS=$GLM_API_KEY"
                $updated = $true
                Write-ColorOutput "  ✅ 已將 GLM_API_KEY 轉換為 GLM_API_KEYS" "Green"
            } else {
                $newLines += $line
            }
        }
        
        if ($updated) {
            $newLines | Set-Content $envFile -Encoding UTF8
        }
    } else {
        # 更新 GLM_API_KEY（單個 Key 格式）
        $lines = Get-Content $envFile
        $newLines = @()
        
        foreach ($line in $lines) {
            if ($line -match "^GLM_API_KEY=") {
                $newLines += "GLM_API_KEY=$GLM_API_KEY"
                Write-ColorOutput "  ✅ 已更新 GLM_API_KEY" "Green"
            } else {
                $newLines += $line
            }
        }
        
        $newLines | Set-Content $envFile -Encoding UTF8
    }
} else {
    Write-ColorOutput "  ✅ 添加 GLM API Key 配置..." "Cyan"
    
    # 添加新的配置
    $glmConfig = @"

# ========================================
# GLM AI 配置（AI 網關 API 金鑰）
# ========================================
GLM_API_KEYS=$GLM_API_KEY
GLM_API_KEY=$GLM_API_KEY
GLM_MODEL=glm-4.7-coding-max
GLM_ENABLE_STREAMING=true
GLM_TIMEOUT=60000

"@
    
    if ($envContent) {
        Add-Content -Path $envFile -Value $glmConfig -Encoding UTF8
    } else {
        $glmConfig | Set-Content $envFile -Encoding UTF8
    }
    
    Write-ColorOutput "  ✅ GLM API Key 已添加" "Green"
}

Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "✅ GLM API Key 配置完成！" "Green"
Write-ColorOutput "============================================================" "Cyan"

Write-ColorOutput "`n📋 配置的 Key：" "Blue"
Write-ColorOutput "   GLM_API_KEYS=$GLM_API_KEY" "Cyan"
Write-ColorOutput "   GLM_API_KEY=$GLM_API_KEY" "Cyan"

Write-ColorOutput "`n💡 下一步：" "Yellow"
Write-ColorOutput "   1. 驗證配置: node scripts/verify-all-config.js" "Cyan"
Write-ColorOutput "   2. 測試 AI 功能: npm run dev" "Cyan"
Write-ColorOutput "`n"
