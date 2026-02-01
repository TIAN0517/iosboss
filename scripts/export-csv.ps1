# 使用 sqlcmd 從 SQL Server 匯出數據，然後匯入 PostgreSQL
Write-Host "=== 從 SQL Server 匯出美崙站客戶數據 ===" -ForegroundColor Green

# 1. 使用 sqlcmd 匯出到 CSV
Write-Host ""
Write-Host "1. 從 SQL Server 匯出數據..." -ForegroundColor Yellow

$csvPath = "C:\Users\tian7\OneDrive\Desktop\媽媽ios\backups\migration\customers_meilun.csv"

$sqlQuery = "SELECT CustID, CustCorpID, CustAreaID, CustName, CustShortName, CustTel1, CustTel1a, CustTel1b, CustTel2, CustTel2a, CustTel2b, CustTel3, CustTel3a, CustTel3b, CustTel4, CustTel4a, CustTel4b, CustMobilePhone, CustUnifyID, CustAddrZip, CustSalesID, CustAddr, CustAddrCity, CustAddrArea, CustAddrRoad, CustAddrLane1, CustAddrLane2, CustAddrAlley1, CustAddrAlley2, CustAddrNo1, CustAddrNo2, CustAddrFloor1, CustAddrFloor2, CustAddrMemo, CustAddrSort, CustAddrCode, CustMemo, CustLastEdit, CustGPSX, CustGPSY, CustTankDifference1, CustTankDifference2, CustTankDifference3, CustTankDifference4, CustTankDifference5, CustMeterDifference, CustMeterCoefficient1, CustMeterCoefficient2, CustMeterCoefficient3, CustMeterPressure1, CustMeterPressure2, CustMeterPressure3, CustMeterCurrent1, CustMeterCurrent2, CustMeterCurrent3, CustUnbalanceCollect, CustUnbalanceCount1, CustUnbalanceCount2, CustUnbalanceCount3, CustUnbalanceCount4, CustUnbalanceCount5, CustInvoiceType, CustInvoiceTital, CustType, CustUnbalanceFull1, CustUnbalanceFull2, CustUnbalanceFull3, CustUnbalanceFull4, CustUnbalanceFull5, CustFloorExtra1, CustFloorExtra2, CustFloorExtra3, CustFloorExtra4, CustFloorExtra5, CustLastTradeTime, CustExpectPeriod, CustExpectDate, CustCreateDate, CustTel5, CustTel5a, CustTel5b, 1 as station_id FROM Cust"

# 使用 sqlcmd 匯出
$sqlcmdResult = & "C:\Program Files\Microsoft SQL Server\160\Tools\Binn\sqlcmd.exe" -S BOSSJY\BOSSJY -E -d cpf47_meilun -s "," -W -Q $sqlQuery 2>&1

# 寫入 CSV
$sqlcmdResult | Out-File -FilePath $csvPath -Encoding UTF8 -Force

# 計算筆數
$lines = Get-Content $csvPath | Where-Object { $_ -match '\S' }
$count = $lines.Count - 1

Write-Host "   已匯出 $count 筆資料到 CSV" -ForegroundColor Cyan
Write-Host "   檔案: $csvPath" -ForegroundColor Gray

# 2. 匯入 PostgreSQL
Write-Host ""
Write-Host "2. 匯入 PostgreSQL..." -ForegroundColor Yellow

$pgConnStr = "Host=localhost;Port=5432;Database=postgres;User ID=postgres;Password=Ss520520;"
$pgConnection = new-object Npgsql.NpgsqlConnection($pgConnStr)
$pgConnection.Open()

# 清空舊數據
$deleteCmd = new-object Npgsql.NpgsqlCommand("DELETE FROM customers_meilun", $pgConnection)
$deleteCmd.ExecuteNonQuery() | Out-Null
Write-Host "   已清除舊資料" -ForegroundColor Gray

# 讀取 CSV
$lines = Get-Content $csvPath
$header = $lines[0]

$inserted = 0
$errors = 0
$batchSize = 100
$values = @()

for ($i = 1; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $fields = $line.Split(',')

    $valParts = @()
    for ($j = 0; $j -lt $fields.Count; $j++) {
        $val = $fields[$j].Trim().Replace('"', '""')
        if ($val -eq 'NULL' -or [string]::IsNullOrEmpty($val)) {
            $valParts += 'NULL'
        } else {
            $valParts += "'$val'"
        }
    }
    $values += "(" + ($valParts -join ",") + ")"

    if ($values.Count -ge $batchSize) {
        $batch = $values -join ",`n"
        $sql = "INSERT INTO customers_meilun VALUES `n$batch"
        try {
            $cmd = new-object Npgsql.NpgsqlCommand($sql, $pgConnection)
            $cmd.ExecuteNonQuery() | Out-Null
            $inserted += $values.Count
            Write-Host "   已匯入 $inserted 筆..." -ForegroundColor Gray
        } catch {
            $errors += $values.Count
        }
        $values = @()
    }
}

# 處理剩餘
if ($values.Count -gt 0) {
    $batch = $values -join ",`n"
    $sql = "INSERT INTO customers_meilun VALUES `n$batch"
    try {
        $cmd = new-object Npgsql.NpgsqlCommand($sql, $pgConnection)
        $cmd.ExecuteNonQuery() | Out-Null
        $inserted += $values.Count
    } catch {
        $errors += $values.Count
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "完成!" -ForegroundColor Green
Write-Host "SQL Server: $count 筆" -ForegroundColor Cyan
Write-Host "PostgreSQL: $inserted 筆" -ForegroundColor Cyan
Write-Host "失敗: $errors 筆" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green

$pgConnection.Close()
