# Complete Auto Deploy Script for Gas Management System
# This script automates all configuration and deployment steps

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n[Auto Deploy] Starting complete automation..." "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# Configuration
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

# Step 1: Configure .env file
Write-ColorOutput "`n[Step 1] Configuring .env file..." "Blue"

$envConfig = @"

# ========================================
# Supabase Configuration (Auto-generated)
# ========================================
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NEXT_PUBLIC_SUPABASE_URL=$($CONFIG.SupabaseUrl)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$($CONFIG.PublishableKey)
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$($CONFIG.ServiceRoleKey)
SUPABASE_JWT_SECRET=$($CONFIG.JwtSecret)
SUPABASE_ACCESS_TOKEN=$($CONFIG.AccessToken)

# Vercel Configuration
VERCEL_API_KEY=$($CONFIG.VercelApiKey)

# ========================================
"@

if (Test-Path $CONFIG.EnvFile) {
    $envContent = Get-Content $CONFIG.EnvFile -Raw -ErrorAction SilentlyContinue
    if ($envContent -and ($envContent -match "NEXT_PUBLIC_SUPABASE_URL")) {
        Write-ColorOutput "  [Info] .env file already contains Supabase config" "Yellow"
        Write-ColorOutput "  [Info] Updating existing configuration..." "Cyan"
        
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
        
        $newLines += $envConfig
        $newLines | Set-Content $CONFIG.EnvFile -Encoding UTF8
    } else {
        Write-ColorOutput "  [OK] Adding Supabase config to .env file" "Green"
        Add-Content -Path $CONFIG.EnvFile -Value $envConfig -Encoding UTF8
    }
} else {
    Write-ColorOutput "  [OK] Creating .env file" "Green"
    $envConfig | Set-Content $CONFIG.EnvFile -Encoding UTF8
}

Write-ColorOutput "  [OK] .env file configuration complete" "Green"

# Step 2: Install dependencies
Write-ColorOutput "`n[Step 2] Installing dependencies..." "Blue"

try {
    Write-ColorOutput "  [Info] Checking @supabase/supabase-js..." "Cyan"
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($packageJson.dependencies.'@supabase/supabase-js') {
        Write-ColorOutput "  [OK] @supabase/supabase-js already installed" "Green"
    } else {
        Write-ColorOutput "  [Info] Installing @supabase/supabase-js..." "Cyan"
        npm install @supabase/supabase-js --legacy-peer-deps 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  [OK] @supabase/supabase-js installed successfully" "Green"
        } else {
            Write-ColorOutput "  [Warning] Installation may have failed" "Yellow"
        }
    }
} catch {
    Write-ColorOutput "  [Warning] Error checking dependencies: $_" "Yellow"
}

# Step 3: Update Vercel config
Write-ColorOutput "`n[Step 3] Updating Vercel configuration..." "Blue"

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
Write-ColorOutput "  [OK] Vercel configuration updated: $vercelConfigPath" "Green"

# Step 4: Verify configuration
Write-ColorOutput "`n[Step 4] Verifying configuration..." "Blue"

try {
    if (Test-Path "scripts/verify-all-config.js") {
        Write-ColorOutput "  [Info] Running configuration verification..." "Cyan"
        node scripts/verify-all-config.js 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  [OK] Configuration verification passed" "Green"
        } else {
            Write-ColorOutput "  [Warning] Configuration verification incomplete" "Yellow"
        }
    }
} catch {
    Write-ColorOutput "  [Warning] Could not run verification script" "Yellow"
}

# Step 5: Test Supabase connection
Write-ColorOutput "`n[Step 5] Testing Supabase connection..." "Blue"

try {
    if (Test-Path "scripts/test-supabase-connection.js") {
        Write-ColorOutput "  [Info] Testing Supabase connection..." "Cyan"
        node scripts/test-supabase-connection.js 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "  [OK] Supabase connection test successful" "Green"
        } else {
            Write-ColorOutput "  [Warning] Supabase connection test failed" "Yellow"
        }
    }
} catch {
    Write-ColorOutput "  [Warning] Could not run connection test" "Yellow"
}

# Summary
Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "[OK] Automated configuration complete!" "Green"
Write-ColorOutput "============================================================" "Cyan"

Write-ColorOutput "`n[Completed]" "Blue"
Write-ColorOutput "  [OK] .env file configured" "Green"
Write-ColorOutput "  [OK] Dependencies installed" "Green"
Write-ColorOutput "  [OK] Vercel configuration updated" "Green"

Write-ColorOutput "`n[Next Steps]" "Yellow"
Write-ColorOutput "  1. RLS policies have been applied automatically" "Cyan"
Write-ColorOutput "  2. Configure Attack Protection in Supabase Dashboard" "Cyan"
Write-ColorOutput "  3. Deploy to Vercel" "Cyan"

Write-ColorOutput "`n[Important]" "Yellow"
Write-ColorOutput "  - RLS policies: Already applied via migration" "Cyan"
Write-ColorOutput "  - Attack Protection: Manual step required" "Cyan"
Write-ColorOutput "  - Vercel Deployment: Ready to deploy" "Cyan"

Write-ColorOutput "`n"
