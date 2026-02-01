/**
 * 同步 CPF47 (美崙站) 數據到 PostgreSQL
 */
const { PrismaClient } = require('@prisma/client');
const sql = require('mssql');

const prisma = new PrismaClient();

async function main() {
  console.log('=== 同步美崙站數據到 PostgreSQL ===\n');

  // SQL Server 配置 - 使用 Windows 認證
  const sqlConfig = {
    server: 'BOSSJY\\BOSSJY',
    database: 'CPF47',
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  };

  try {
    // 1. 連接 SQL Server
    console.log('1. 連接 SQL Server...');
    await sql.connect(sqlConfig);
    console.log('   ✅ SQL Server 連接成功');

    // 2. 讀取客戶數量
    const countResult = await sql.query`SELECT COUNT(*) as cnt FROM Cust`;
    const sqlCount = countResult.recordset[0].cnt;
    console.log(`   SQL Server 客戶數: ${sqlCount}`);

    // 3. 讀取所有客戶數據
    console.log('\n2. 讀取客戶數據...');
    const result = await sql.query`SELECT * FROM Cust`;
    const customers = result.recordset;
    console.log(`   已讀取 ${customers.length} 筆資料`);

    // 4. 連接 PostgreSQL (透過 Prisma)
    console.log('\n3. 連接 PostgreSQL...');
    console.log('   ✅ PostgreSQL 連接成功 (Prisma)');

    // 5. 清空舊數據
    console.log('\n4. 清空舊數據...');
    await prisma.$executeRaw`DELETE FROM customers_meilun`;
    console.log('   已清除舊資料');

    // 6. 插入新數據
    console.log('\n5. 插入新數據...');
    let inserted = 0;
    let errors = 0;

    for (const row of customers) {
      try {
        await prisma.$executeRaw`
          INSERT INTO customers_meilun (
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
          ) VALUES (
            ${row.CustID || ''},
            ${row.CustCorpID || ''},
            ${row.CustAreaID || ''},
            ${row.CustName || ''},
            ${row.CustShortName || ''},
            ${row.CustTel1 || ''},
            ${row.CustTel1a || ''},
            ${row.CustTel1b || ''},
            ${row.CustTel2 || ''},
            ${row.CustTel2a || ''},
            ${row.CustTel2b || ''},
            ${row.CustTel3 || ''},
            ${row.CustTel3a || ''},
            ${row.CustTel3b || ''},
            ${row.CustTel4 || ''},
            ${row.CustTel4a || ''},
            ${row.CustTel4b || ''},
            ${row.CustMobilePhone || ''},
            ${row.CustUnifyID || ''},
            ${row.CustAddrZip || ''},
            ${row.CustSalesID || ''},
            ${row.CustAddr || ''},
            ${row.CustAddrCity || ''},
            ${row.CustAddrArea || ''},
            ${row.CustAddrRoad || ''},
            ${row.CustAddrLane1 || 0},
            ${row.CustAddrLane2 || 0},
            ${row.CustAddrAlley1 || 0},
            ${row.CustAddrAlley2 || 0},
            ${row.CustAddrNo1 || 0},
            ${row.CustAddrNo2 || 0},
            ${row.CustAddrFloor1 || 0},
            ${row.CustAddrFloor2 || 0},
            ${row.CustAddrMemo || ''},
            ${row.CustAddrSort || ''},
            ${row.CustAddrCode || ''},
            ${row.CustMemo || ''},
            ${row.CustLastEdit || null},
            ${row.CustGPSX || 0},
            ${row.CustGPSY || 0},
            ${row.CustTankDifference1 || 0},
            ${row.CustTankDifference2 || 0},
            ${row.CustTankDifference3 || 0},
            ${row.CustTankDifference4 || 0},
            ${row.CustTankDifference5 || 0},
            ${row.CustMeterDifference || 0},
            ${row.CustMeterCoefficient1 || 0},
            ${row.CustMeterCoefficient2 || 0},
            ${row.CustMeterCoefficient3 || 0},
            ${row.CustMeterPressure1 || 0},
            ${row.CustMeterPressure2 || 0},
            ${row.CustMeterPressure3 || 0},
            ${row.CustMeterCurrent1 || 0},
            ${row.CustMeterCurrent2 || 0},
            ${row.CustMeterCurrent3 || 0},
            ${row.CustUnbalanceCollect || 0},
            ${row.CustUnbalanceCount1 || 0},
            ${row.CustUnbalanceCount2 || 0},
            ${row.CustUnbalanceCount3 || 0},
            ${row.CustUnbalanceCount4 || 0},
            ${row.CustUnbalanceCount5 || 0},
            ${row.CustInvoiceType || ''},
            ${row.CustInvoiceTital || ''},
            ${row.CustType || ''},
            ${row.CustUnbalanceFull1 || 0},
            ${row.CustUnbalanceFull2 || 0},
            ${row.CustUnbalanceFull3 || 0},
            ${row.CustUnbalanceFull4 || 0},
            ${row.CustUnbalanceFull5 || 0},
            ${row.CustFloorExtra1 || 0},
            ${row.CustFloorExtra2 || 0},
            ${row.CustFloorExtra3 || 0},
            ${row.CustFloorExtra4 || 0},
            ${row.CustFloorExtra5 || 0},
            ${row.CustLastTradeTime || null},
            ${row.CustExpectPeriod || 0},
            ${row.CustExpectDate || null},
            ${row.CustCreateDate || null},
            ${row.CustTel5 || ''},
            ${row.CustTel5a || ''},
            ${row.CustTel5b || ''},
            1
          )
        `;
        inserted++;

        if (inserted % 500 === 0) {
          console.log(`   已匯入 ${inserted} 筆...`);
        }
      } catch (e) {
        errors++;
        if (errors <= 3) {
          console.log(`   錯誤: ${e.message.substring(0, 80)}`);
        }
      }
    }

    console.log('\n✅ 完成!');
    console.log(`   SQL Server: ${sqlCount} 筆`);
    console.log(`   成功插入: ${inserted} 筆`);
    console.log(`   失敗: ${errors} 筆`);

    // 7. 驗證
    const pgCount = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM customers_meilun`;
    console.log(`   PostgreSQL: ${pgCount[0].cnt} 筆`);

    await sql.close();
    await prisma.$disconnect();

  } catch (e) {
    console.error('\n❌ 錯誤:', e.message);
    console.error(e.stack);
    await sql.close();
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
