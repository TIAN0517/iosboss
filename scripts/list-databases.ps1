# Check SQL Server databases
Write-Host "=== 檢查 SQL Server 數據庫 ===" -ForegroundColor Green

$connectionString = "Server=BOSSJY\BOSSJY;Database=master;Integrated Security=true;TrustServerCertificate=true;"

try {
    $connection = new-object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()

    $cmd = new-object System.Data.SqlClient.SqlCommand("SELECT name, create_date FROM sys.databases ORDER BY create_date DESC", $connection)
    $reader = $cmd.ExecuteReader()

    Write-Host ""
    Write-Host "所有數據庫:" -ForegroundColor Yellow
    while ($reader.Read()) {
        $name = $reader['name']
        $date = $reader['create_date']
        Write-Host "  - $name (建立: $date)"
    }
    $reader.Close()

    $connection.Close()
} catch {
    Write-Host "錯誤: $($_.Exception.Message)" -ForegroundColor Red
}
