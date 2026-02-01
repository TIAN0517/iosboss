# 恢復數據庫腳本
Write-Host "=== 恢復 SQL Server 數據庫 ===" -ForegroundColor Green

$backupFiles = @{
    "cpf47_meilun" = "C:\Tools\99999.bak"   # 美崙站 - 較小
    "cpf47_ji_an"  = "C:\Tools\999gas.bak"   # 吉安站 - 較大
}

$connectionString = "Server=localhost;Database=master;Integrated Security=true;"

function Restore-Backup {
    param(
        [string]$DatabaseName,
        [string]$BackupFile
    )

    Write-Host ""
    Write-Host "正在恢復: $DatabaseName" -ForegroundColor Cyan
    Write-Host "  備份文件: $BackupFile" -ForegroundColor Gray

    try {
        $connection = new-object System.Data.SqlClient.SqlConnection($connectionString)
        $connection.Open()

        # 先查看備份文件中的邏輯文件名稱
        $cmd = new-object System.Data.SqlClient.SqlCommand("RESTORE FILELISTONLY FROM DISK = '$BackupFile'", $connection)
        $reader = $cmd.ExecuteReader()

        $logicalNames = @()
        while ($reader.Read()) {
            $logicalNames += @{
                LogicalName = $reader['LogicalName']
                PhysicalName = $reader['PhysicalName']
            }
            Write-Host "  邏輯文件名稱: $($reader['LogicalName'])" -ForegroundColor Gray
        }
        $reader.Close()

        # 如果數據庫已存在，先刪除
        $checkCmd = new-object System.Data.SqlClient.SqlCommand("SELECT name FROM sys.databases WHERE name = '$DatabaseName'", $connection)
        $exists = $checkCmd.ExecuteScalar()
        if ($exists) {
            Write-Host "  數據庫已存在，正在刪除..." -ForegroundColor Yellow
            $dropCmd = new-object System.Data.SqlClient.SqlCommand("ALTER DATABASE $DatabaseName SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE $DatabaseName", $connection)
            $dropCmd.ExecuteNonQuery()
        }

        # 恢復數據庫
        $moveClauses = @()
        $dataPath = "C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\"

        foreach ($file in $logicalNames) {
            $ext = [System.IO.Path]::GetExtension($file.PhysicalName)
            $newName = "$DatabaseName$ext"
            $moveClauses += "MOVE '$($file.LogicalName)' TO '$dataPath\$newName'"
        }

        $restoreSQL = "RESTORE DATABASE $DatabaseName FROM DISK = '$BackupFile' WITH REPLACE, $($moveClauses -join ', '), STATS = 10"
        Write-Host "  執行恢復..." -ForegroundColor Yellow

        $restoreCmd = new-object System.Data.SqlClient.SqlCommand($restoreSQL, $connection)
        $restoreCmd.CommandTimeout = 600
        $restoreCmd.ExecuteNonQuery()

        Write-Host "  ✅ $DatabaseName 恢復成功!" -ForegroundColor Green

        $connection.Close()
        return $true
    } catch {
        Write-Host "  ❌ 錯誤: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 恢復美崙站 (較小)
Restore-Backup -DatabaseName "cpf47_meilun" -BackupFile $backupFiles["cpf47_meilun"]

# 恢復吉安站 (較大)
Restore-Backup -DatabaseName "cpf47_ji_an" -BackupFile $backupFiles["cpf47_ji_an"]

Write-Host ""
Write-Host "=== 完成 ===" -ForegroundColor Green
