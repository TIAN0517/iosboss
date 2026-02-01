# 詳細錯誤檢查
$ErrorActionPreference = "Stop"

Write-Host "=== 詳細恢復 ===" -ForegroundColor Green

try {
    $connection = new-object System.Data.SqlClient.SqlConnection("Server=localhost;Database=master;Integrated Security=true;TrustServerCertificate=true;")
    $connection.Open()
    Write-Host "✅ SQL Server 連接成功" -ForegroundColor Green

    # 查詢備份文件
    Write-Host ""
    Write-Host "查詢備份文件..." -ForegroundColor Yellow
    $cmd = new-object System.Data.SqlClient.SqlCommand("RESTORE FILELISTONLY FROM DISK = 'C:\Tools\99999.bak'", $connection)
    $reader = $cmd.ExecuteReader()

    $dataName = ""
    $logName = ""
    while ($reader.Read()) {
        Write-Host "  邏輯名: $($reader['LogicalName']), 物理名: $($reader['PhysicalName']), 類型: $($reader['Type'])"
        if ($reader['Type'] -eq 'D') { $dataName = $reader['LogicalName'] }
        if ($reader['Type'] -eq 'L') { $logName = $reader['LogicalName'] }
    }
    $reader.Close()
    Write-Host "  數據文件: $dataName, 日誌文件: $logName" -ForegroundColor Cyan

    # 刪除舊數據庫
    Write-Host ""
    Write-Host "檢查現有數據庫..." -ForegroundColor Yellow
    $checkCmd = new-object System.Data.SqlClient.SqlCommand("SELECT name FROM sys.databases WHERE name = 'cpf47_meilun'", $connection)
    $exists = $checkCmd.ExecuteScalar()
    if ($exists) {
        Write-Host "  刪除舊數據庫 cpf47_meilun..." -ForegroundColor Yellow
        $dropCmd = new-object System.Data.SqlClient.SqlCommand("ALTER DATABASE cpf47_meilun SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE cpf47_meilun", $connection)
        $dropCmd.ExecuteNonQuery()
        Write-Host "  完成刪除" -ForegroundColor Gray
    } else {
        Write-Host "  不存在，跳過刪除" -ForegroundColor Gray
    }

    # 恢復
    Write-Host ""
    Write-Host "執行恢復..." -ForegroundColor Yellow
    $dataPath = "C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\"
    $restoreSQL = "RESTORE DATABASE cpf47_meilun FROM DISK = 'C:\Tools\99999.bak' WITH REPLACE, MOVE '$dataName' TO '$dataPath\cpf47_meilun.mdf', MOVE '$logName' TO '$dataPath\cpf47_meilun_log.ldf'"

    Write-Host "SQL: $restoreSQL" -ForegroundColor Gray

    $restoreCmd = new-object System.Data.SqlClient.SqlCommand($restoreSQL, $connection)
    $restoreCmd.CommandTimeout = 300
    $rowsAffected = $restoreCmd.ExecuteNonQuery()
    Write-Host "  影響行數: $rowsAffected" -ForegroundColor Gray

    # 驗證
    Write-Host ""
    Write-Host "驗證恢復結果..." -ForegroundColor Yellow
    $verifyCmd = new-object System.Data.SqlClient.SqlCommand("SELECT name, state_desc FROM sys.databases WHERE name = 'cpf47_meilun'", $connection)
    $verifyReader = $verifyCmd.ExecuteReader()
    while ($verifyReader.Read()) {
        Write-Host "  數據庫: $($verifyReader['name']), 狀態: $($verifyReader['state_desc'])" -ForegroundColor Cyan
    }
    $verifyReader.Close()

    Write-Host ""
    Write-Host "✅ 美崙站恢復成功!" -ForegroundColor Green

    $connection.Close()
} catch {
    Write-Host ""
    Write-Host "❌ 錯誤: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "詳細信息:" -ForegroundColor Yellow
    Write-Host $_.Exception.InnerException.Message -ForegroundColor Red
}
