# Fix Vercel Configuration using Project ID from screenshot
# Project ID: prj_3EHsI7qikjgC8iPswkuK9uV10Ued

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`nFixing Vercel Configuration by Project ID" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

$CONFIG = @{
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    TeamId = "bossjy"
    ProjectId = "prj_3EHsI7qikjgC8iPswkuK9uV10Ued"  # From screenshot
}

$API_BASE = "https://api.vercel.com"
$headers = @{
    "Authorization" = "Bearer $($CONFIG.VercelApiKey)"
    "Content-Type" = "application/json"
}

# Step 1: Get project by ID
Write-ColorOutput "`n[Step 1] Getting project by ID..." "Blue"

$project = $null

# Try with teamId
try {
    $projectUrl = "$API_BASE/v9/projects/$($CONFIG.ProjectId)?teamId=$($CONFIG.TeamId)"
    $project = Invoke-RestMethod -Uri $projectUrl -Method Get -Headers $headers -ErrorAction Stop
    Write-ColorOutput "  [OK] Found project: $($project.name)" "Green"
} catch {
    # Try without teamId
    try {
        $projectUrl = "$API_BASE/v9/projects/$($CONFIG.ProjectId)"
        $project = Invoke-RestMethod -Uri $projectUrl -Method Get -Headers $headers -ErrorAction Stop
        Write-ColorOutput "  [OK] Found project (personal): $($project.name)" "Green"
    } catch {
        Write-ColorOutput "  [Error] Cannot get project: $_" "Red"
        exit 1
    }
}

Write-ColorOutput "`nProject Info:" "Cyan"
Write-ColorOutput "  Name: $($project.name)" "Cyan"
Write-ColorOutput "  ID: $($project.id)" "Cyan"
Write-ColorOutput "  Framework: $($project.framework)" "Cyan"
Write-ColorOutput "  Build: $($project.buildCommand)" "Cyan"
Write-ColorOutput "  Install: $($project.installCommand)" "Cyan"
Write-ColorOutput "  Dev: $($project.devCommand)" "Cyan"

# Step 2: Update framework settings
Write-ColorOutput "`n[Step 2] Updating framework settings..." "Blue"

$updateBody = @{
    buildCommand = "npm run build"
    installCommand = "npm install --legacy-peer-deps"
    devCommand = "npm run dev"
    framework = "nextjs"
} | ConvertTo-Json

try {
    $updateUrl = "$API_BASE/v9/projects/$($CONFIG.ProjectId)?teamId=$($CONFIG.TeamId)"
    $response = Invoke-RestMethod -Uri $updateUrl -Method PATCH -Headers $headers -Body $updateBody -ErrorAction Stop
    
    Write-ColorOutput "  [OK] Configuration updated!" "Green"
    Write-ColorOutput "  Build: $($response.buildCommand)" "Cyan"
    Write-ColorOutput "  Install: $($response.installCommand)" "Cyan"
    Write-ColorOutput "  Dev: $($response.devCommand)" "Cyan"
    
    Write-ColorOutput "`nSuccess! Framework settings fixed!" "Green"
} catch {
    # Try without teamId
    try {
        $updateUrl = "$API_BASE/v9/projects/$($CONFIG.ProjectId)"
        $response = Invoke-RestMethod -Uri $updateUrl -Method PATCH -Headers $headers -Body $updateBody -ErrorAction Stop
        
        Write-ColorOutput "  [OK] Configuration updated (personal)!" "Green"
        Write-ColorOutput "  Build: $($response.buildCommand)" "Cyan"
        Write-ColorOutput "  Install: $($response.installCommand)" "Cyan"
        Write-ColorOutput "  Dev: $($response.devCommand)" "Cyan"
    } catch {
        Write-ColorOutput "  [Error] Update failed: $_" "Red"
        Write-ColorOutput "  Error: $($_.Exception.Message)" "Red"
    }
}

# Step 3: Check environment variables
Write-ColorOutput "`n[Step 3] Checking environment variables..." "Blue"

try {
    $envUrl = "$API_BASE/v9/projects/$($CONFIG.ProjectId)/env?teamId=$($CONFIG.TeamId)"
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
} catch {
    Write-ColorOutput "  [Warning] Cannot check env vars: $_" "Yellow"
}

Write-ColorOutput "`nDone! Check Vercel Dashboard" "Green"
