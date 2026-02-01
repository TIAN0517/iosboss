# Check CPF47 database data
Write-Host "=== 檢查 CPF47 數據庫 ===" -ForegroundColor Green

$connectionString = "Server=BOSSJY\BOSSJY;Database=CPF47;Integrated Security=true;TrustServerCertificate=true;"

try {
    $connection = new-object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()

    # Check customer count
    $cmd = new-object System.Data.SqlClient.SqlCommand("SELECT COUNT(*) as cnt FROM Cust", $connection)
    $count = $cmd.ExecuteScalar()
    Write-Host ""
    Write-Host "Cust 表客戶數量: $count" -ForegroundColor Cyan

    # Sample data
    Write-Host ""
    Write-Host "前 10 筆客戶:" -ForegroundColor Yellow
    $sampleCmd = new-object System.Data.SqlClient.SqlCommand("SELECT TOP 10 CustID, CustName, CustAddr FROM Cust ORDER BY CustID", $connection)
    $reader = $sampleCmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Host "  $($reader['CustID'].ToString().Trim()) | $($reader['CustName']) | $($reader['CustAddr'])"
    }
    $reader.Close()

    # Check address distribution
    Write-Host ""
    Write-Host "地址分析 (前 20):" -ForegroundColor Yellow
    $addrCmd = new-object System.Data.SqlClient.SqlCommand("SELECT TOP 20 CustAddr, COUNT(*) as cnt FROM Cust GROUP BY CustAddr ORDER BY cnt DESC", $connection)
    $addrReader = $addrCmd.ExecuteReader()
    while ($addrReader.Read()) {
        $addr = $addrReader['CustAddr']
        $cnt = $addrReader['cnt']
        if ($addr.Length -gt 30) { $addr = $addr.Substring(0, 30) + "..." }
        Write-Host "  $addr ($cnt)"
    }
    $addrReader.Close()

    $connection.Close()
} catch {
    Write-Host ""
    Write-Host "錯誤: $($_.Exception.Message)" -ForegroundColor Red
}
