# ========================================
# Nine Nine Gas Management System - Migration Status Check (PowerShell)
# ========================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Checking migration status..." -ForegroundColor Cyan
Write-Host ""

# 1. Check Docker containers
Write-Host "Docker Container Status:" -ForegroundColor Yellow
docker ps --filter "name=jyt-gas" --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
Write-Host ""

# 2. Check database size
Write-Host "Database Size:" -ForegroundColor Yellow
try {
    $dbSizeOutput = docker exec jyt-gas-postgres psql -U postgres -d gas_management -c "SELECT pg_size_pretty(pg_database_size('gas_management')) as size;" 2>&1
    if ($dbSizeOutput -match "\d+\s*\w+") {
        $dbSizeOutput -match "(\d+\s*[A-Z]+)"
        $dbSize = $matches[1]
        Write-Host "   gas_management: $dbSize" -ForegroundColor Green
    }
} catch {
    Write-Host "   Cannot get database size" -ForegroundColor Red
}
Write-Host ""

# 3. Check table count
Write-Host "Database Table Count:" -ForegroundColor Yellow
try {
    $tableCountOutput = docker exec jyt-gas-postgres psql -U postgres -d gas_management -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>&1
    $tableCount = $tableCountOutput.Trim()
    Write-Host "   Total: $tableCount tables" -ForegroundColor Green
} catch {
    Write-Host "   Cannot get table count" -ForegroundColor Red
}
Write-Host ""

# 4. Check record count
Write-Host "Main Table Records:" -ForegroundColor Yellow
try {
    docker exec jyt-gas-postgres psql -U postgres -d gas_management -c "SELECT schemaname, tablename, n_tup_ins as total_records FROM pg_stat_user_tables WHERE schemaname = 'public' ORDER BY n_tup_ins DESC LIMIT 10;" 2>&1 | Out-Host
} catch {
    Write-Host "   Cannot get record count" -ForegroundColor Red
}
Write-Host ""

# 5. Check environment files
Write-Host "Environment Files:" -ForegroundColor Yellow
if (Test-Path ".env.docker") {
    Write-Host "   [OK] .env.docker exists" -ForegroundColor Green
} else {
    Write-Host "   [X] .env.docker not found" -ForegroundColor Red
}

if (Test-Path ".env.vercel.template") {
    Write-Host "   [OK] .env.vercel.template exists" -ForegroundColor Green
} else {
    Write-Host "   [X] .env.vercel.template not found" -ForegroundColor Red
}
Write-Host ""

# 6. Check Prisma
Write-Host "Prisma Configuration:" -ForegroundColor Yellow
if (Test-Path "prisma/schema.prisma") {
    $modelCount = (Get-Content "prisma/schema.prisma" | Select-String "^model ").Count
    Write-Host "   [OK] prisma/schema.prisma exists" -ForegroundColor Green
    Write-Host "   Contains: $modelCount models" -ForegroundColor Green
} else {
    Write-Host "   [X] prisma/schema.prisma not found" -ForegroundColor Red
}
Write-Host ""

# 7. Check backup directory
Write-Host "Backup Files:" -ForegroundColor Yellow
$backupDir = ".\backups\migration"
if (Test-Path $backupDir) {
    $backupFiles = Get-ChildItem $backupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending
    $backupCount = $backupFiles.Count
    Write-Host "   [OK] Backup directory exists" -ForegroundColor Green
    Write-Host "   Total: $backupCount backup files" -ForegroundColor Green
    if ($backupCount -gt 0) {
        Write-Host "   Latest backup:" -ForegroundColor Cyan
        $latestBackup = $backupFiles[0]
        Write-Host "      $($latestBackup.Name) ($($latestBackup.LastWriteTime.ToString('yyyy/MM/dd HH:mm')))" -ForegroundColor White
    }
} else {
    Write-Host "   [X] Backup directory not found" -ForegroundColor Red
    Write-Host "      Create: mkdir $backupDir" -ForegroundColor Yellow
}
Write-Host ""

# 8. Check Git
Write-Host "Git Status:" -ForegroundColor Yellow
if (Test-Path ".git") {
    try {
        $currentBranch = git rev-parse --abbrev-ref HEAD 2>&1
        $commitCount = git rev-list --count HEAD 2>&1
        $latestCommit = git log -1 --pretty=format:"%h - %s (%cr)" 2>&1

        Write-Host "   [OK] Git repository initialized" -ForegroundColor Green
        Write-Host "   Current branch: $currentBranch" -ForegroundColor White
        Write-Host "   Commit count: $commitCount" -ForegroundColor White
        Write-Host "   Latest commit: $latestCommit" -ForegroundColor White
    } catch {
        Write-Host "   [!] Git configuration error" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [X] Git repository not initialized" -ForegroundColor Red
}
Write-Host ""

# 9. Summary
Write-Host "[OK] Pre-migration check complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. If backup files do not exist, run:" -ForegroundColor White
Write-Host "   PowerShell: .\export-docker-db.ps1" -ForegroundColor Cyan
Write-Host "   Bash: ./export-docker-db.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Then follow MIGRATION_TO_VERCEL_SUPABASE.md" -ForegroundColor White
