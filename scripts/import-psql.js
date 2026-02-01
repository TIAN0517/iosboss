/**
 * 從 CSV 批量匯入美崙站數據到 PostgreSQL
 * 使用 COPY 命令直接匯入
 */
const fs = require('fs');
const { execSync } = require('child_process');

const csvPath = 'C:\\Users\\tian7\\Desktop\\customers_meilun.csv';

async function main() {
  console.log('=== 使用 psql COPY 匯入 ===\n');

  try {
    // 1. 讀取 CSV 檔案資訊
    console.log('1. 檢查 CSV...');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.trim().split('\n');
    console.log(`   總行數: ${lines.length}`);

    // 2. 使用 psql COPY 命令
    console.log('\n2. 執行 COPY...');

    // 確保表存在且清空
    const psql = '"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe"';
    const conn = 'postgresql://postgres:Ss520520@localhost:5432/postgres';

    // 清空表
    console.log('   清空 customers_meilun...');
    execSync(`${psql} ${conn} -c "DELETE FROM customers_meilun"`);

    // 使用 COPY 匯入
    console.log('   執行 COPY FROM...');
    execSync(`${psql} ${conn} -c "\\COPY customers_meilun FROM '${csvPath}' WITH (FORMAT CSV, HEADER true)"`);

    // 3. 驗證
    console.log('\n3. 驗證...');
    const result = execSync(`${psql} ${conn} -t -c "SELECT COUNT(*) FROM customers_meilun"`);
    const count = result.toString().trim();

    console.log('\n========================================');
    console.log('✅ 完成!');
    console.log(`   PostgreSQL customers_meilun: ${count} 筆`);
    console.log('========================================');

  } catch (e) {
    console.error('\n❌ 錯誤:', e.message);
    if (e.stdout) console.log('stdout:', e.stdout.toString());
    if (e.stderr) console.log('stderr:', e.stderr.toString());
  }
}

main();
