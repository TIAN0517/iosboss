#!/usr/bin/env node
/**
 * JWT Secret 配置驗證腳本
 * 用於檢查 JWT Secret 是否正確配置
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

log('\n🔐 檢查 JWT Secret 配置...\n', 'cyan');
log('='.repeat(60), 'cyan');

// 檢查 JWT Secret
const jwtSecret = process.env.SUPABASE_JWT_SECRET || 
                  process.env.NEXT_PUBLIC_SUPABASE_JWT_SECRET;

if (!jwtSecret) {
  log('\n❌ JWT Secret 未設置', 'red');
  log('\n💡 請在 .env 文件中添加：', 'yellow');
  log('   SUPABASE_JWT_SECRET=JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==', 'cyan');
  process.exit(1);
}

log('\n✅ JWT Secret 已配置', 'green');
log(`   長度: ${jwtSecret.length} 字符`, 'cyan');
log(`   前綴: ${jwtSecret.substring(0, 20)}...`, 'cyan');

// 驗證格式（Base64）
const base64Regex = /^[A-Za-z0-9+/=]+$/
if (base64Regex.test(jwtSecret)) {
  log('   ✅ 格式正確 (Base64)', 'green');
} else {
  log('   ⚠️  格式可能不正確', 'yellow');
}

// 檢查是否為您提供的值
const expectedSecret = 'JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==';
if (jwtSecret === expectedSecret) {
  log('   ✅ 與提供的 JWT Secret 匹配', 'green');
} else {
  log('   ⚠️  與提供的 JWT Secret 不匹配', 'yellow');
  log('   請確認是否使用了正確的值', 'yellow');
}

log('\n' + '='.repeat(60), 'cyan');
log('\n✅ JWT Secret 配置檢查完成！', 'green');
log('\n💡 下一步：', 'yellow');
log('   1. 在應用程序中配置 JWT Secret', 'cyan');
log('   2. 測試 JWT 簽署和驗證功能', 'cyan');
log('   3. 查看配置指南: docs/JWT_SECRET_CONFIGURATION.md', 'cyan');

process.exit(0);
