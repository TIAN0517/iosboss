#!/usr/bin/env node
/**
 * 環境變數配置驗證腳本
 * 用於檢查 .env 文件中的 Supabase 配置是否正確
 * 
 * 使用方法：
 *   node scripts/verify-env.js
 * 
 * 注意：此腳本會自動讀取項目根目錄的 .env 文件，無需手動輸入
 */

require('dotenv').config();

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

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const optionalVars = [
  'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
];

log('\n🔍 檢查環境變數配置...\n', 'cyan');
log('='.repeat(60), 'cyan');

// 檢查必需的變數
let hasErrors = false;
log('\n📋 必需變數：', 'blue');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    log(`❌ ${varName}: 未設置`, 'red');
    hasErrors = true;
  } else if (value.includes('****') || value.includes('your_') || value.trim() === '') {
    log(`❌ ${varName}: 值為占位符或空值`, 'red');
    log(`   當前值: ${value.substring(0, 50)}...`, 'yellow');
    hasErrors = true;
  } else {
    log(`✅ ${varName}: 已設置 (長度: ${value.length} 字符)`, 'green');
    // 顯示前 30 個字符作為預覽
    log(`   預覽: ${value.substring(0, 30)}...`, 'cyan');
  }
});

// 檢查可選變數
log('\n📋 可選變數：', 'blue');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value && !value.includes('****') && value.trim() !== '') {
    log(`✅ ${varName}: 已設置 (長度: ${value.length} 字符)`, 'green');
    log(`   預覽: ${value.substring(0, 30)}...`, 'cyan');
  } else {
    log(`⚠️  ${varName}: 未設置（可選）`, 'yellow');
  }
});

// 驗證 URL 格式
log('\n🔗 URL 格式驗證：', 'blue');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'https:') {
      log(`✅ URL 格式正確`, 'green');
      log(`   ${url}`, 'cyan');
    } else {
      log(`⚠️  URL 協議不是 https`, 'yellow');
      log(`   建議使用: https://${urlObj.host}${urlObj.pathname}`, 'yellow');
    }
  } catch (e) {
    log(`❌ URL 格式錯誤: ${url}`, 'red');
    log(`   錯誤: ${e.message}`, 'red');
    hasErrors = true;
  }
} else {
  log(`❌ NEXT_PUBLIC_SUPABASE_URL 未設置`, 'red');
  hasErrors = true;
}

// 驗證 Anon Key 格式
log('\n🔑 Anon Key 格式驗證：', 'blue');
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (anonKey) {
  if (anonKey.startsWith('eyJ') && anonKey.split('.').length === 3) {
    log(`✅ Anon Key 格式正確 (JWT 格式)`, 'green');
    log(`   前綴: ${anonKey.substring(0, 20)}...`, 'cyan');
  } else if (anonKey.startsWith('sb_publishable_')) {
    log(`✅ Anon Key 格式正確 (Publishable Key 格式)`, 'green');
    log(`   前綴: ${anonKey.substring(0, 20)}...`, 'cyan');
  } else {
    log(`❌ Anon Key 格式不正確`, 'red');
    log(`   預期格式: JWT (eyJ...) 或 Publishable Key (sb_publishable_...)`, 'yellow');
    log(`   當前值: ${anonKey.substring(0, 30)}...`, 'yellow');
    hasErrors = true;
  }
} else {
  log(`❌ NEXT_PUBLIC_SUPABASE_ANON_KEY 未設置`, 'red');
  hasErrors = true;
}

// 驗證 Service Role Key 格式
log('\n🔐 Service Role Key 格式驗證：', 'blue');
const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  if (serviceKey.startsWith('sb_secret_')) {
    log(`✅ Service Role Key 格式正確 (新格式)`, 'green');
    log(`   前綴: ${serviceKey.substring(0, 20)}...`, 'cyan');
  } else if (serviceKey.startsWith('eyJ') && serviceKey.split('.').length === 3) {
    log(`✅ Service Role Key 格式正確 (舊格式 JWT)`, 'green');
    log(`   前綴: ${serviceKey.substring(0, 20)}...`, 'cyan');
  } else {
    log(`❌ Service Role Key 格式不正確`, 'red');
    log(`   預期格式: Secret Key (sb_secret_...) 或 JWT (eyJ...)`, 'yellow');
    log(`   當前值: ${serviceKey.substring(0, 30)}...`, 'yellow');
    hasErrors = true;
  }
} else {
  log(`⚠️  NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY 未設置（可選，但建議設置）`, 'yellow');
}

// 檢查 .env 文件是否存在
log('\n📄 文件檢查：', 'blue');
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  log(`✅ .env 文件存在: ${envPath}`, 'green');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  log(`   文件行數: ${lines.length}`, 'cyan');
  
  // 檢查是否包含 Supabase 配置
  const hasSupabaseConfig = envContent.includes('SUPABASE');
  if (hasSupabaseConfig) {
    log(`   ✅ 包含 Supabase 配置`, 'green');
  } else {
    log(`   ⚠️  未找到 Supabase 配置`, 'yellow');
  }
} else {
  log(`⚠️  .env 文件不存在: ${envPath}`, 'yellow');
  log(`   請創建 .env 文件並添加配置`, 'yellow');
}

// 總結
log('\n' + '='.repeat(60), 'cyan');
if (hasErrors) {
  log('\n❌ 配置檢查失敗，請修復上述錯誤', 'red');
  log('\n💡 修復建議：', 'yellow');
  log('   1. 檢查 .env 文件中的變數名稱是否正確', 'cyan');
  log('   2. 確認所有值都已設置（不是占位符）', 'cyan');
  log('   3. 確認 URL 格式正確（以 https:// 開頭）', 'cyan');
  log('   4. 確認 Key 格式正確（JWT 或 Publishable/Secret Key）', 'cyan');
  log('\n📖 參考文檔：', 'yellow');
  log('   COMPLETE_SETUP_SUMMARY.md', 'cyan');
  process.exit(1);
} else {
  log('\n✅ 所有配置檢查通過！', 'green');
  log('\n💡 下一步：', 'yellow');
  log('   1. 測試連接: node scripts/test-supabase-connection.js', 'cyan');
  log('   2. 查看完整配置指南: COMPLETE_SETUP_SUMMARY.md', 'cyan');
  process.exit(0);
}
