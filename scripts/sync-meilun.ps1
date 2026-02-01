# 從 SQL Server (BOSSJY) 讀取美崙站數據，寫入 PostgreSQL
Write-Host "=== 從 SQL Server 讀取美崙站數據 ===" -ForegroundColor Green

# 連接 SQL Server (使用 sa 密碼)
$sqlConnStr = "Server=BOSSJY\BOSSJY;Database=cpf47_meilun;User ID=sa;Password=ji394su3;TrustServerCertificate=true;"
$pgConnStr = "Host=localhost;Port=5432;Database=postgres;User ID=postgres;Password=Ss520520;"

$sqlConnection = new-object System.Data.SqlClient.SqlConnection($sqlConnStr)
$sqlConnection.Open()
Write-Host "✅ SQL Server 連接成功" -ForegroundColor Green

# 讀取客戶數量
$countCmd = new-object System.Data.SqlClient.SqlCommand("SELECT COUNT(*) FROM Cust", $sqlConnection)
$sqlCount = $countCmd.ExecuteScalar()
Write-Host "SQL Server 客戶數: $sqlCount" -ForegroundColor Cyan

# 讀取所有客戶數據
Write-Host "讀取客戶數據..." -ForegroundColor Yellow
$adapter = new-object System.Data.SqlClient.SqlDataAdapter("SELECT * FROM Cust", $sqlConnection)
$dataTable = new-object System.Data.DataTable
$adapter.Fill($dataTable) | Out-Null
Write-Host "已讀取 $($dataTable.Rows.Count) 筆資料" -ForegroundColor Cyan

# 連接 PostgreSQL
Write-Host "連接 PostgreSQL..." -ForegroundColor Yellow
$pgConnection = new-object Npgsql.NpgsqlConnection($pgConnStr)
$pgConnection.Open()
Write-Host "✅ PostgreSQL 連接成功" -ForegroundColor Green

# 清空舊數據
Write-Host "清空舊數據..." -ForegroundColor Yellow
$deleteCmd = new-object Npgsql.NpgsqlCommand("DELETE FROM customers_meilun", $pgConnection)
$deleteCmd.ExecuteNonQuery() | Out-Null

# 插入新數據 (批量)
Write-Host "插入新數據 (批量)..." -ForegroundColor Yellow

$values = @()
$inserted = 0

foreach ($row in $dataTable.Rows) {
    $custid = $row['CustID'].ToString().Replace("'", "''")
    $custname = $row['CustName'].ToString().Replace("'", "''")
    $custaddr = $row['CustAddr'].ToString().Replace("'", "''")

    $val = "(
        '$custid',
        '$($row['CustCorpID'].ToString().Replace("'", "''"))',
        '$($row['CustAreaID'].ToString().Replace("'", "''"))',
        '$custname',
        '$($row['CustShortName'].ToString().Replace("'", "''"))',
        '$($row['CustTel1'].ToString().Replace("'", "''"))',
        '$($row['CustTel1a'].ToString().Replace("'", "''"))',
        '$($row['CustTel1b'].ToString().Replace("'", "''"))',
        '$($row['CustTel2'].ToString().Replace("'", "''"))',
        '$($row['CustTel2a'].ToString().Replace("'", "''"))',
        '$($row['CustTel2b'].ToString().Replace("'", "''"))',
        '$($row['CustTel3'].ToString().Replace("'", "''"))',
        '$($row['CustTel3a'].ToString().Replace("'", "''"))',
        '$($row['CustTel3b'].ToString().Replace("'", "''"))',
        '$($row['CustTel4'].ToString().Replace("'", "''"))',
        '$($row['CustTel4a'].ToString().Replace("'", "''"))',
        '$($row['CustTel4b'].ToString().Replace("'", "''"))',
        '$($row['CustMobilePhone'].ToString().Replace("'", "''"))',
        '$($row['CustUnifyID'].ToString().Replace("'", "''"))',
        '$($row['CustAddrZip'].ToString().Replace("'", "''"))',
        '$($row['CustSalesID'].ToString().Replace("'", "''"))',
        '$custaddr',
        '$($row['CustAddrCity'].ToString().Replace("'", "''"))',
        '$($row['CustAddrArea'].ToString().Replace("'", "''"))',
        '$($row['CustAddrRoad'].ToString().Replace("'", "''"))',
        $(if ($null -ne $row['CustAddrLane1']) { $row['CustAddrLane1'] } else { 0 }),
        $(if ($null -ne $row['CustAddrLane2']) { $row['CustAddrLane2'] } else { 0 }),
        $(if ($null -ne $row['CustAddrAlley1']) { $row['CustAddrAlley1'] } else { 0 }),
        $(if ($null -ne $row['CustAddrAlley2']) { $row['CustAddrAlley2'] } else { 0 }),
        $(if ($null -ne $row['CustAddrNo1']) { $row['CustAddrNo1'] } else { 0 }),
        $(if ($null -ne $row['CustAddrNo2']) { $row['CustAddrNo2'] } else { 0 }),
        $(if ($null -ne $row['CustAddrFloor1']) { $row['CustAddrFloor1'] } else { 0 }),
        $(if ($null -ne $row['CustAddrFloor2']) { $row['CustAddrFloor2'] } else { 0 }),
        '$($row['CustAddrMemo'].ToString().Replace("'", "''"))',
        '$($row['CustAddrSort'].ToString().Replace("'", "''"))',
        '$($row['CustAddrCode'].ToString().Replace("'", "''"))',
        '$($row['CustMemo'].ToString().Replace("'", "''"))',
        $(if ($null -ne $row['CustLastEdit']) { "'$($row['CustLastEdit'])" } else { 'NULL' }),
        $(if ($null -ne $row['CustGPSX']) { $row['CustGPSX'] } else { 0 }),
        $(if ($null -ne $row['CustGPSY']) { $row['CustGPSY'] } else { 0 }),
        $(if ($null -ne $row['CustTankDifference1']) { $row['CustTankDifference1'] } else { 0 }),
        $(if ($null -ne $row['CustTankDifference2']) { $row['CustTankDifference2'] } else { 0 }),
        $(if ($null -ne $row['CustTankDifference3']) { $row['CustTankDifference3'] } else { 0 }),
        $(if ($null -ne $row['CustTankDifference4']) { $row['CustTankDifference4'] } else { 0 }),
        $(if ($null -ne $row['CustTankDifference5']) { $row['CustTankDifference5'] } else { 0 }),
        $(if ($null -ne $row['CustMeterDifference']) { $row['CustMeterDifference'] } else { 0 }),
        $(if ($null -ne $row['CustMeterCoefficient1']) { $row['CustMeterCoefficient1'] } else { 0 }),
        $(if ($null -ne $row['CustMeterCoefficient2']) { $row['CustMeterCoefficient2'] } else { 0 }),
        $(if ($null -ne $row['CustMeterCoefficient3']) { $row['CustMeterCoefficient3'] } else { 0 }),
        $(if ($null -ne $row['CustMeterPressure1']) { $row['CustMeterPressure1'] } else { 0 }),
        $(if ($null -ne $row['CustMeterPressure2']) { $row['CustMeterPressure2'] } else { 0 }),
        $(if ($null -ne $row['CustMeterPressure3']) { $row['CustMeterPressure3'] } else { 0 }),
        $(if ($null -ne $row['CustMeterCurrent1']) { $row['CustMeterCurrent1'] } else { 0 }),
        $(if ($null -ne $row['CustMeterCurrent2']) { $row['CustMeterCurrent2'] } else { 0 }),
        $(if ($null -ne $row['CustMeterCurrent3']) { $row['CustMeterCurrent3'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceCollect']) { $row['CustUnbalanceCollect'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceCount1']) { $row['CustUnbalanceCount1'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceCount2']) { $row['CustUnbalanceCount2'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceCount3']) { $row['CustUnbalanceCount3'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceCount4']) { $row['CustUnbalanceCount4'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceCount5']) { $row['CustUnbalanceCount5'] } else { 0 }),
        '$($row['CustInvoiceType'].ToString().Replace("'", "''"))',
        '$($row['CustInvoiceTital'].ToString().Replace("'", "''"))',
        '$($row['CustType'].ToString().Replace("'", "''"))',
        $(if ($null -ne $row['CustUnbalanceFull1']) { $row['CustUnbalanceFull1'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceFull2']) { $row['CustUnbalanceFull2'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceFull3']) { $row['CustUnbalanceFull3'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceFull4']) { $row['CustUnbalanceFull4'] } else { 0 }),
        $(if ($null -ne $row['CustUnbalanceFull5']) { $row['CustUnbalanceFull5'] } else { 0 }),
        $(if ($null -ne $row['CustFloorExtra1']) { $row['CustFloorExtra1'] } else { 0 }),
        $(if ($null -ne $row['CustFloorExtra2']) { $row['CustFloorExtra2'] } else { 0 }),
        $(if ($null -ne $row['CustFloorExtra3']) { $row['CustFloorExtra3'] } else { 0 }),
        $(if ($null -ne $row['CustFloorExtra4']) { $row['CustFloorExtra4'] } else { 0 }),
        $(if ($null -ne $row['CustFloorExtra5']) { $row['CustFloorExtra5'] } else { 0 }),
        $(if ($null -ne $row['CustLastTradeTime']) { "'$($row['CustLastTradeTime'])" } else { 'NULL' }),
        $(if ($null -ne $row['CustExpectPeriod']) { $row['CustExpectPeriod'] } else { 'NULL' }),
        $(if ($null -ne $row['CustExpectDate']) { "'$($row['CustExpectDate'])" } else { 'NULL' }),
        $(if ($null -ne $row['CustCreateDate']) { "'$($row['CustCreateDate'])" } else { 'NULL' }),
        '$($row['CustTel5'].ToString().Replace("'", "''"))',
        '$($row['CustTel5a'].ToString().Replace("'", "''"))',
        '$($row['CustTel5b'].ToString().Replace("'", "''"))',
        1
    )"

    $values += $val
    $inserted++

    # 每 500 筆執行一次批量插入
    if ($values.Count -ge 500) {
        $batchValues = $values -join ",`n"
        $sql = "INSERT INTO customers_meilun (
            cust_id, cust_corp_id, cust_area_id, cust_name, cust_short_name,
            cust_tel1, cust_tel1a, cust_tel1b, cust_tel2, cust_tel2a, cust_tel2b,
            cust_tel3, cust_tel3a, cust_tel3b, cust_tel4, cust_tel4a, cust_tel4b,
            cust_mobile_phone, cust_unify_id, cust_addr_zip, cust_sales_id,
            cust_addr, cust_addr_city, cust_addr_area, cust_addr_road,
            cust_addrlane1, cust_addrlane2, cust_addralley1, cust_addralley2,
            cust_addrno1, cust_addrno2, cust_addrfloor1, cust_addrfloor2,
            cust_addr_memo, cust_addr_sort, cust_addr_code,
            cust_memo, cust_last_edit, cust_gps_x, cust_gps_y,
            custtankdifference1, custtankdifference2, custtankdifference3,
            custtankdifference4, custtankdifference5, custmeterdifference,
            custmetercoefficient1, custmetercoefficient2, custmetercoefficient3,
            custmeterpressure1, custmeterpressure2, custmeterpressure3,
            custmetercurrent1, custmetercurrent2, custmetercurrent3,
            cust_unbalance_collect, cust_unbalance_count1, cust_unbalance_count2,
            cust_unbalance_count3, cust_unbalance_count4, cust_unbalance_count5,
            cust_invoice_type, cust_invoice_tital, cust_type,
            cust_unbalance_full1, cust_unbalance_full2, cust_unbalance_full3,
            cust_unbalance_full4, cust_unbalance_full5,
            cust_floor_extra1, cust_floor_extra2, cust_floor_extra3,
            cust_floor_extra4, cust_floor_extra5,
            cust_last_trade_time, cust_expect_period, cust_expect_date,
            cust_create_date, cust_tel5, cust_tel5a, cust_tel5b, station_id
        ) VALUES `n$batchValues"

        try {
            $cmd = new-object Npgsql.NpgsqlCommand($sql, $pgConnection)
            $cmd.ExecuteNonQuery() | Out-Null
            Write-Host "  已匯入 $inserted 筆..." -ForegroundColor Gray
        } catch {
            Write-Host "  錯誤: $($_.Exception.Message)" -ForegroundColor Red
        }
        $values = @()
    }
}

# 插入剩餘數據
if ($values.Count -gt 0) {
    $batchValues = $values -join ",`n"
    $sql = "INSERT INTO customers_meilun (
        cust_id, cust_corp_id, cust_area_id, cust_name, cust_short_name,
        cust_tel1, cust_tel1a, cust_tel1b, cust_tel2, cust_tel2a, cust_tel2b,
        cust_tel3, cust_tel3a, cust_tel3b, cust_tel4, cust_tel4a, cust_tel4b,
        cust_mobile_phone, cust_unify_id, cust_addr_zip, cust_sales_id,
        cust_addr, cust_addr_city, cust_addr_area, cust_addr_road,
        cust_addrlane1, cust_addrlane2, cust_addralley1, cust_addralley2,
        cust_addrno1, cust_addrno2, cust_addrfloor1, cust_addrfloor2,
        cust_addr_memo, cust_addr_sort, cust_addr_code,
        cust_memo, cust_last_edit, cust_gps_x, cust_gps_y,
        custtankdifference1, custtankdifference2, custtankdifference3,
        custtankdifference4, custtankdifference5, custmeterdifference,
        custmetercoefficient1, custmetercoefficient2, custmetercoefficient3,
        custmeterpressure1, custmeterpressure2, custmeterpressure3,
        custmetercurrent1, custmetercurrent2, custmetercurrent3,
        cust_unbalance_collect, cust_unbalance_count1, cust_unbalance_count2,
        cust_unbalance_count3, cust_unbalance_count4, cust_unbalance_count5,
        cust_invoice_type, cust_invoice_tital, cust_type,
        cust_unbalance_full1, cust_unbalance_full2, cust_unbalance_full3,
        cust_unbalance_full4, cust_unbalance_full5,
        cust_floor_extra1, cust_floor_extra2, cust_floor_extra3,
        cust_floor_extra4, cust_floor_extra5,
        cust_last_trade_time, cust_expect_period, cust_expect_date,
        cust_create_date, cust_tel5, cust_tel5a, cust_tel5b, station_id
    ) VALUES `n$batchValues"

    try {
        $cmd = new-object Npgsql.NpgsqlCommand($sql, $pgConnection)
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "  已匯入剩餘 $inserted 筆..." -ForegroundColor Gray
    } catch {
        Write-Host "  錯誤: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 驗證
Write-Host ""
Write-Host "✅ 完成!" -ForegroundColor Green
Write-Host "   SQL Server: $sqlCount 筆" -ForegroundColor Cyan
Write-Host "   PostgreSQL: $inserted 筆" -ForegroundColor Cyan

$verifyCmd = new-object Npgsql.NpgsqlCommand("SELECT COUNT(*) FROM customers_meilun", $pgConnection)
$pgCount = $verifyCmd.ExecuteScalar()
Write-Host "   驗證: $pgCount 筆" -ForegroundColor Cyan

$sqlConnection.Close()
$pgConnection.Close()
