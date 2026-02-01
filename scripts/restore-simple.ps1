# 檢查並連接 SQL Server
Write-Host "=== 測試 SQL Server 連接 ===" -ForegroundColor Green

# 嘗試多種連接方式
$serverNames = @("localhost", "(local)", "BOSSJY\BOSSJY", "127.0.0.1")
$connection = $null

foreach ($server in $serverNames) {
    $connStr = "Server=$server;Database=master;Integrated Security=true;TrustServerCertificate=true;"
    Write-Host "嘗試: $server" -ForegroundColor Yellow

    try {
        $connection = new-object System.Data.SqlClient.SqlConnection($connStr)
        $connection.Open()

        # 測試查詢
        $testCmd = new-object System.Data.SqlClient.SqlCommand("SELECT @@SERVERNAME as ServerName", $connection)
        $result = $testCmd.ExecuteScalar()

        Write-Host "  ✅ 連接成功!" -ForegroundColor Green
        Write-Host "  Server: $result" -ForegroundColor Cyan
        break
    } catch {
        Write-Host "  ❌ $($_.Exception.Message)" -ForegroundColor Red
        $connection = $null
    }
}

if ($connection) {
    # 查看現有數據庫
    Write-Host ""
    Write-Host "現有數據庫:" -ForegroundColor Green
    $cmd = new-object System.Data.SqlClient.SqlCommand("SELECT name FROM sys.databases WHERE name LIKE 'cpf47%' ORDER BY name", $connection)
    $reader = $cmd.ExecuteReader()
    while ($reader.Read()) {
        Write-Host "  - $($reader['name'])"
    }
    $reader.Close()

    # 恢復美崙站
    Write-Host ""
    Write-Host "恢復美崙站 (99999.bak)..." -ForegroundColor Green

    $cmd = new-object System.Data.SqlClient.SqlCommand("RESTORE FILELISTONLY FROM DISK = 'C:\Tools\99999.bak'", $connection)
    $reader = $cmd.ExecuteReader()

    $dataName = ""
    $logName = ""
    while ($reader.Read()) {
        Write-Host "  備份文件: $($reader['LogicalName']) ($($reader['Type']))" -ForegroundColor Gray
        if ($reader['Type'] -eq 'D') { $dataName = $reader['LogicalName'] }
        if ($reader['Type'] -eq 'L') { $logName = $reader['LogicalName'] }
    }
    $reader.Close()

    $dataPath = "C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\"

    # 刪除舊數據庫
    $checkCmd = new-object System.Data.SqlClient.SqlCommand("SELECT name FROM sys.databases WHERE name = 'cpf47_meilun'", $connection)
    if ($checkCmd.ExecuteScalar()) {
        Write-Host "刪除舊數據庫..." -ForegroundColor Yellow
        $dropCmd = new-object System.Data.SqlClient.SqlCommand("ALTER DATABASE cpf47_meilun SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE cpf47_meilun", $connection)
        $dropCmd.ExecuteNonQuery()
    }

    # 恢復
    $restoreSQL = "RESTORE DATABASE cpf47_meilun FROM DISK = 'C:\Tools\99999.bak' WITH REPLACE, MOVE '$dataName' TO '$dataPath\cpf47_meilun.mdf', MOVE '$logName' TO '$dataPath\cpf47_meilun_log.ldf', STATS = 10"
    Write-Host "執行恢復..." -ForegroundColor Yellow

    $restoreCmd = new-object System.Data.SqlClient.SqlCommand($restoreSQL, $connection)
    $restoreCmd.CommandTimeout = 300
    $restoreCmd.ExecuteNonQuery()

    Write-Host "✅ 美崙站恢復成功!" -ForegroundColor Green

    $connection.Close()
} else {
    Write-Host "❌ 無法連接 SQL Server" -ForegroundColor Red
}
