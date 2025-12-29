# ========================================
# Nine Nine Gas Management System - Import to Supabase (PowerShell)
# ========================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Importing data to Supabase..." -ForegroundColor Cyan

# Check parameters
if ($args.Count -ne 1) {
    Write-Host "[X] Error: Please provide SQL file path" -ForegroundColor Red
    Write-Host "Usage: .\import-to-supabase.ps1 <sql-file-path>" -ForegroundColor Yellow
    exit 1
}

$sqlFile = $args[0]

# Check if file exists
if (-not (Test-Path $sqlFile)) {
    Write-Host "[X] Error: File not found: $sqlFile" -ForegroundColor Red
    exit 1
}

# Check SUPABASE_URL environment variable
$supabaseUrl = $env:SUPABASE_URL
if ([string]::IsNullOrEmpty($supabaseUrl)) {
    Write-Host "[X] Error: SUPABASE_URL environment variable not set" -ForegroundColor Red
    Write-Host "Please run:" -ForegroundColor Yellow
    Write-Host "`$env:SUPABASE_URL = 'postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres'" -ForegroundColor White
    exit 1
}

Write-Host "Importing file: $sqlFile" -ForegroundColor Green
Write-Host "Target: $supabaseUrl" -ForegroundColor Green
Write-Host ""

# Import database
Get-Content $sqlFile | psql $supabaseUrl

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Data import successful!" -ForegroundColor Green
    Write-Host "You can now view data in Supabase Dashboard" -ForegroundColor Cyan
} else {
    Write-Host "[X] Data import failed" -ForegroundColor Red
    exit 1
}
