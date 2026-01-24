# Fix .env configuration with correct API keys

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n[Fix Config] Updating .env with correct API keys..." "Cyan"

# Correct configuration
$CONFIG = @{
    SupabaseUrl = "https://mdmltksbpdyndoisnqhy.supabase.co"
    PublishableKey = "sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ"
    ServiceRoleKey = "sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2"
    JwtSecret = "JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ=="
    AccessToken = "sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c"
    VercelApiKey = "vck_5Lx3SCRblaY5n3zXpwcWHmqU6ZcA4KWUKJzVAmz2cRuZbVOQ5J2Yxcxn"
}

$envConfig = @"

# ========================================
# Supabase Configuration (Fixed)
# ========================================
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NEXT_PUBLIC_SUPABASE_URL=$($CONFIG.SupabaseUrl)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$($CONFIG.PublishableKey)
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=$($CONFIG.ServiceRoleKey)
SUPABASE_JWT_SECRET=$($CONFIG.JwtSecret)
SUPABASE_ACCESS_TOKEN=$($CONFIG.AccessToken)

# Vercel Configuration
VERCEL_API_KEY=$($CONFIG.VercelApiKey)

# ========================================
"@

# Read existing .env and remove old Supabase config
if (Test-Path ".env") {
    $lines = Get-Content ".env"
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
    
    # Add new config
    $newLines += $envConfig
    $newLines | Set-Content ".env" -Encoding UTF8
    Write-ColorOutput "  [OK] .env file updated with correct API keys" "Green"
} else {
    $envConfig | Set-Content ".env" -Encoding UTF8
    Write-ColorOutput "  [OK] .env file created" "Green"
}

# Update vercel.json
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

$vercelConfig | ConvertTo-Json -Depth 10 | Set-Content "vercel.json" -Encoding UTF8
Write-ColorOutput "  [OK] vercel.json updated" "Green"

Write-ColorOutput "`n[OK] Configuration fixed!" "Green"
Write-ColorOutput "  Now test with: node scripts/test-supabase-connection.js" "Cyan"
