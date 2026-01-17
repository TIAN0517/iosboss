# Fix Vercel Framework Settings via API
# Automatically update Development Command to npm run dev

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`nFixing Vercel Framework Settings" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# Configuration
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

# Step 1: Find the project
Write-ColorOutput "`n[Step 1] Finding project..." "Blue"

$project = $null
$projectName = $null

foreach ($name in $CONFIG.ProjectNames) {
    try {
        $projectUrl = "$API_BASE/v9/projects/$name?teamId=$($CONFIG.TeamId)"
        $project = Invoke-RestMethod -Uri $projectUrl -Method Get -Headers $headers -ErrorAction Stop
        $projectName = $name
        Write-ColorOutput "  [OK] Found project: $($project.name) (ID: $($project.id))" "Green"
        break
    } catch {
        Write-ColorOutput "  [Skip] Project '$name' not found" "Yellow"
    }
}

if (-not $project) {
    Write-ColorOutput "  [Error] Project not found. Please check project name manually." "Red"
    exit 1
}

# Step 2: Get current config
Write-ColorOutput "`n[Step 2] Getting current configuration..." "Blue"

try {
    $configUrl = "$API_BASE/v9/projects/$($project.id)?teamId=$($CONFIG.TeamId)"
    $currentConfig = Invoke-RestMethod -Uri $configUrl -Method Get -Headers $headers -ErrorAction Stop
    
    Write-ColorOutput "  Current build command: $($currentConfig.buildCommand)" "Cyan"
    Write-ColorOutput "  Current install command: $($currentConfig.installCommand)" "Cyan"
    Write-ColorOutput "  Current dev command: $($currentConfig.devCommand)" "Cyan"
} catch {
    Write-ColorOutput "  [Warning] Cannot get current config: $_" "Yellow"
}

# Step 3: Update project configuration
Write-ColorOutput "`n[Step 3] Updating project configuration..." "Blue"

$updateBody = @{
    buildCommand = "npm run build"
    installCommand = "npm install --legacy-peer-deps"
    devCommand = "npm run dev"
    framework = "nextjs"
} | ConvertTo-Json

try {
    $updateUrl = "$API_BASE/v9/projects/$($project.id)?teamId=$($CONFIG.TeamId)"
    $response = Invoke-RestMethod -Uri $updateUrl -Method PATCH -Headers $headers -Body $updateBody -ErrorAction Stop
    
    Write-ColorOutput "  [OK] Configuration updated!" "Green"
    Write-ColorOutput "  Build command: $($response.buildCommand)" "Cyan"
    Write-ColorOutput "  Install command: $($response.installCommand)" "Cyan"
    Write-ColorOutput "  Dev command: $($response.devCommand)" "Cyan"
    
    Write-ColorOutput "`nSuccess! Configuration fixed!" "Green"
    Write-ColorOutput "  Please check Vercel Dashboard to confirm" "Cyan"
    Write-ColorOutput "  Warning message should disappear" "Cyan"
    
} catch {
    Write-ColorOutput "  [Error] Update failed: $_" "Red"
    Write-ColorOutput "  Error details: $($_.Exception.Message)" "Red"
    
    Write-ColorOutput "`nManual steps:" "Yellow"
    Write-ColorOutput "  1. Visit: https://vercel.com/$projectName/settings/framework-detection" "Yellow"
    Write-ColorOutput "  2. Find Development Command in Project Settings" "Yellow"
    Write-ColorOutput "  3. Change value from 'next' to 'npm run dev'" "Yellow"
    Write-ColorOutput "  4. Click Save button" "Yellow"
    
    exit 1
}

Write-ColorOutput "`nDone! Configuration fixed!" "Green"
