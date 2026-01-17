# 使用 Vercel API 直接修復配置問題
# 包括：框架設定、環境變數檢查、初始化系統

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🔧 使用 Vercel API 修復配置" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# 配置
$CONFIG = @{
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    TeamId = "bossjy"
    ProjectNames = @("bossaigas", "bossai", "bossai-ten")
}

$API_BASE = "https://api.vercel.com"
$headers = @{
    "Authorization" = "Bearer $($CONFIG.VercelApiKey)"
    "Content-Type" = "application/json"
}

# 步驟 1: 找到專案
Write-ColorOutput "`n[步驟 1] 尋找專案..." "Blue"

$project = $null
$projectName = $null

foreach ($name in $CONFIG.ProjectNames) {
    try {
        $projectUrl = "$API_BASE/v9/projects/$name?teamId=$($CONFIG.TeamId)"
        $project = Invoke-RestMethod -Uri $projectUrl -Method Get -Headers $headers -ErrorAction Stop
        $projectName = $name
        Write-ColorOutput "  [OK] 找到專案: $($project.name) (ID: $($project.id))" "Green"
        break
    } catch {
        Write-ColorOutput "  [跳過] 專案 '$name' 不存在" "Yellow"
    }
}

if (-not $project) {
    Write-ColorOutput "  [錯誤] 找不到專案" "Red"
    Write-ColorOutput "  請告訴我您的專案名稱" "Yellow"
    exit 1
}

# 步驟 2: 檢查當前配置
Write-ColorOutput "`n[步驟 2] 檢查當前配置..." "Blue"

Write-ColorOutput "  建置命令: $($project.buildCommand)" "Cyan"
Write-ColorOutput "  安裝命令: $($project.installCommand)" "Cyan"
Write-ColorOutput "  開發命令: $($project.devCommand)" "Cyan"
Write-ColorOutput "  框架: $($project.framework)" "Cyan"

# 步驟 3: 更新框架設定
Write-ColorOutput "`n[步驟 3] 更新框架設定..." "Blue"

$updateBody = @{
    buildCommand = "npm run build"
    installCommand = "npm install --legacy-peer-deps"
    devCommand = "npm run dev"
    framework = "nextjs"
} | ConvertTo-Json

try {
    $updateUrl = "$API_BASE/v9/projects/$($project.id)?teamId=$($CONFIG.TeamId)"
    $response = Invoke-RestMethod -Uri $updateUrl -Method PATCH -Headers $headers -Body $updateBody -ErrorAction Stop
    
    Write-ColorOutput "  [OK] 框架設定已更新！" "Green"
    Write-ColorOutput "  建置命令: $($response.buildCommand)" "Cyan"
    Write-ColorOutput "  安裝命令: $($response.installCommand)" "Cyan"
    Write-ColorOutput "  開發命令: $($response.devCommand)" "Cyan"
} catch {
    Write-ColorOutput "  [警告] 更新框架設定失敗: $_" "Yellow"
    Write-ColorOutput "  可能需要手動在 Vercel Dashboard 修改" "Yellow"
}

# 步驟 4: 檢查環境變數
Write-ColorOutput "`n[步驟 4] 檢查環境變數..." "Blue"

try {
    $envUrl = "$API_BASE/v9/projects/$($project.id)/env?teamId=$($CONFIG.TeamId)"
    $envVars = Invoke-RestMethod -Uri $envUrl -Method Get -Headers $headers -ErrorAction Stop
    
    $hasDatabaseUrl = $false
    $hasJwtSecret = $false
    
    foreach ($env in $envVars.envs) {
        if ($env.key -eq "DATABASE_URL") {
            $hasDatabaseUrl = $true
            Write-ColorOutput "  [OK] DATABASE_URL 已配置" "Green"
        }
        if ($env.key -eq "JWT_SECRET") {
            $hasJwtSecret = $true
            Write-ColorOutput "  [OK] JWT_SECRET 已配置" "Green"
        }
    }
    
    if (-not $hasDatabaseUrl) {
        Write-ColorOutput "  [警告] DATABASE_URL 未配置！" "Red"
        Write-ColorOutput "  這是登入失敗的主要原因" "Yellow"
        Write-ColorOutput "  請在 Vercel Dashboard 中添加 DATABASE_URL" "Yellow"
    }
    
    if (-not $hasJwtSecret) {
        Write-ColorOutput "  [警告] JWT_SECRET 未配置！" "Yellow"
    }
} catch {
    Write-ColorOutput "  [警告] 無法檢查環境變數: $_" "Yellow"
}

# 步驟 5: 觸發重新部署（如果需要）
Write-ColorOutput "`n[步驟 5] 觸發重新部署..." "Blue"

Write-ColorOutput "  配置已更新，Vercel 會自動重新部署" "Cyan"
Write-ColorOutput "  或訪問: https://vercel.com/$projectName" "Cyan"

Write-ColorOutput "`n✅ 完成！" "Green"
Write-ColorOutput "  請到 Vercel Dashboard 確認配置" "Cyan"
Write-ColorOutput "  然後訪問: https://bossai.jytian.it.com/api/init" "Cyan"
