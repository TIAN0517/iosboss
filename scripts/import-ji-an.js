/**
 * 從 SQL Server cpf47_ji_an 匯入客戶資料到 PostgreSQL
 */
const fs = require('fs');
const { Client } = require('pg');
const { execSync } = require('child_process');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Ss520520'
});

const tempCsv = 'C:/Program Files/PostgreSQL/16/data/customers_ji_an_import.csv';

// 轉換中文時間戳格式為 PostgreSQL 格式
function convertTimestamp(ts) {
  if (!ts || ts.trim() === '') return '\\N';
  let s = ts.replace(/^"|"$/g, '').trim();
  if (s === '') return '\\N';

  const match = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s*(下午|上午)\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (!match) return '\\N';

  const [, year, month, day, period, hour, min, sec] = match;
  let h = parseInt(hour, 10);
  if (period === '下午' && h !== 12) h += 12;
  else if (period === '上午' && h === 12) h = 0;

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${h.toString().padStart(2, '0')}:${min}:${sec}`;
}

// 解析 CSV 行
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
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
  console.log('=== 匯入吉安站數據到 PostgreSQL ===\n');
  console.log('資料來源: SQL Server cpf47_ji_an.dbo.Cust\n');

  try {
    // 1. 使用 bcp 匯出到 CSV
    console.log('1. 從 SQL Server 匯出到 CSV...');
    const bcpPath = 'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\170\\Tools\\Binn\\bcp.exe';
    const csvPath = 'C:\\Users\\tian7\\Desktop\\customers_ji_an.csv';

    execSync(`"${bcpPath}" "SELECT * FROM cpf47_ji_an.dbo.Cust WHERE CustID > '' ORDER BY CustID" queryout "${csvPath}" -S localhost -E -t "," -c -T`);
    console.log('   CSV 匯出完成:', csvPath);

    // 清理 null bytes
    console.log('   清理 null bytes...');
    const cleanCsvPath = csvPath.replace('.csv', '_clean.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/\x00/g, '');
    fs.writeFileSync(cleanCsvPath, csvContent, 'utf-8');
    fs.unlinkSync(csvPath);

    console.log('\n2. 讀取並修復 CSV...');
    let content = fs.readFileSync(cleanCsvPath, 'utf-8');
    const rawLines = content.split('\n').map(l => l.replace(/\r$/, ''));

    // 處理嵌入式換行
    const lines = [];
    let currentLine = '';
    let inQuote = false;

    for (const line of rawLines) {
      const quoteCount = (line.match(/"/g) || []).length;
      const endsInQuote = (quoteCount % 2 === 1);

      if (inQuote) {
        currentLine += '\n' + line;
        if (!endsInQuote) inQuote = false;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = line;
        if (endsInQuote) inQuote = true;
      }
    }
    if (currentLine) lines.push(currentLine);

    const validLines = lines.filter(l => l.trim().length > 0);
    console.log(`   總行數: ${validLines.length}`);

    // 3. 處理資料
    let processedCount = 0;
    let skippedCount = 0;
    const fixedLines = validLines.map((line, index) => {
      if (index === 0) return line;

      const values = parseCSVLine(line);
      const custIdVal = values[0] ? values[0].replace(/"/g, '').trim() : '';

      if (custIdVal === '') {
        skippedCount++;
        return null;
      }

      if (values.length !== 81) {
        console.log(`   跳過行 ${index + 1}: ${values.length} 個欄位 (custid: ${custIdVal})`);
        skippedCount++;
        return null;
      }

      const tsIndices = [37, 74, 76, 77];

      // NOT NULL 字串欄位索引
      const notNullStringIndices = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
        72, 73, 74, 75, 76, 77, 78, 79, 80
      ];

      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        const cleanVal = val ? val.replace(/"/g, '').trim() : '';

        if (cleanVal === '') {
          if (tsIndices.includes(i)) {
            values[i] = '\\N';
          } else if (notNullStringIndices.includes(i)) {
            values[i] = '""';  // NOT NULL 字串用空字串
          } else {
            values[i] = '\\N';
          }
        } else if (tsIndices.includes(i)) {
          values[i] = convertTimestamp(val);
        } else if (val.includes(',')) {
          values[i] = `"${val}"`;
        }
      }

      processedCount++;
      return values.join(',');
    });

    console.log(`   處理: ${processedCount} 行, 跳過: ${skippedCount} 行`);

    const fixedContent = fixedLines.filter(line => line !== null).join('\n');
    fs.writeFileSync(tempCsv, fixedContent, 'utf-8');
    console.log('   CSV 修復完成');

    // 4. 連接 PostgreSQL
    await client.connect();
    console.log('\n3. PostgreSQL 連接成功');

    // 5. 清空舊數據
    console.log('4. 清空 customers_ji_an...');
    await client.query('DELETE FROM customers_ji_an');

    // 6. 使用 COPY 匯入
    console.log('5. 執行 COPY FROM...');
    await client.query(`
      COPY customers_ji_an (
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

    // 7. 驗證
    const result = await client.query('SELECT COUNT(*) as cnt FROM customers_ji_an');

    // 清理
    fs.unlinkSync(tempCsv);
    try { fs.unlinkSync(cleanCsvPath); } catch {}

    console.log('\n========================================');
    console.log('✅ 完成!');
    console.log(`   吉安站客戶: ${result.rows[0].cnt} 筆`);
    console.log('========================================');

    await client.end();

  } catch (e) {
    console.error('\n❌ 錯誤:', e.message);
    if (e.code) console.log('Code:', e.code);
    try { fs.unlinkSync(tempCsv); } catch {}
    await client.end();
    process.exit(1);
  }
}

main();
