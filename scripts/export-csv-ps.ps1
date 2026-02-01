# Export SQL Server data to CSV
$connectionString = "Server=BOSSJY\BOSSJY;Database=CPF47;Integrated Security=true;TrustServerCertificate=true;"
$csvPath = "C:\Users\tian7\Desktop\customers_meilun.csv"

Write-Host "Exporting SQL Server data..."

try {
    $connection = new-object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()

    $adapter = new-object System.Data.SqlClient.SqlDataAdapter("SELECT * FROM Cust", $connection)
    $dataset = new-object System.Data.DataSet
    $adapter.Fill($dataset) | Out-Null

    $dataTable = $dataset.Tables[0]
    $dataTable | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8

    Write-Host ""
    Write-Host "Done! Exported $($dataTable.Rows.Count) rows" -ForegroundColor Green
    Write-Host "File: $csvPath" -ForegroundColor Cyan

    $connection.Close()
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
