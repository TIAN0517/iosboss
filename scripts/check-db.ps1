# 檢查 SQL Server 備份文件
Write-Host "=== 檢查備份文件 ===" -ForegroundColor Green

# 檢查文件是否存在
$backup1 = "C:\Tools\99999.bak"
$backup2 = "C:\Tools\999gas.bak"

if (Test-Path $backup1) {
    $file1 = Get-Item $backup1
    Write-Host "美崙站備份: $backup1" -ForegroundColor Cyan
    Write-Host "  大小: $([math]::Round($file1.Length / 1MB, 2)) MB"
    Write-Host "  修改時間: $($file1.LastWriteTime)"
}

if (Test-Path $backup2) {
    $file2 = Get-Item $backup2
    Write-Host "吉安站備份: $backup2" -ForegroundColor Cyan
    Write-Host "  大小: $([math]::Round($file2.Length / 1MB, 2)) MB"
    Write-Host "  修改時間: $($file2.LastWriteTime)"
}

# 檢查 SQL Server
Write-Host ""
Write-Host "=== 檢查 SQL Server ===" -ForegroundColor Green

try {
    $connection = new-object System.Data.SqlClient.SqlConnection
    $connection.ConnectionString = "Server=BOSSJY\BOSSJY;Database=master;Integrated Security=true;"
    $connection.Open()
    Write-Host "✅ SQL Server 連接成功" -ForegroundColor Green

    # 查詢現有數據庫
    $command = new-object System.Data.SqlClient.SqlCommand("SELECT name FROM sys.databases WHERE name LIKE 'cpf47%'", $connection)
    $reader = $command.ExecuteReader()
    Write-Host ""
    Write-Host "現有的 cpf47 數據庫:" -ForegroundColor Cyan
    while ($reader.Read()) {
        Write-Host "  - $($reader['name'])"
    }
    $reader.Close()

    $connection.Close()
} catch {
    Write-Host "❌ SQL Server 連接失敗: $($_.Exception.Message)" -ForegroundColor Red
}
