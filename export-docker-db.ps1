# ========================================
# Nine Nine Gas Management System - Export Database (PowerShell)
# ========================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Exporting Docker PostgreSQL database..." -ForegroundColor Cyan

# Check if container is running
$containerRunning = docker ps --filter "name=jyt-gas-postgres" --format "{{.Names}}"

if ($containerRunning -ne "jyt-gas-postgres") {
    Write-Host "[X] Error: jyt-gas-postgres container not running" -ForegroundColor Red
    Write-Host "Please run first: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Set variables
$backupDir = ".\backups\migration"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = "$backupDir\gas-management-$timestamp.sql"

# Create backup directory
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "Exporting database to: $backupFile" -ForegroundColor Green

# Export database
docker exec jyt-gas-postgres pg_dump `
    -U postgres `
    -d gas_management `
    --no-owner `
    --no-acl `
    --verbose `
    --file=- `
  2>&1 | Tee-Object -FilePath $backupFile

# Check if export succeeded
if ($LASTEXITCODE -eq 0) {
    $fileSize = (Get-Item $backupFile).Length / 1KB
    $fileSizeFormatted = [math]::Round($fileSize, 2)

    Write-Host "[OK] Database export successful!" -ForegroundColor Green
    Write-Host "File location: $backupFile" -ForegroundColor Cyan
    Write-Host "File size: $fileSizeFormatted KB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Import to Supabase" -ForegroundColor White
    Write-Host "2. Use command: psql `$SUPABASE_URL < $backupFile" -ForegroundColor White
} else {
    Write-Host "[X] Database export failed" -ForegroundColor Red
    exit 1
}
