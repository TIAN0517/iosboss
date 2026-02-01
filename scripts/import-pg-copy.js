const fs = require('fs');
const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Ss520520'
});

const sourceCsv = 'C:/Users/tian7/Desktop/customers_meilun.csv';
const tempCsv = 'C:/Program Files/PostgreSQL/16/data/customers_meilun.csv';

// 轉換中文時間戳格式為 PostgreSQL 格式
function convertTimestamp(ts) {
  if (!ts || ts.trim() === '') return '\\N';

  // 移除外層引號
  let s = ts.replace(/^"|"$/g, '').trim();
  if (s === '') return '\\N';

  // 格式: "2025/12/11 下午 02:20:45" 或 "2025/12/11 上午 09:30:00"
  // 轉換為: "2025-12-11 14:20:45" 或 "2025-12-11 09:30:00"

  const match = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(下午|上午)\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (!match) {
    console.log('   無法解析時間戳:', s);
    return '\\N';
  }

  const [, year, month, day, period, hour, min, sec] = match;
  let h = parseInt(hour, 10);

  if (period === '下午' && h !== 12) {
    h += 12;
  } else if (period === '上午' && h === 12) {
    h = 0;
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${h.toString().padStart(2, '0')}:${min}:${sec}`;
}

// 解析 CSV 行 (處理標準 RFC 4180 格式)
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // 檢查是否為轉義的引號 ("")
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // 跳過下一個引號
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

async function main() {
  console.log('=== 匯入美崙站數據到 PostgreSQL ===\n');

  try {
    await client.connect();
    console.log('✅ PostgreSQL 連接成功');

    // 讀取並修復 CSV (處理 Windows \r\n 行尾和嵌入式換行)
    console.log('\n1. 讀取並修復 CSV...');
    let content = fs.readFileSync(sourceCsv, 'utf-8');

    // 處理嵌入式換行：如果引號內包含換行，則合併行
    // 正確邏輯：如果我們在引號內且當前行結束時也在引號內，則保持合併狀態
    const lines = [];
    const rawLines = content.split('\n').map(l => l.replace(/\r$/, ''));
    let currentLine = '';
    let inQuote = false;

    for (const line of rawLines) {
      const quoteCount = (line.match(/"/g) || []).length;
      const endsInQuote = (quoteCount % 2 === 1);

      if (inQuote) {
        // 我們在引號內，添加換行和此行
        currentLine += '\n' + line;
        // 如果當前行結束時不在引號內，則離開引號狀態
        if (!endsInQuote) {
          inQuote = false;
        }
      } else {
        // 我們不在引號內
        if (currentLine) lines.push(currentLine);
        currentLine = line;
        // 如果當前行結束時在引號內，則進入引號狀態
        if (endsInQuote) {
          inQuote = true;
        }
      }
    }
    if (currentLine) lines.push(currentLine);

    // 過濾空行
    const validLines = lines.filter(l => l.trim().length > 0);
    console.log(`   總行數: ${validLines.length}`);

    // 修復時間戳欄位：空字串改為 \N (NULL)
    // 欄位位置: CustLastEdit(38), CustLastTradeTime(75), CustExpectDate(77), CustCreateDate(78)
    let processedCount = 0;
    let skippedCount = 0;
    let skippedBadColumns = 0;
    let skippedEmptyCustId = 0;
    const fixedLines = validLines.map((line, index) => {
      if (index === 0) return line;  // 標題行保持不變 (不添加 station_id)

      // 解析 CSV 行 (使用標準 CSV 解析)
      const values = parseCSVLine(line);

      // 跳過 CustID 為空的列 (無效數據)
      const custIdVal = values[0] ? values[0].replace(/"/g, '').trim() : '';
      if (custIdVal === '') {
        skippedEmptyCustId++;
        return null;
      }

      // 如果欄位數量不是 81，跳過此列 (地址含未引用逗號)
      if (values.length !== 81) {
        if (skippedBadColumns < 5) {
          console.log(`   跳過行 ${index + 1}: ${values.length} 個欄位 (custid: ${custIdVal})`);
        }
        skippedBadColumns++;
        return null;
      }

      // 時間戳欄位索引 (0-based): 37, 74, 76, 77
      const tsIndices = [37, 74, 76, 77];

      // NOT NULL 字串欄位索引
      const notNullStringIndices = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
        72, 73, 74, 75, 76, 77, 78, 79, 80
      ];

      // 處理所有欄位
      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        const cleanVal = val ? val.replace(/"/g, '').trim() : '';

        if (cleanVal === '') {
          if (tsIndices.includes(i)) {
            values[i] = '\\N';
          } else if (notNullStringIndices.includes(i)) {
            values[i] = '""';
          } else {
            values[i] = '\\N';
          }
        } else if (tsIndices.includes(i)) {
          values[i] = convertTimestamp(val);
        } else if (val.includes(',')) {
          // 欄位包含逗號，需要重新添加引號
          values[i] = `"${val}"`;
        }
      }

      processedCount++;
      return values.join(',');
    });

    if (skippedBadColumns > 5) {
      console.log(`   ... 還有 ${skippedBadColumns - 5} 列因欄位數量錯誤被跳過`);
    }
    console.log(`   處理: ${processedCount} 行, 跳過: ${skippedCount + skippedBadColumns + skippedEmptyCustId} 行`);

    const fixedContent = fixedLines.filter(line => line !== null).join('\n');
    fs.writeFileSync(tempCsv, fixedContent, 'utf-8');
    console.log('   CSV 修復完成');

    // 清空舊數據
    console.log('\n2. 清空 customers_meilun...');
    await client.query('DELETE FROM customers_meilun');

    // 使用 COPY，指定欄位列表 (不包含 station_id，因爲它有 DEFAULT)
    console.log('\n3. 執行 COPY FROM...');
    await client.query(`
      COPY customers_meilun (
        custid, custcorpid, custareaid, custname, custshortname,
        custtel1, custtel1a, custtel1b, custtel2, custtel2a, custtel2b,
        custtel3, custtel3a, custtel3b, custtel4, custtel4a, custtel4b,
        custmobilephone, custunifyid, custaddrzip, custsalesid,
        custaddr, custaddrcity, custaddrarea, custaddrroad,
        custaddrlane1, custaddrlane2, custaddralley1, custaddralley2,
        custaddrno1, custaddrno2, custaddrfloor1, custaddrfloor2,
        custaddrmemo, custaddrsort, custaddrcode,
        custmemo, custlastedit, custgpsx, custgpsy,
        custtankdifference1, custtankdifference2, custtankdifference3,
        custtankdifference4, custtankdifference5, custmeterdifference,
        custmetercoefficient1, custmetercoefficient2, custmetercoefficient3,
        custmeterpressure1, custmeterpressure2, custmeterpressure3,
        custmetercurrent1, custmetercurrent2, custmetercurrent3,
        custunbalancecollect, custunbalancecount1, custunbalancecount2,
        custunbalancecount3, custunbalancecount4, custunbalancecount5,
        custinvoicetype, custinvoicetital, custtype,
        custunbalancefull1, custunbalancefull2, custunbalancefull3,
        custunbalancefull4, custunbalancefull5,
        custfloorextra1, custfloorextra2, custfloorextra3,
        custfloorextra4, custfloorextra5,
        custlasttradetime, custexpectperiod, custexpectdate,
        custcreatedate, custtel5, custtel5a, custtel5b
      )
      FROM '${tempCsv}'
      WITH (FORMAT CSV, HEADER true, NULL '\\N')
    `);
    console.log('   COPY 完成');

    // 驗證
    const result = await client.query('SELECT COUNT(*) as cnt FROM customers_meilun');

    // 清理
    fs.unlinkSync(tempCsv);

    console.log('\n========================================');
    console.log('✅ 完成!');
    console.log(`   PostgreSQL customers_meilun: ${result.rows[0].cnt} 筆`);
    console.log('========================================');

    await client.end();

  } catch (e) {
    console.error('\n❌ 錯誤:', e.message);
    if (e.code) console.log('Code:', e.code);
    console.log('\n保留 temp CSV 文件以便除錯...');
    console.log('Temp file:', tempCsv);
    await client.end();
    process.exit(1);
  }
}

main();
