# PM2 Windows 開機自啟動設置腳本
# 使用方法：以管理員權限運行此腳本

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "PM2 守護進程 - 開機自啟動設置" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Action = New-ScheduledTaskAction -Execute "pm2" -Argument "resume" -WorkingDirectory "C:\Users\tian7\OneDrive\Desktop\媽媽ios"
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask -TaskName "PM2 Gas Station Dev" -Trigger $Trigger -Action $Action -Settings $Settings -Principal $Principal -Force

Write-Host "✅ PM2 開機自啟動任務已創建！" -ForegroundColor Green
Write-Host ""
Write-Host "任務名稱: PM2 Gas Station Dev" -ForegroundColor White
Write-Host "觸發方式: 用戶登入時自動啟動" -ForegroundColor White
Write-Host ""
Write-Host "測試命令:" -ForegroundColor Yellow
Write-Host "  pm2 list              - 查看運行狀態" -ForegroundColor White
Write-Host "  pm2 logs              - 查看日誌" -ForegroundColor White
Write-Host "  pm2 restart all       - 重啟所有服務" -ForegroundColor White
Write-Host "  pm2 stop all          - 停止所有服務" -ForegroundColor White
Write-Host ""
Write-Host "如需刪除任務，執行: Unregister-ScheduledTask -TaskName 'PM2 Gas Station Dev'" -ForegroundColor Red
Write-Host ""
