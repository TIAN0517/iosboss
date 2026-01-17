# List all Vercel projects via API

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`nListing Vercel Projects" "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# Configuration
$CONFIG = @{
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    TeamId = "bossjy"
}

$API_BASE = "https://api.vercel.com"
$headers = @{
    "Authorization" = "Bearer $($CONFIG.VercelApiKey)"
    "Content-Type" = "application/json"
}

# List all projects
Write-ColorOutput "`nFetching projects..." "Blue"

try {
    $projectsUrl = "$API_BASE/v9/projects?teamId=$($CONFIG.TeamId)&limit=100"
    $response = Invoke-RestMethod -Uri $projectsUrl -Method Get -Headers $headers -ErrorAction Stop
    
    Write-ColorOutput "`nFound $($response.projects.Count) projects:" "Green"
    Write-ColorOutput ""
    
    foreach ($proj in $response.projects) {
        Write-ColorOutput "  Project Name: $($proj.name)" "Cyan"
        Write-ColorOutput "    ID: $($proj.id)" "Gray"
        Write-ColorOutput "    Framework: $($proj.framework)" "Gray"
        Write-ColorOutput "    Build Command: $($proj.buildCommand)" "Gray"
        Write-ColorOutput "    Dev Command: $($proj.devCommand)" "Gray"
        Write-ColorOutput ""
    }
    
    # Find the gas management project
    $gasProject = $response.projects | Where-Object { 
        $_.name -like "*gas*" -or 
        $_.name -like "*boss*" -or 
        $_.name -like "*99*" 
    }
    
    if ($gasProject) {
        Write-ColorOutput "`nLikely project for gas management:" "Green"
        Write-ColorOutput "  Name: $($gasProject[0].name)" "Cyan"
        Write-ColorOutput "  ID: $($gasProject[0].id)" "Cyan"
    }
    
} catch {
    Write-ColorOutput "  [Error] Failed to list projects: $_" "Red"
    Write-ColorOutput "  Error: $($_.Exception.Message)" "Red"
}
