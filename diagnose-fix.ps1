# ========================================
# Service Diagnosis & Fix Script
# JYT Gas Station Management System
# ========================================

param(
    [switch]$AutoFix = $false,
    [switch]$OnlyCheck = $false
)

$ErrorActionPreference = "Stop"
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$Services = @("jyt-gas-app", "jyt-gas-nginx", "jyt-gas-postgres", "jyt-gas-cloudflared")

# Color output function
function Write-ColorOutput {
    param([string]$Message, [string]$Status = "INFO")
    
    $color = switch ($Status) {
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        "SUCCESS" { "Green" }
        "INFO" { "Cyan" }
        default { "White" }
    }
    
    Write-Host "  $Message" -ForegroundColor $color
}

# Section header
function Write-Section {
    param([string]$Title)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host $Title -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
}

# Check Docker
function Test-Docker {
    $result = & docker info 2>&1
    return $LASTEXITCODE -eq 0
}

# Check container
function Get-ContainerInfo {
    param([string]$Name)
    
    $info = & docker ps -a --filter "name=$Name" --format "{{.Status}}" 2>&1
    return $info
}

# Check container health
function Test-ContainerHealth {
    param([string]$Name)
    
    try {
        $health = & docker inspect --format "{{.State.Health.Status}}" $Name 2>&1
        
        if ($health -eq "healthy") {
            return "OK"
        }
        elseif ($health -eq "unhealthy") {
            return "BAD"
        }
        elseif ($health -eq "starting") {
            return "START"
        }
        else {
            return "UNK"
        }
    }
    catch {
        return "ERR"
    }
}

# Check webhook connection
function Test-Webhook {
    try {
        $response = Invoke-WebRequest -Uri "https://linebot.jytian.it.com/api/webhook/line" `
            -Method Head `
            -TimeoutSec 10 `
            -UseBasicParsing:$false
        
        $statusCode = $response.StatusCode
        
        if ($statusCode -eq 200) {
            return "200"
        }
        else {
            return $statusCode.ToString()
        }
    }
    catch {
        return "FAIL"
    }
}

# Check tunnel
function Test-Tunnel {
    try {
        $logs = & docker logs jyt-gas-cloudflared --tail 20 2>&1
        
        if ($logs -match "Registered tunnel connection") {
            $connections = ($logs | Select-String "Registered tunnel connection").Count
            return "OK (" + $connections + " points)"
        }
        else {
            return "NO"
        }
    }
    catch {
        return "ERR"
    }
}

# Main diagnosis flow
Write-Section "Service Diagnosis"
Write-Host "`nCheck time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# 1. Check Docker
Write-Host "[1/6] Docker Status" -ForegroundColor Yellow
$dockerRunning = Test-Docker

if ($dockerRunning) {
    $dockerVersion = & docker version --format "{{.Server.Version}}" 2>&1
    Write-ColorOutput "Docker version: $dockerVersion" "SUCCESS"
    Write-ColorOutput "Docker status: Running" "SUCCESS"
}
else {
    Write-ColorOutput "Docker status: Stopped" "ERROR"
    
    if ($AutoFix) {
        Write-ColorOutput "Starting Docker..." "WARNING"
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Start-Sleep -Seconds 20
        
        if (Test-Docker) {
            Write-ColorOutput "Docker started successfully" "SUCCESS"
        }
        else {
            Write-ColorOutput "Failed to start Docker" "ERROR"
            return
        }
    }
    else {
        Write-ColorOutput "Please start Docker Desktop manually" "WARNING"
        return
    }
}

# 2. Check all containers
Write-Host "`n[2/6] Container Status" -ForegroundColor Yellow
$containersRunning = 0
$containersStopped = 0
$containerIssues = @()

foreach ($service in $Services) {
    $info = Get-ContainerInfo -Name $service
    
    if ($info -match "Up") {
        $containersRunning++
        $health = Test-ContainerHealth -Name $service
        $healthMsg = switch ($health) {
            "OK" { "Healthy" }
            "BAD" { "Unhealthy" }
            "START" { "Starting" }
            "UNK" { "Unknown" }
            "ERR" { "Check Error" }
        }
        Write-ColorOutput "$service : Running - $healthMsg" "SUCCESS"
        
        if ($health -eq "BAD") {
            $containerIssues += $service
        }
    }
    else {
        $containersStopped++
        Write-ColorOutput "$service : Stopped" "ERROR"
        $containerIssues += $service
    }
}

Write-ColorOutput "Running: $containersRunning/$($Services.Count)" "INFO"
Write-ColorOutput "Stopped: $containersStopped/$($Services.Count)" "INFO"

# 3. Check webhook connection
Write-Host "`n[3/6] Webhook Connection Test" -ForegroundColor Yellow
$webhookStatus = Test-Webhook
$webhookMsg = switch ($webhookStatus) {
    "200" { "200 OK" }
    "FAIL" { "Cannot connect" }
    default { "Status: $webhookStatus" }
}
$webhookStatusResult = if ($webhookStatus -eq "200") { "SUCCESS" } else { "ERROR" }
Write-ColorOutput "LINE Webhook: $webhookMsg" $webhookStatusResult

# 4. Check tunnel
Write-Host "`n[4/6] Cloudflare Tunnel Status" -ForegroundColor Yellow
$tunnelStatus = Test-Tunnel
$tunnelMsg = switch ($tunnelStatus) {
    "NO" { "Not connected" }
    "ERR" { "Check error" }
    default { $tunnelStatus }
}
$tunnelStatusResult = if ($tunnelStatus -match "OK") { "SUCCESS" } else { "WARNING" }
Write-ColorOutput "Tunnel connection: $tunnelMsg" $tunnelStatusResult

# 5. Check ports
Write-Host "`n[5/6] Port Listening Check" -ForegroundColor Yellow
$port9999 = Get-NetTCPConnection -LocalPort 9999 -ErrorAction SilentlyContinue
$port5433 = Get-NetTCPConnection -LocalPort 5433 -ErrorAction SilentlyContinue

if ($port9999) {
    Write-ColorOutput "Port 9999: Listening" "SUCCESS"
}
else {
    Write-ColorOutput "Port 9999: Not listening" "ERROR"
}

if ($port5433) {
    Write-ColorOutput "Port 5433: Listening" "SUCCESS"
}
else {
    Write-ColorOutput "Port 5433: Not listening" "WARNING"
}

# 6. Auto fix
if ($AutoFix -and $containersStopped -gt 0) {
    Write-Host "`n[6/6] Auto Fix" -ForegroundColor Yellow
    
    Write-ColorOutput "Restarting stopped services..." "WARNING"
    
    Set-Location $ScriptPath
    & docker compose --env-file .env.docker up -d 2>&1 | Out-Null
    
    Start-Sleep -Seconds 10
    
    # Re-check
    $newRunning = 0
    foreach ($service in $Services) {
        $info = Get-ContainerInfo -Name $service
        if ($info -match "Up") {
            $newRunning++
        }
    }
    
    if ($newRunning -eq $Services.Count) {
        Write-ColorOutput "All services restarted" "SUCCESS"
    }
    else {
        Write-ColorOutput "Some services failed to restart" "ERROR"
    }
}
elseif (-not $OnlyCheck) {
    Write-Host "`n[6/6] Fix Recommendations" -ForegroundColor Yellow
    
    if ($containersStopped -gt 0 -or $containerIssues.Count -gt 0) {
        Write-ColorOutput "Issue: Some containers not running or unhealthy" "ERROR"
        Write-ColorOutput "Recommend: Run 'docker compose up -d' to restart services" "WARNING"
    }
    elseif ($webhookStatus -ne "200") {
        Write-ColorOutput "Issue: Webhook cannot connect" "ERROR"
        Write-ColorOutput "Recommend: Check Nginx and Cloudflare Tunnel config" "WARNING"
    }
    elseif ($tunnelStatus -notmatch "OK") {
        Write-ColorOutput "Issue: Cloudflare Tunnel not connected" "ERROR"
        Write-ColorOutput "Recommend: Check Tunnel Token and config" "WARNING"
    }
    else {
        Write-ColorOutput "All checks passed" "SUCCESS"
    }
}

# Summary
Write-Section "Diagnosis Complete"

if ($containerIssues.Count -gt 0 -or $webhookStatus -ne "200" -or $tunnelStatus -notmatch "OK") {
    Write-Host "`nIssues found:" -ForegroundColor Red
    if ($containerIssues.Count -gt 0) {
        Write-ColorOutput "Container issues: $($containerIssues -join ', ')" "ERROR"
    }
    if ($webhookStatus -ne "200") {
        Write-ColorOutput "Webhook cannot connect" "ERROR"
    }
    if ($tunnelStatus -notmatch "OK") {
        Write-ColorOutput "Tunnel not connected" "ERROR"
    }
    
    Write-Host "`nQuick fix commands:" -ForegroundColor Cyan
    Write-Host "  docker compose up -d" -ForegroundColor White
    Write-Host "  or" -ForegroundColor Gray
    Write-Host "  .\diagnose-fix.ps1 -AutoFix" -ForegroundColor White
}
else {
    Write-ColorOutput "All systems operational" "SUCCESS"
}

Write-Host "`n========================================" -ForegroundColor Cyan
