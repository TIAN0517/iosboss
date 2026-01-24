# Verify Vercel API and list all projects

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`nVerifying Vercel API Access" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

$CONFIG = @{
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    TeamId = "bossjy"
}

$API_BASE = "https://api.vercel.com"
$headers = @{
    "Authorization" = "Bearer $($CONFIG.VercelApiKey)"
    "Content-Type" = "application/json"
}

# Step 1: Verify API Key
Write-ColorOutput "`n[Step 1] Verifying API Key..." "Blue"

try {
    $userUrl = "$API_BASE/v2/user"
    $user = Invoke-RestMethod -Uri $userUrl -Method Get -Headers $headers -ErrorAction Stop
    Write-ColorOutput "  [OK] API Key is valid" "Green"
    Write-ColorOutput "  User: $($user.user.username)" "Cyan"
} catch {
    Write-ColorOutput "  [Error] API Key verification failed: $_" "Red"
    exit 1
}

# Step 2: List teams
Write-ColorOutput "`n[Step 2] Listing teams..." "Blue"

try {
    $teamsUrl = "$API_BASE/v2/teams"
    $teams = Invoke-RestMethod -Uri $teamsUrl -Method Get -Headers $headers -ErrorAction Stop
    
    Write-ColorOutput "  Found $($teams.teams.Count) teams:" "Green"
    foreach ($team in $teams.teams) {
        Write-ColorOutput "    - $($team.name) (ID: $($team.id))" "Cyan"
    }
} catch {
    Write-ColorOutput "  [Warning] Cannot list teams: $_" "Yellow"
}

# Step 3: List projects (personal)
Write-ColorOutput "`n[Step 3] Listing personal projects..." "Blue"

try {
    $projectsUrl = "$API_BASE/v9/projects?limit=100"
    $response = Invoke-RestMethod -Uri $projectsUrl -Method Get -Headers $headers -ErrorAction Stop
    
    Write-ColorOutput "  Found $($response.projects.Count) personal projects:" "Green"
    foreach ($proj in $response.projects) {
        Write-ColorOutput "    - $($proj.name) (Framework: $($proj.framework))" "Cyan"
    }
} catch {
    Write-ColorOutput "  [Warning] Cannot list personal projects: $_" "Yellow"
}

# Step 4: List projects (team)
Write-ColorOutput "`n[Step 4] Listing team projects (teamId: $($CONFIG.TeamId))..." "Blue"

try {
    $projectsUrl = "$API_BASE/v9/projects?teamId=$($CONFIG.TeamId)&limit=100"
    $response = Invoke-RestMethod -Uri $projectsUrl -Method Get -Headers $headers -ErrorAction Stop
    
    Write-ColorOutput "  Found $($response.projects.Count) team projects:" "Green"
    foreach ($proj in $response.projects) {
        Write-ColorOutput "    - $($proj.name) (Framework: $($proj.framework))" "Cyan"
    }
} catch {
    Write-ColorOutput "  [Warning] Cannot list team projects: $_" "Yellow"
    Write-ColorOutput "  Error: $($_.Exception.Message)" "Red"
}

Write-ColorOutput "`nDone! Check the project names above" "Green"
