# Windows Task Scheduler Installation Script
# JYT Gas Station Management System

param(
    [switch]$Uninstall = $false
)

# Configuration
$TaskName = "JYT-Gas-Services-Monitor"
$ScriptPath = Join-Path $PSScriptRoot "start-with-monitor.bat"
$Description = "JYT Gas Station - Service Monitor"
$WorkingDirectory = $PSScriptRoot

# Check admin rights
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Admin rights required!" -ForegroundColor Red
    Write-Host "Please right-click and Run as Administrator" -ForegroundColor Yellow
    exit 1
}

# Check script exists
if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERROR: Script not found!" -ForegroundColor Red
    Write-Host "Path: $ScriptPath" -ForegroundColor Yellow
    exit 1
}

# Uninstall task
if ($Uninstall) {
    Write-Host "Uninstalling task..." -ForegroundColor Yellow
    
    try {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction Stop
        Write-Host "Task uninstalled!" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Message -match "not found") {
            Write-Host "Task does not exist" -ForegroundColor Yellow
        }
        else {
            Write-Host "Uninstall failed: $($_.Exception.Message)" -ForegroundColor Red
            exit 1
        }
    }
    
    exit 0
}

# Create task
Write-Host "Installing scheduled task..." -ForegroundColor Cyan

try {
    # Create triggers
    $triggerBoot = New-ScheduledTaskTrigger -AtStartup
    $triggerBoot.Delay = "PT2M"
    
    $triggerLogon = New-ScheduledTaskTrigger -AtLogon
    $triggerLogon.Delay = "PT30S"
    
    # Create action
    $arg = "/c `"$ScriptPath`""
    $action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument $arg -WorkingDirectory $WorkingDirectory
    
    # Create settings
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 5) `
        -ExecutionTimeLimit (New-TimeSpan -Days 365) `
        -DontStopOnIdleEnd `
        -RunOnlyIfNetworkAvailable `
        -WakeToRun `
        -Compatibility Win8
    
    # Register task
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $triggerBoot, $triggerLogon `
        -Settings $settings `
        -Description $Description `
        -RunLevel Highest `
        -Force `
        -ErrorAction Stop
    
    Write-Host "Task installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $TaskName" -ForegroundColor White
    Write-Host "  Description: $Description" -ForegroundColor White
    Write-Host "  Script: $ScriptPath" -ForegroundColor White
    Write-Host "  Working Dir: $WorkingDirectory" -ForegroundColor White
    Write-Host "  Run Level: Highest" -ForegroundColor White
    Write-Host ""
    Write-Host "Triggers:" -ForegroundColor Cyan
    Write-Host "  - At startup (delay 2 min)" -ForegroundColor White
    Write-Host "  - At logon (delay 30 sec)" -ForegroundColor White
    Write-Host ""
    Write-Host "Retry Policy:" -ForegroundColor Cyan
    Write-Host "  - Retry every 5 min, max 3 times" -ForegroundColor White
    Write-Host ""
    Write-Host "Network:" -ForegroundColor Cyan
    Write-Host "  - Run only when network available" -ForegroundColor White
    Write-Host ""
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now you can:" -ForegroundColor Yellow
    Write-Host "  1. Restart computer" -ForegroundColor White
    Write-Host "  2. Re-login" -ForegroundColor White
    Write-Host ""
    Write-Host "System will auto-start monitor!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Manual management:" -ForegroundColor Cyan
    Write-Host "  - View task: taskschd.msc" -ForegroundColor Gray
    Write-Host "  - Run task: schtasks /run /tn $TaskName" -ForegroundColor Gray
    Write-Host "  - Uninstall: .\install-task.ps1 -Uninstall" -ForegroundColor Gray
}
catch {
    Write-Host "Installation failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
