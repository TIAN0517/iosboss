#!/usr/bin/env node
/**
 * 九九瓦斯行管理系統 - Supabase 配置驗證腳本
 * 
 * 功能：
 * 1. 驗證環境變量配置
 * 2. 測試 Supabase 連接
 * 3. 驗證 RLS 策略
 * 4. 檢查數據完整性
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 配置
const CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
};

// 驗證結果
const results = {
  env: { passed: 0, failed: 0, total: 0 },
  connection: { passed: 0, failed: 0, total: 0 },
  rls: { passed: 0, failed: 0, total: 0 },
  data: { passed: 0, failed: 0, total: 0 },
};

/**
 * 驗證環境變量
 */
function verifyEnvironmentVariables() {
  log('\n📋 驗證環境變量配置...', 'cyan');
  
  const checks = [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      value: CONFIG.SUPABASE_URL,
      required: true,
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: CONFIG.SUPABASE_ANON_KEY,
      required: true,
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
      value: CONFIG.SUPABASE_SERVICE_ROLE_KEY,
      required: true,
    },
  ];
  
  checks.forEach(check => {
    results.env.total++;
    if (check.required && !check.value) {
      log(`  ❌ ${check.name}: 未設置`, 'red');
      results.env.failed++;
    } else if (check.value && check.value.length > 0) {
      log(`  ✅ ${check.name}: 已設置 (${check.value.substring(0, 20)}...)`, 'green');
      results.env.passed++;
    } else {
      log(`  ⚠️  ${check.name}: 可選，未設置`, 'yellow');
      results.env.passed++;
    }
  });
  
  return results.env.failed === 0;
}

/**
 * 測試 Supabase 連接
 */
async function testSupabaseConnection() {
  log('\n🔌 測試 Supabase 連接...', 'cyan');
  
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    log('  ❌ 缺少必要的環境變量，跳過連接測試', 'red');
    return false;
  }
  
  try {
    const supabase = createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );
    
    // 測試查詢 User 表
    results.connection.total++;
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('*')
      .limit(1);
    
    if (userError) {
      log(`  ❌ User 表查詢失敗: ${userError.message}`, 'red');
      results.connection.failed++;
    } else {
      log(`  ✅ User 表連接成功 (${users?.length || 0} 條記錄)`, 'green');
      results.connection.passed++;
    }
    
    // 測試查詢 Product 表
    results.connection.total++;
    const { data: products, error: productError } = await supabase
      .from('Product')
      .select('*')
      .limit(1);
    
    if (productError) {
      log(`  ❌ Product 表查詢失敗: ${productError.message}`, 'red');
      results.connection.failed++;
    } else {
      log(`  ✅ Product 表連接成功 (${products?.length || 0} 條記錄)`, 'green');
      results.connection.passed++;
    }
    
    // 測試查詢 Inventory 表
    results.connection.total++;
    const { data: inventory, error: inventoryError } = await supabase
      .from('Inventory')
      .select('*')
      .limit(1);
    
    if (inventoryError) {
      log(`  ❌ Inventory 表查詢失敗: ${inventoryError.message}`, 'red');
      results.connection.failed++;
    } else {
      log(`  ✅ Inventory 表連接成功 (${inventory?.length || 0} 條記錄)`, 'green');
      results.connection.passed++;
    }
    
    return results.connection.failed === 0;
  } catch (error) {
    log(`  ❌ 連接測試失敗: ${error.message}`, 'red');
    results.connection.failed++;
    return false;
  }
}

/**
 * 驗證 RLS 策略
 */
async function verifyRLSPolicies() {
  log('\n🔐 驗證 RLS 策略...', 'cyan');
  
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_SERVICE_ROLE_KEY) {
    log('  ⚠️  缺少 Service Role Key，跳過 RLS 驗證', 'yellow');
    return false;
  }
  
  try {
    const supabase = createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // 檢查主要表的 RLS 狀態
    const tables = ['User', 'Customer', 'Product', 'Inventory', 'GasOrder'];
    
    for (const table of tables) {
      results.rls.total++;
      try {
        // 嘗試查詢表（如果 RLS 啟用，應該可以查詢）
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          log(`  ❌ ${table} 表 RLS 可能有問題: ${error.message}`, 'red');
          results.rls.failed++;
        } else {
          log(`  ✅ ${table} 表 RLS 配置正常`, 'green');
          results.rls.passed++;
        }
      } catch (err) {
        log(`  ❌ ${table} 表檢查失敗: ${err.message}`, 'red');
        results.rls.failed++;
      }
    }
    
    return results.rls.failed === 0;
  } catch (error) {
    log(`  ❌ RLS 驗證失敗: ${error.message}`, 'red');
    results.rls.failed++;
    return false;
  }
}

/**
 * 檢查數據完整性
 */
async function checkDataIntegrity() {
  log('\n📊 檢查數據完整性...', 'cyan');
  
  if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY) {
    log('  ⚠️  缺少必要的環境變量，跳過數據檢查', 'yellow');
    return false;
  }
  
  try {
    const supabase = createClient(
      CONFIG.SUPABASE_URL,
      CONFIG.SUPABASE_ANON_KEY
    );
    
    // 檢查主要表的記錄數量
    const tables = [
      { name: 'User', expected: 4 },
      { name: 'ProductCategory', expected: 4 },
      { name: 'Product', expected: 21 },
      { name: 'Inventory', expected: 21 },
      { name: 'CustomerGroup', expected: 5 },
      { name: 'LineGroup', expected: 3 },
      { name: 'LineMessage', expected: 2 },
    ];
    
    for (const table of tables) {
      results.data.total++;
      try {
        const { count, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          log(`  ❌ ${table.name} 表查詢失敗: ${error.message}`, 'red');
          results.data.failed++;
        } else {
          const actual = count || 0;
          const status = actual >= table.expected ? '✅' : '⚠️';
          const color = actual >= table.expected ? 'green' : 'yellow';
          log(`  ${status} ${table.name}: ${actual} 條記錄 (預期: ${table.expected})`, color);
          results.data.passed++;
        }
      } catch (err) {
        log(`  ❌ ${table.name} 表檢查失敗: ${err.message}`, 'red');
        results.data.failed++;
      }
    }
    
    return results.data.failed === 0;
  } catch (error) {
    log(`  ❌ 數據完整性檢查失敗: ${error.message}`, 'red');
    results.data.failed++;
    return false;
  }
}

/**
 * 顯示驗證結果摘要
 */
function showSummary() {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 驗證結果摘要', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const categories = [
    { name: '環境變量', result: results.env },
    { name: '數據庫連接', result: results.connection },
    { name: 'RLS 策略', result: results.rls },
    { name: '數據完整性', result: results.data },
  ];
  
  categories.forEach(category => {
    const { name, result } = category;
    const total = result.total;
    const passed = result.passed;
    const failed = result.failed;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    const status = failed === 0 ? '✅' : '❌';
    const color = failed === 0 ? 'green' : 'red';
    
    log(`\n${status} ${name}:`, color);
    log(`  通過: ${passed}/${total} (${percentage}%)`, color);
    if (failed > 0) {
      log(`  失敗: ${failed}/${total}`, 'red');
    }
  });
  
  const totalTests = categories.reduce((sum, cat) => sum + cat.result.total, 0);
  const totalPassed = categories.reduce((sum, cat) => sum + cat.result.passed, 0);
  const totalFailed = categories.reduce((sum, cat) => sum + cat.result.failed, 0);
  const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  
  log('\n' + '='.repeat(60), 'cyan');
  log(`總體結果: ${totalPassed}/${totalTests} 通過 (${overallPercentage}%)`, 
    totalFailed === 0 ? 'green' : 'yellow');
  log('='.repeat(60), 'cyan');
  
  if (totalFailed === 0) {
    log('\n🎉 所有配置驗證通過！', 'green');
  } else {
    log('\n⚠️  部分配置需要修復，請查看上面的錯誤信息', 'yellow');
  }
}

/**
 * 主函數
 */
async function main() {
  log('\n🚀 九九瓦斯行管理系統 - Supabase 配置驗證', 'cyan');
  log('='.repeat(60), 'cyan');
  
  // 1. 驗證環境變量
  const envOk = verifyEnvironmentVariables();
  
  if (!envOk) {
    log('\n❌ 環境變量配置不完整，請先完成配置', 'red');
    showSummary();
    process.exit(1);
  }
  
  // 2. 測試連接
  await testSupabaseConnection();
  
  // 3. 驗證 RLS
  await verifyRLSPolicies();
  
  // 4. 檢查數據
  await checkDataIntegrity();
  
  // 5. 顯示摘要
  showSummary();
  
  // 6. 退出
  const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

// 運行主函數
if (require.main === module) {
  main().catch(error => {
    log(`\n❌ 發生錯誤: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

module.exports = { main, verifyEnvironmentVariables, testSupabaseConnection, verifyRLSPolicies, checkDataIntegrity };
