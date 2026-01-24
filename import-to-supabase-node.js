#!/usr/bin/env node

/**
 * ========================================
 * 九九瓦斯行管理系統 - 直接導入到 Supabase (Node.js 版本)
 * ========================================
 * 不依賴 pg_dump，直接使用 pg 包
 * 
 * 用法：
 *   node import-to-supabase-node.js <SUPABASE_URL> <SQL_FILE>
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 獲取命令行參數
const supabaseUrl = process.argv[2];
const sqlFilePath = process.argv[3];

if (!supabaseUrl || !sqlFilePath) {
    console.error('❌ 錯誤：缺少參數');
    console.error('');
    console.error('用法：');
    console.error('  node import-to-supabase-node.js <SUPABASE_URL> <SQL_FILE>');
    console.error('');
    console.error('參數說明：');
    console.error('  <SUPABASE_URL> - Supabase 數據庫連接 URL');
    console.error('  <SQL_FILE> - SQL 文件路徑');
    console.error('');
    console.error('範例：');
    console.error('  node import-to-supabase-node.js "postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" ".\\backups\\migration\\gas-management-20251229-212901.sql"');
    console.log('');
    console.log('💡 提示：從 Supabase Dashboard 獲取連接 URL：');
    console.log('   https://supabase.com/dashboard');
    console.log('   Settings → Database → Connection String → URI');
    process.exit(1);
}

// 檢查 SQL 文件是否存在
if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ 錯誤：SQL 文件不存在：${sqlFilePath}`);
    process.exit(1);
}

console.log('🔍 連接到 Supabase...');
console.log(`📄 SQL 文件：${sqlFilePath}`);
console.log(`🌐 目標：${supabaseUrl}`);

// 讀取 SQL 文件
const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
const sqlSize = (sqlContent.length / 1024).toFixed(2);
console.log(`📊 文件大小：${sqlSize} KB`);

// 創建連接池
const pool = new Pool({
    connectionString: supabaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

console.log('⏳ 開始導入...');

// 開始執行導入
const startTime = Date.now();
let totalStatements = 0;
let completedStatements = 0;

async function importSQL() {
    const client = await pool.connect();
    
    try {
        // 拆分 SQL 語句（按分號分割）
        const statements = sqlContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('--'));
        
        // 移除空行和註釋
        const cleanStatements = statements.filter(s => s.length > 0 && !s.match(/^--/));
        
        totalStatements = cleanStatements.length;
        
        console.log(`📝 總語句數：${totalStatements}`);
        
        // 逐個執行語句（跳過 SET 和 COMMENT）
        for (let i = 0; i < cleanStatements.length; i++) {
            const statement = cleanStatements[i];
            
            // 跳過 SET 語句（通常不需要）
            if (statement.match(/^SET /i)) {
                continue;
            }
            
            // 跳過 COMMENT 語句
            if (statement.startsWith('--')) {
                continue;
            }
            
            try {
                await client.query(statement);
                completedStatements++;
                
                // 每 50 條語句顯示進度
                if (completedStatements % 50 === 0 || i === cleanStatements.length - 1) {
                    const progress = Math.round((completedStatements / totalStatements) * 100);
                    console.log(`   進度：${progress}% (${completedStatements}/${totalStatements})`);
                }
            } catch (error) {
                console.error(`   ❌ 語句 ${i + 1} 失敗：${statement.substring(0, 50)}...`);
                console.error(`   錯誤信息：${error.message}`);
                
                // 繼續執行，不中斷
                // 這樣可以導入大部分數據
            }
        }
        
        console.log('');
        console.log('✅ 導入完成！');
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`⏱️  耗時：${elapsed} 秒`);
        console.log(`📊 執行了 ${completedStatements}/${totalStatements} 條語句`);
        
    } catch (error) {
        console.error('');
        console.error('❌ 導入過程中發生錯誤！');
        console.error(`錯誤類型：${error.name}`);
        console.error(`錯誤信息：${error.message}`);
        console.error('');
        console.error('💡 建議：');
        console.error('1. 檢查 Supabase 連接 URL 是否正確');
        console.error('2. 檢查 SQL 文件格式是否正確');
        console.error('3. 檢查 Supabase 項目是否已創建');
        throw error;
    } finally {
        await client.release();
        await pool.end();
    }
}

// 執行導入
importSQL().then(() => {
    console.log('');
    console.log('🎉 程序執行完成！');
    console.log('');
    console.log('📝 下一步：');
    console.log('1. 在 Supabase Table Editor 查看數據');
    console.log('2. 在 Supabase SQL Editor 執行以下查詢驗證：');
    console.log('   SELECT COUNT(*) FROM "User";');
    console.log('   SELECT COUNT(*) FROM "Customer";');
    console.log('   SELECT COUNT(*) FROM "GasOrder";');
    console.log('');
    console.log('3. 然後部署到 Vercel');
    console.log('   https://vercel.com/new');
    console.log('');
    console.log('✨ 完成！');
}).catch(error => {
    console.error('');
    console.error('💀 錯誤：腳本執行失敗');
    console.error(error.message);
    process.exit(1);
});
