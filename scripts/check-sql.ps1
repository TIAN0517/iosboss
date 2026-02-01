# 檢查 SQL Server 服務
Write-Host "=== 檢查 SQL Server 服務 ===" -ForegroundColor Green

$services = Get-Service | Where-Object { $_.Name -like "*SQL*" -or $_.DisplayName -like "*SQL*" }
$services | Format-Table Name, DisplayName, Status -AutoSize

# 嘗試不同連接方式
Write-Host ""
Write-Host "=== 嘗試連接 SQL Server ===" -ForegroundColor Green

$connectionStrings = @(
    "Server=localhost;Database=master;Integrated Security=true;",
    "Server=BOSSJY\BOSSJY;Database=master;Integrated Security=true;",
    "Server=(local);Database=master;Integrated Security=true;"
)

foreach ($connStr in $connectionStrings) {
    try {
        $server = $connStr -replace "Database=master;", "" -replace "Server=", "" -replace ";Integrated Security=true", ""
        Write-Host "嘗試連接: $server" -ForegroundColor Yellow

        $connection = new-object System.Data.SqlClient.SqlConnection($connStr)
        $connection.Open()
        Write-Host "  ✅ 連接成功!" -ForegroundColor Green

        # 查詢版本
        $versionCmd = new-object System.Data.SqlClient.SqlCommand("SELECT @@VERSION", $connection)
        $version = $versionCmd.ExecuteScalar()
        Write-Host "  版本: $($version.Substring(0, 50))..." -ForegroundColor Cyan

        $connection.Close()
        break
    } catch {
        Write-Host "  ❌ 失敗: $($_.Exception.Message)" -ForegroundColor Red
    }
}
