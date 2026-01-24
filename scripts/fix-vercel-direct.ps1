# Fix Vercel Configuration - Direct approach
# Using project name from screenshots: bossaigas

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`nFixing Vercel Configuration" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# Configuration from user's screenshots
$CONFIG = @{
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    TeamId = "bossjy"
    ProjectName = "bossaigas"  # From screenshot: bossaigas-4fpivdubp-bossjy.vercel.app
}

$API_BASE = "https://api.vercel.com"
$headers = @{
    "Authorization" = "Bearer $($CONFIG.VercelApiKey)"
    "Content-Type" = "application/json"
}

# Step 1: Try to get project (without teamId first, then with teamId)
Write-ColorOutput "`n[Step 1] Finding project: $($CONFIG.ProjectName)..." "Blue"

$project = $null
$projectName = $null

# Try without teamId (personal account)
try {
    $projectUrl = "$API_BASE/v9/projects/$($CONFIG.ProjectName)"
    $project = Invoke-RestMethod -Uri $projectUrl -Method Get -Headers $headers -ErrorAction Stop
    $projectName = $CONFIG.ProjectName
    Write-ColorOutput "  [OK] Found project (personal): $($project.name)" "Green"
} catch {
    Write-ColorOutput "  [Skip] Not in personal account" "Yellow"
    
    # Try with teamId
    try {
        $projectUrl = "$API_BASE/v9/projects/$($CONFIG.ProjectName)?teamId=$($CONFIG.TeamId)"
        $project = Invoke-RestMethod -Uri $projectUrl -Method Get -Headers $headers -ErrorAction Stop
        $projectName = $CONFIG.ProjectName
        Write-ColorOutput "  [OK] Found project (team): $($project.name)" "Green"
    } catch {
        Write-ColorOutput "  [Error] Project not found: $_" "Red"
        Write-ColorOutput "  Error: $($_.Exception.Message)" "Red"
        exit 1
    }
}

if (-not $project) {
    Write-ColorOutput "  [Error] Cannot find project" "Red"
    exit 1
}

Write-ColorOutput "`nProject Info:" "Cyan"
Write-ColorOutput "  Name: $($project.name)" "Cyan"
Write-ColorOutput "  ID: $($project.id)" "Cyan"
Write-ColorOutput "  Framework: $($project.framework)" "Cyan"

# Step 2: Check current configuration
Write-ColorOutput "`n[Step 2] Current configuration:" "Blue"
Write-ColorOutput "  Build: $($project.buildCommand)" "Cyan"
Write-ColorOutput "  Install: $($project.installCommand)" "Cyan"
Write-ColorOutput "  Dev: $($project.devCommand)" "Cyan"

# Step 3: Update framework settings
Write-ColorOutput "`n[Step 3] Updating framework settings..." "Blue"

$updateBody = @{
    buildCommand = "npm run build"
    installCommand = "npm install --legacy-peer-deps"
    devCommand = "npm run dev"
    framework = "nextjs"
} | ConvertTo-Json

$updateUrl = if ($projectName) {
    "$API_BASE/v9/projects/$($project.id)?teamId=$($CONFIG.TeamId)"
} else {
    "$API_BASE/v9/projects/$($project.id)"
}

try {
    $response = Invoke-RestMethod -Uri $updateUrl -Method PATCH -Headers $headers -Body $updateBody -ErrorAction Stop
    
    Write-ColorOutput "  [OK] Configuration updated!" "Green"
    Write-ColorOutput "  Build: $($response.buildCommand)" "Cyan"
    Write-ColorOutput "  Install: $($response.installCommand)" "Cyan"
    Write-ColorOutput "  Dev: $($response.devCommand)" "Cyan"
    
    Write-ColorOutput "`nSuccess! Framework settings fixed!" "Green"
} catch {
    Write-ColorOutput "  [Error] Update failed: $_" "Red"
    Write-ColorOutput "  Details: $($_.Exception.Message)" "Red"
}

# Step 4: Check environment variables
Write-ColorOutput "`n[Step 4] Checking environment variables..." "Blue"

$envUrl = if ($projectName) {
    "$API_BASE/v9/projects/$($project.id)/env?teamId=$($CONFIG.TeamId)"
} else {
    "$API_BASE/v9/projects/$($project.id)/env"
}

try {
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
        Write-ColorOutput "  This is why login is failing!" "Yellow"
    }
    
    if (-not $hasJwtSecret) {
        Write-ColorOutput "  [WARNING] JWT_SECRET not configured!" "Yellow"
    }
} catch {
    Write-ColorOutput "  [Warning] Cannot check env vars: $_" "Yellow"
}

Write-ColorOutput "`nDone! Check Vercel Dashboard to confirm changes" "Green"
