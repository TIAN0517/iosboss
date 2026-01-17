# 需要管理員權限執行
Write-Host "正在添加防火牆規則允許端口 80 和 443..." -ForegroundColor Green
try {
    New-NetFirewallRule -DisplayName "Caddy HTTP port 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -Profile Any -ErrorAction Stop
    New-NetFirewallRule -DisplayName "Caddy HTTPS port 443" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow -Profile Any -ErrorAction Stop
    Write-Host "✅ 防火牆規則添加成功！" -ForegroundColor Green
} catch {
    Write-Host "❌ 錯誤：需要以管理員身份運行此腳本" -ForegroundColor Red
    Write-Host "請右鍵點擊 PowerShell，選擇「以系統管理員身份執行」" -ForegroundColor Yellow
}
