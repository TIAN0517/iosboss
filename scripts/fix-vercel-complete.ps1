# Fix Vercel Configuration via API
# Complete solution: framework settings, environment variables, and initialization

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`nFixing Vercel Configuration via API" "Cyan"
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

# Step 1: Find project
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
    Write-ColorOutput "  [Error] Project not found" "Red"
    exit 1
}

# Step 2: Check current config
Write-ColorOutput "`n[Step 2] Current configuration:" "Blue"
Write-ColorOutput "  Build command: $($project.buildCommand)" "Cyan"
Write-ColorOutput "  Install command: $($project.installCommand)" "Cyan"
Write-ColorOutput "  Dev command: $($project.devCommand)" "Cyan"

# Step 3: Update framework settings
Write-ColorOutput "`n[Step 3] Updating framework settings..." "Blue"

$updateBody = @{
    buildCommand = "npm run build"
    installCommand = "npm install --legacy-peer-deps"
    devCommand = "npm run dev"
    framework = "nextjs"
} | ConvertTo-Json

try {
    $updateUrl = "$API_BASE/v9/projects/$($project.id)?teamId=$($CONFIG.TeamId)"
    $response = Invoke-RestMethod -Uri $updateUrl -Method PATCH -Headers $headers -Body $updateBody -ErrorAction Stop
    
    Write-ColorOutput "  [OK] Framework settings updated!" "Green"
    Write-ColorOutput "  Build: $($response.buildCommand)" "Cyan"
    Write-ColorOutput "  Install: $($response.installCommand)" "Cyan"
    Write-ColorOutput "  Dev: $($response.devCommand)" "Cyan"
} catch {
    Write-ColorOutput "  [Warning] Update failed: $_" "Yellow"
}

# Step 4: Check environment variables
Write-ColorOutput "`n[Step 4] Checking environment variables..." "Blue"

try {
    $envUrl = "$API_BASE/v9/projects/$($project.id)/env?teamId=$($CONFIG.TeamId)"
    $envVars = Invoke-RestMethod -Uri $envUrl -Method Get -Headers $headers -ErrorAction Stop
    
    $hasDatabaseUrl = $false
    $hasJwtSecret = $false
    
    foreach ($env in $envVars.envs) {
        if ($env.key -eq "DATABASE_URL") {
            $hasDatabaseUrl = $true
            Write-ColorOutput "  [OK] DATABASE_URL configured" "Green"
        }
        if ($env.key -eq "JWT_SECRET") {
            $hasJwtSecret = $true
            Write-ColorOutput "  [OK] JWT_SECRET configured" "Green"
        }
    }
    
    if (-not $hasDatabaseUrl) {
        Write-ColorOutput "  [WARNING] DATABASE_URL not configured!" "Red"
        Write-ColorOutput "  This is the main cause of login failure" "Yellow"
    }
} catch {
    Write-ColorOutput "  [Warning] Cannot check env vars: $_" "Yellow"
}

Write-ColorOutput "`nDone! Configuration updated via API" "Green"
Write-ColorOutput "  Please check Vercel Dashboard to confirm" "Cyan"
