# 查找正確的 SQL Server 實例
Write-Host "=== 查找 SQL Server 實例 ===" -ForegroundColor Green

# 檢查註冊表
$regPath = "HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL"
if (Test-Path $regPath) {
    Write-Host "已安裝的 SQL Server 實例:" -ForegroundColor Yellow
    Get-Item $regPath | Get-ItemProperty | ForEach-Object {
        $_.PSObject.Properties | Where-Object { $_.Name -ne "PSChildName" } | ForEach-Object {
            Write-Host "  - $($_.Name): $($_.Value)"
        }
    }
}

# 檢查服務
Write-Host ""
Write-Host "SQL Server 服務:" -ForegroundColor Yellow
Get-Service | Where-Object { $_.Name -like "MSSQL*" } | ForEach-Object {
    Write-Host "  - $($_.Name): $($_.Status)"
}

# 嘗試連接不同實例
Write-Host ""
Write-Host "嘗試連接..." -ForegroundColor Yellow

$instances = @("BOSSJY\BOSSJY", "BOSSJY", "localhost", "(local)", ".\SQLEXPRESS", "MSSQLSERVER")

foreach ($instance in $instances) {
    $connStr = "Server=$instance;Database=master;Integrated Security=true;TrustServerCertificate=true;Connection Timeout=5;"
    try {
        $connection = new-object System.Data.SqlClient.SqlConnection($connStr)
        $connection.Open()

        $cmd = new-object System.Data.SqlClient.SqlCommand("SELECT @@SERVERNAME as SVR", $connection)
        $result = $cmd.ExecuteScalar()

        Write-Host "  ✅ $instance -> $result" -ForegroundColor Green
        $connection.Close()
    } catch {
        Write-Host "  ❌ $instance" -ForegroundColor Red
    }
}
