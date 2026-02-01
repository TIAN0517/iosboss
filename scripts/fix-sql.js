/**
 * 修復 SQL 檔案，添加 DROP TABLE IF EXISTS
 */

const fs = require('fs');

// 讀取檔案 (使用參數或預設值)
const inputFile = process.argv[2] || 'backups/migration/cpf47_ji_an_to_postgres.sql';
const outputFile = process.argv[3] || inputFile;

const content = fs.readFileSync(inputFile, 'utf8');

let count = 0;

// 只匹配 CREATE TABLE + 表名 + 左括號
const pattern = /^CREATE TABLE (\w+)\s*\(/gm;

const newContent = content.replace(pattern, (match, tableName) => {
  count++;
  return `-- 刪除舊表（如果存在）\nDROP TABLE IF EXISTS ${tableName} CASCADE;\n\n${match}`;
});

// 寫回檔案
fs.writeFileSync(outputFile, newContent, 'utf8');

console.log(`已修復 SQL 檔案，添加 ${count} 個 DROP TABLE IF EXISTS`);
console.log('\n前 35 行預覽：');
console.log('-'.repeat(50));
console.log(newContent.split('\n').slice(0, 35).join('\n'));
