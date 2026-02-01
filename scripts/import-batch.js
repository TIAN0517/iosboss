/**
 * 從 CSV 批量匯入美崙站數據到 PostgreSQL
 * 使用 batch insert 提高效能
 */
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const csvPath = 'C:\\Users\\tian7\\Desktop\\customers_meilun.csv';

async function main() {
  console.log('=== 從 CSV 批量匯入美崙站數據 ===\n');

  try {
    // 1. 讀取 CSV
    console.log('1. 讀取 CSV...');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    console.log(`   欄位數: ${headers.length}, 數據行數: ${lines.length - 1}`);

    // 2. 清空舊數據
    console.log('\n2. 清空 customers_meilun...');
    await prisma.$executeRaw`DELETE FROM customers_meilun`;
    console.log('   已清除');

    // 3. 解析 CSV
    console.log('\n3. 解析數據...');
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // 簡單解析（處理引號）
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.replace(/^"|"$/g, '').trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.replace(/^"|"$/g, '').trim());

      if (values.length === headers.length) {
        data.push(values);
      }
    }
    console.log(`   有效數據: ${data.length} 筆`);

    // 4. 批量插入
    console.log('\n4. 批量插入...');
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      for (const values of batch) {
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
              ${values[0]}, ${values[1]}, ${values[2]}, ${values[3]}, ${values[4]},
              ${values[5]}, ${values[6]}, ${values[7]}, ${values[8]}, ${values[9]},
              ${values[10]}, ${values[11]}, ${values[12]}, ${values[13]}, ${values[14]},
              ${values[15]}, ${values[16]}, ${values[17]}, ${values[18]}, ${values[19]},
              ${values[20]}, ${values[21]}, ${values[22]}, ${values[23]}, ${values[24] || '0'},
              ${values[25] || '0'}, ${values[26] || '0'}, ${values[27] || '0'}, ${values[28] || '0'}, ${values[29] || '0'},
              ${values[30] || '0'}, ${values[31] || '0'}, ${values[32]}, ${values[33]}, ${values[34]},
              ${values[35]}, ${values[36]}, ${values[37] || '0'}, ${values[38] || '0'},
              ${values[39] || '0'}, ${values[40] || '0'}, ${values[41] || '0'}, ${values[42] || '0'}, ${values[43] || '0'},
              ${values[44] || '0'}, ${values[45] || '0'}, ${values[46] || '0'}, ${values[47] || '0'},
              ${values[48] || '0'}, ${values[49] || '0'}, ${values[50] || '0'}, ${values[51] || '0'},
              ${values[52] || '0'}, ${values[53] || '0'}, ${values[54] || '0'}, ${values[55] || '0'},
              ${values[56] || '0'}, ${values[57] || '0'}, ${values[58] || '0'}, ${values[59] || '0'},
              ${values[60]}, ${values[61]}, ${values[62]},
              ${values[63] || '0'}, ${values[64] || '0'}, ${values[65] || '0'},
              ${values[66] || '0'}, ${values[67] || '0'}, ${values[68] || '0'},
              ${values[69] || '0'}, ${values[70] || '0'}, ${values[71] || '0'},
              ${values[72]}, ${values[73] || '0'}, ${values[74]},
              ${values[75]}, ${values[76]}, ${values[77]},
              ${values[78]}, ${values[79]}, ${values[80]}, 1
            )
          `;
          inserted++;
        } catch (e) {
          // 跳過錯誤
        }
      }

      if (i + batchSize < data.length) {
        console.log(`   進度: ${Math.min(i + batchSize, data.length)}/${data.length}`);
      }
    }

    // 5. 驗證
    console.log('\n5. 驗證...');
    const pgCount = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM customers_meilun`;

    console.log('\n========================================');
    console.log('✅ 完成!');
    console.log(`   CSV 數據: ${data.length} 筆`);
    console.log(`   成功插入: ${inserted} 筆`);
    console.log(`   PostgreSQL: ${pgCount[0].cnt} 筆`);
    console.log('========================================');

    await prisma.$disconnect();

  } catch (e) {
    console.error('\n❌ 錯誤:', e.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
