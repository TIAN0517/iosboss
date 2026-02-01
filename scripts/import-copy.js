const fs = require('fs');
const pg = require('pg');

const client = new pg.Client({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Ss520520'
});

const csvPath = 'C:\\Users\\tian7\\Desktop\\customers_meilun.csv';

async function main() {
  console.log('=== 匯入美崙站數據 ===\n');

  try {
    await client.connect();
    console.log('✅ PostgreSQL 連接成功');

    // 清空舊數據
    console.log('清空舊數據...');
    await client.query('DELETE FROM customers_meilun');

    // 使用 COPY 匯入
    console.log('匯入數據 (COPY)...');

    const copyQuery = `
      COPY customers_meilun FROM STDIN
      WITH (FORMAT CSV, HEADER true, NULL '')
    `;

    const stream = fs.createReadStream(csvPath);
    await client.query(copyQuery, [stream]);

    // 驗證
    const result = await client.query('SELECT COUNT(*) as cnt FROM customers_meilun');
    console.log(`\n✅ 完成!`);
    console.log(`   PostgreSQL: ${result.rows[0].cnt} 筆`);

    await client.end();

  } catch (e) {
    console.error('\n❌ 錯誤:', e.message);
    await client.end();
    process.exit(1);
  }
}

main();
