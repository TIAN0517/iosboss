#!/usr/bin/env node
/**
 * Supabase 連接測試腳本
 * 用於驗證環境變數配置是否正確，並測試 Supabase 連接
 */

require('dotenv').config();

// 檢查是否安裝了 @supabase/supabase-js
let createClient;
try {
  const supabaseModule = require('@supabase/supabase-js');
  createClient = supabaseModule.createClient;
} catch (e) {
  console.error('❌ 未安裝 @supabase/supabase-js');
  console.error('請運行: npm install @supabase/supabase-js');
  process.exit(1);
}

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  log('❌ 缺少必要的環境變數', 'red');
  log('請設置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY（或 NEXT_PUBLIC_SUPABASE_ANON_KEY）', 'yellow');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  log('\n🔍 測試 Supabase 連接...\n', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n📡 連接信息：`, 'blue');
  log(`   URL: ${supabaseUrl}`, 'cyan');
  log(`   Key: ${supabaseKey.substring(0, 20)}...`, 'cyan');
  
  try {
    // 測試查詢 User 表
    log(`\n📊 測試查詢 User 表...`, 'blue');
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('*')
      .limit(5);
    
    if (userError) {
      log(`❌ User 表查詢失敗：`, 'red');
      log(`   錯誤: ${userError.message}`, 'red');
      log(`   詳細: ${JSON.stringify(userError, null, 2)}`, 'yellow');
      return false;
    }
    
    log(`✅ User 表查詢成功！`, 'green');
    log(`   找到 ${users.length} 條記錄`, 'cyan');
    
    if (users.length > 0) {
      log(`\n👤 示例用戶：`, 'blue');
      users.forEach((user, index) => {
        log(`   ${index + 1}. ${user.name || user.username} (${user.role})`, 'cyan');
      });
    }
    
    // 測試查詢 Product 表
    log(`\n📊 測試查詢 Product 表...`, 'blue');
    const { data: products, error: productError } = await supabase
      .from('Product')
      .select('*')
      .limit(5);
    
    if (productError) {
      log(`⚠️  Product 表查詢失敗：${productError.message}`, 'yellow');
    } else {
      log(`✅ Product 表查詢成功！`, 'green');
      log(`   找到 ${products.length} 條記錄`, 'cyan');
      
      if (products.length > 0) {
        log(`\n📦 示例產品：`, 'blue');
        products.forEach((product, index) => {
          log(`   ${index + 1}. ${product.name} (${product.code || 'N/A'})`, 'cyan');
        });
      }
    }
    
    // 測試查詢 Inventory 表
    log(`\n📊 測試查詢 Inventory 表...`, 'blue');
    const { data: inventory, error: inventoryError } = await supabase
      .from('Inventory')
      .select('*')
      .limit(5);
    
    if (inventoryError) {
      log(`⚠️  Inventory 表查詢失敗：${inventoryError.message}`, 'yellow');
    } else {
      log(`✅ Inventory 表查詢成功！`, 'green');
      log(`   找到 ${inventory.length} 條記錄`, 'cyan');
      
      if (inventory.length > 0) {
        log(`\n📦 示例庫存：`, 'blue');
        inventory.forEach((item, index) => {
          log(`   ${index + 1}. 產品 ID: ${item.productid}, 庫存: ${item.quantity}`, 'cyan');
        });
      }
    }
    
    log('\n' + '='.repeat(60), 'cyan');
    log('\n✅ 所有測試完成！連接正常！', 'green');
    return true;
  } catch (err) {
    log('\n❌ 發生錯誤：', 'red');
    log(`   ${err.message}`, 'red');
    if (err.stack) {
      log(`\n堆棧跟踪：`, 'yellow');
      log(err.stack, 'yellow');
    }
    return false;
  }
}

// 執行測試
testConnection()
  .then(success => {
    if (success) {
      log('\n🎉 Supabase 配置正確，可以正常使用！', 'green');
      process.exit(0);
    } else {
      log('\n❌ 連接測試失敗，請檢查配置', 'red');
      log('\n📖 參考文檔：', 'yellow');
      log('   docs/ENV_CONFIGURATION_CHECK.md', 'cyan');
      process.exit(1);
    }
  })
  .catch(error => {
    log(`\n❌ 測試失敗：${error.message}`, 'red');
    process.exit(1);
  });
