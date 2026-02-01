# 步驟1: 恢復美崙站並匯出到 PostgreSQL
Write-Host "=== 步驟1: 恢復美崙站 (99999.bak) ===" -ForegroundColor Green

$connectionString = "Server=localhost;Database=master;Integrated Security=true;"

try {
    $connection = new-object System.Data.SqlClient.SqlConnection($connectionString)
    $connection.Open()

    # 查詢備份文件中的邏輯文件名稱
    Write-Host "查詢備份文件結構..." -ForegroundColor Yellow
    $cmd = new-object System.Data.SqlClient.SqlCommand("RESTORE FILELISTONLY FROM DISK = 'C:\Tools\99999.bak'", $connection)
    $reader = $cmd.ExecuteReader()

    $logicalDataName = ""
    $logicalLogName = ""
    while ($reader.Read()) {
        $type = $reader['Type']
        if ($type -eq 'D') {
            $logicalDataName = $reader['LogicalName']
        } elseif ($type -eq 'L') {
            $logicalLogName = $reader['LogicalName']
        }
        Write-Host "  邏輯文件: $($reader['LogicalName']) (Type: $($reader['Type']))" -ForegroundColor Gray
    }
    $reader.Close()

    # 刪除已存在的數據庫
    $checkCmd = new-object System.Data.SqlClient.SqlCommand("SELECT name FROM sys.databases WHERE name = 'cpf47_meilun'", $connection)
    $exists = $checkCmd.ExecuteScalar()
    if ($exists) {
        Write-Host "刪除舊的 cpf47_meilun..." -ForegroundColor Yellow
        $dropCmd = new-object System.Data.SqlClient.SqlCommand("ALTER DATABASE cpf47_meilun SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE cpf47_meilun", $connection)
        $dropCmd.ExecuteNonQuery()
    }

    # 恢復美崙站
    Write-Host "恢復數據庫 cpf47_meilun..." -ForegroundColor Yellow
    $dataPath = "C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\"
    $restoreSQL = @"
        RESTORE DATABASE cpf47_meilun
        FROM DISK = 'C:\Tools\99999.bak'
        WITH REPLACE,
        MOVE '$logicalDataName' TO '$dataPath\cpf47_meilun.mdf',
        MOVE '$logicalLogName' TO '$dataPath\cpf47_meilun_log.ldf',
        STATS = 10
"@
    $restoreCmd = new-object System.Data.SqlClient.SqlCommand($restoreSQL, $connection)
    $restoreCmd.CommandTimeout = 300
    $restoreCmd.ExecuteNonQuery()

    Write-Host "✅ cpf47_meilun 恢復成功!" -ForegroundColor Green
    Write-Host ""
    Write-Host "現在可以運行節點腳本匯出到 PostgreSQL" -ForegroundColor Cyan
    Write-Host "記得修改 sqlserver-to-postgres.js 中的 database 為 'cpf47_meilun'" -ForegroundColor Gray

    $connection.Close()
} catch {
    Write-Host "❌ 錯誤: $($_.Exception.Message)" -ForegroundColor Red
}
