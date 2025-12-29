#!/usr/bin/env node

/**
 * ========================================
 * 九九瓦斯行管理系統 - Supabase 导入脚本
 * ========================================
 *
 * 用法：
 *   node import-to-supabase.js <SUPABASE_URL>
 *
 * 获取 Supabase 连接 URL：
 *   1. 访问 https://supabase.com/dashboard
 *   2. 选择项目 → Settings → Database
 *   3. 找到 Connection String → URI
 *   4. 复制连接 URL
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SQL_FILE = path.join(__dirname, 'backups/migration/gas-management-clean.sql');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// 从命令行或环境变量获取 Supabase URL
let supabaseUrl = process.argv[2] || process.env.SUPABASE_DATABASE_URL;

if (!supabaseUrl) {
  log('❌ 缺少 Supabase 连接 URL', 'red');
  log('');
  log('用法：', 'cyan');
  log('  node import-to-supabase.js <SUPABASE_URL>', 'bright');
  log('');
  log('或者设置环境变量：', 'cyan');
  log('  set SUPABASE_DATABASE_URL=postgresql://...', 'bright');
  log('');
  log('获取连接 URL：', 'cyan');
  log('  1. 访问 https://supabase.com/dashboard', 'bright');
  log('  2. 选择项目 → Settings → Database', 'bright');
  log('  3. Connection String → URI → 复制', 'bright');
  process.exit(1);
}

// 检查 SQL 文件
if (!fs.existsSync(SQL_FILE)) {
  log(`❌ SQL 文件不存在：${SQL_FILE}`, 'red');
  process.exit(1);
}

log('', 'reset');
log('========================================', 'cyan');
log('  九九瓦斯行 - Supabase 数据导入工具', 'cyan');
log('========================================', 'cyan');
log('', 'reset');
log(`📄 SQL 文件：${SQL_FILE}`, 'blue');
log(`🌐 目标数据库：Supabase`, 'blue');
log('', 'reset');

// 读取 SQL 文件
const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');
const sqlSize = (sqlContent.length / 1024).toFixed(2);
log(`📊 文件大小：${sqlSize} KB`, 'blue');

// 创建连接池
const pool = new Pool({
  connectionString: supabaseUrl,
  ssl: { rejectUnauthorized: false }, // Supabase 需要 SSL
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

log('🔍 正在连接到 Supabase...', 'yellow');
log('', 'reset');

// 拆分 SQL 语句
function splitSQL(content) {
  const statements = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  let inComment = false;
  let inLineComment = false;

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // 跳过空行
    if (trimmed === '') continue;

    // 检查注释
    if (trimmed.startsWith('--')) {
      inLineComment = true;
    } else if (trimmed.startsWith('/*')) {
      inComment = true;
    }

    // 跳过注释行
    if (inLineComment) {
      inLineComment = false;
      continue;
    }
    if (inComment) {
      if (trimmed.endsWith('*/')) inComment = false;
      continue;
    }

    // 处理引号
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if ((char === '"' || char === "'") && (i === 0 || line[i - 1] !== '\\')) {
        if (!inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuote = false;
          quoteChar = '';
        }
      }
    }

    current += line + '\n';

    // 检查语句结束
    if (!inQuote && !inComment && trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }

  return statements;
}

// 执行导入
async function importSQL() {
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    // 验证连接
    await client.query('SELECT NOW()');
    log('✅ 已连接到 Supabase 数据库', 'green');
    log('', 'reset');

    // 解析 SQL
    log('📝 解析 SQL 语句...', 'yellow');
    const statements = splitSQL(sqlContent);

    // 过滤掉只包含注释的语句
    const validStatements = statements.filter(s => {
      const trimmed = s.trim();
      if (trimmed.startsWith('--')) return false;
      if (trimmed.startsWith('/*')) return false;
      return true;
    });

    log(`✅ 找到 ${validStatements.length} 条 SQL 语句`, 'green');
    log('', 'reset');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // 逐个执行语句
    for (let i = 0; i < validStatements.length; i++) {
      const stmt = validStatements[i].trim();

      // 跳过纯注释
      if (stmt.startsWith('--')) continue;

      // 跳过一些 Supabase 不支持的语句
      if (stmt.startsWith('SET default_tablespace')) continue;
      if (stmt.startsWith('SET default_table_access_method')) continue;

      try {
        await client.query(stmt);
        successCount++;

        // 显示进度
        if (successCount % 10 === 0 || i === validStatements.length - 1) {
          const progress = Math.round((i / validStatements.length) * 100);
          process.stdout.write(`\r   进度: ${progress}% (${successCount}/${validStatements.length})   `);
        }
      } catch (error) {
        errorCount++;
        const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
        errors.push({ error: error.message, stmt: preview });
      }
    }

    console.log(); // 换行
    log('', 'reset');

    // 显示结果
    log('========================================', 'cyan');
    log('  导入完成', 'cyan');
    log('========================================', 'cyan');
    log('', 'reset);

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    log(`⏱️  耗时：${elapsed} 秒`, 'blue');
    log(`✅ 成功：${successCount} 条语句`, 'green');
    log(`❌ 失败：${errorCount} 条语句`, errorCount > 0 ? 'red' : 'green');
    log('', 'reset');

    if (errors.length > 0) {
      log('失败语句详情：', 'yellow');
      log('', 'reset');
      errors.slice(0, 10).forEach((e, i) => {
        log(`${i + 1}. ${e.error}`, 'red');
        log(`   ${e.stmt}...`, 'bright');
        log('', 'reset');
      });
      if (errors.length > 10) {
        log(`... 还有 ${errors.length - 10} 个错误`, 'yellow');
      }
      log('', 'reset');
    }

    // 验证导入
    log('验证数据...', 'yellow');
    const tables = ['User', 'Customer', 'GasOrder', 'Product', 'Inventory'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM "${table}"`);
        const count = result.rows[0].count;
        log(`   ${table}: ${count} 条记录`, 'green');
      } catch (e) {
        log(`   ${table}: 查询失败`, 'yellow');
      }
    }

    log('', 'reset');
    log('========================================', 'cyan');
    log('🎉 导入完成！', 'green');
    log('========================================', 'cyan');
    log('', 'reset');
    log('下一步：', 'cyan');
    log('  1. 访问 Supabase Dashboard 查看数据', 'bright');
    log('  2. 测试应用连接', 'bright');
    log('  3. 部署到 Vercel', 'bright');
    log('', 'reset');

  } catch (error) {
    log('', 'reset');
    log('❌ 导入失败！', 'red');
    log(`错误: ${error.message}`, 'red');
    log('', 'reset');

    if (error.code === 'ECONNREFUSED') {
      log('可能原因：', 'yellow');
      log('  1. Supabase 连接 URL 不正确', 'bright');
      log('  2. 网络连接问题', 'bright');
      log('  3. Supabase 项目暂停', 'bright');
    } else if (error.code === '3D000') {
      log('错误：数据库不存在', 'red');
      log('请检查连接 URL 中的数据库名称', 'yellow');
    } else if (error.code === '28P01') {
      log('错误：密码认证失败', 'red');
      log('请检查连接 URL 中的密码是否正确', 'yellow');
    }
    throw error;
  } finally {
    await client.release();
    await pool.end();
  }
}

// 执行导入
importSQL().catch(error => {
  log('', 'reset');
  log('💀 程序执行失败', 'red');
  log(error.message, 'red');
  process.exit(1);
});
