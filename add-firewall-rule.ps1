# 需要管理員權限執行
Write-Host "正在添加防火牆規則允許端口 80..." -ForegroundColor Green
try {
    New-NetFirewallRule -DisplayName "Docker nginx port 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -Profile Any -ErrorAction Stop
    Write-Host "✅ 防火牆規則添加成功！" -ForegroundColor Green
    Write-Host "現在可以測試服務：curl https://linebot.tiankai.it.com/api/health" -ForegroundColor Yellow
} catch {
    Write-Host "❌ 錯誤：需要以管理員身份運行此腳本" -ForegroundColor Red
    Write-Host "請右鍵點擊 PowerShell，選擇「以系統管理員身份執行」" -ForegroundColor Yellow
}
