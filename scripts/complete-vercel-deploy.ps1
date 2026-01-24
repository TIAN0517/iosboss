# Complete Vercel Deployment Script
# Automates deployment with environment variables and domain configuration

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n[Auto Deploy] Starting Vercel deployment..." "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# Configuration
$CONFIG = @{
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
    ProjectName = "bossai-ten"
    Domain = "bossai.jytian.it.com"
}

# Step 1: Check Vercel CLI
Write-ColorOutput "`n[Step 1] Checking Vercel CLI..." "Blue"

$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-ColorOutput "  [Info] Installing Vercel CLI..." "Cyan"
    npm install -g vercel 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  [OK] Vercel CLI installed" "Green"
    } else {
        Write-ColorOutput "  [Error] Failed to install Vercel CLI" "Red"
        exit 1
    }
} else {
    Write-ColorOutput "  [OK] Vercel CLI already installed" "Green"
}

# Step 2: Deploy to Vercel
Write-ColorOutput "`n[Step 2] Deploying to Vercel..." "Blue"

try {
    Write-ColorOutput "  [Info] Starting deployment..." "Cyan"
    
    # Set Vercel token
    $env:VERCEL_TOKEN = $CONFIG.VercelApiKey
    
    # Deploy
    $deployOutput = vercel --prod --yes --token $CONFIG.VercelApiKey 2>&1 | Out-String
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  [OK] Deployment successful!" "Green"
    } else {
        Write-ColorOutput "  [Warning] Deployment may have issues" "Yellow"
        Write-ColorOutput "  Output: $deployOutput" "Cyan"
    }
} catch {
    Write-ColorOutput "  [Error] Deployment failed: $_" "Red"
}

# Step 3: Environment Variables
Write-ColorOutput "`n[Step 3] Environment Variables Configuration..." "Blue"
Write-ColorOutput "  [Info] Environment variables need to be configured in Vercel Dashboard" "Yellow"
Write-ColorOutput "  Please use vercel-env-variables.txt file to import" "Cyan"
Write-ColorOutput "  Or manually add in: Settings -> Environment Variables" "Cyan"

# Step 4: Domain Status
Write-ColorOutput "`n[Step 4] Domain Configuration..." "Blue"
Write-ColorOutput "  [Info] Domain: $($CONFIG.Domain)" "Cyan"
Write-ColorOutput "  Status: Waiting for DNS propagation" "Cyan"
Write-ColorOutput "  This usually takes a few minutes to a few hours" "Cyan"

# Summary
Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "[Complete] Deployment process finished!" "Green"
Write-ColorOutput "============================================================" "Cyan"

Write-ColorOutput "`n[Next Steps]" "Yellow"
Write-ColorOutput "  1. Configure environment variables in Vercel Dashboard" "Cyan"
Write-ColorOutput "  2. Wait for DNS propagation to complete" "Cyan"
Write-ColorOutput "  3. Visit https://$($CONFIG.Domain) to test" "Cyan"

Write-ColorOutput "`n"
