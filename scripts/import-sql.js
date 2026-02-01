/**
 * 執行 SQL 檔案到 PostgreSQL
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sqlFile = 'C:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios\\backups\\migration\\cpf47_meilun_to_postgres.sql';

// 讀取並執行 SQL
const sql = fs.readFileSync(sqlFile, 'utf-8');

// 使用 psql 執行
const result = execSync(
  `"c:\\Program Files\\PostgreSQL\\16\\bin\\psql" -h localhost -p 5432 -d postgres -U postgres --set=CLIENT_ENCODING=UTF8 -f "${sqlFile}"`,
  {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024, // 50MB
    timeout: 300000
  }
);

console.log(result);
console.log('✅ 匯入完成！');
