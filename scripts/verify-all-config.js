#!/usr/bin/env node
/**
 * 完整配置驗證腳本
 * 驗證所有 Supabase 配置是否正確
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

log('\n🚀 九九瓦斯行管理系統 - 完整配置驗證', 'cyan');
log('='.repeat(60), 'cyan');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

// 檢查配置
const configs = {
  url: {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    value: process.env.NEXT_PUBLIC_SUPABASE_URL,
    required: true,
    expected: 'https://mdmltksbpdyndoisnqhy.supabase.co',
  },
  publishableKey: {
    name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    required: true,
    expected: 'sb_publishable_EviKlKgPnLtGeaDs8SVysQ_bzavSNr9',
  },
  anonKey: {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    required: false,
    expected: 'eyJ... (JWT format)',
  },
  serviceRoleKey: {
    name: 'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
    value: process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    required: true,
    expected: 'sb_secret_...',
  },
  jwtSecret: {
    name: 'SUPABASE_JWT_SECRET',
    value: process.env.SUPABASE_JWT_SECRET,
    required: false,
    expected: 'JFOZVsXpgi6kShGdzmrrNP80yNKUuA9YTCIjsK+gY5ZZcYItaQt9asmRJxXbjhyuK+CMZn7bAEnaJYBT92orEQ==',
  },
};

log('\n📋 環境變數檢查：', 'blue');

Object.entries(configs).forEach(([key, config]) => {
  totalChecks++;
  const { name, value, required, expected } = config;
  
  if (!value) {
    if (required) {
      log(`  ❌ ${name}: 未設置（必需）`, 'red');
      failedChecks++;
    } else {
      log(`  ⚠️  ${name}: 未設置（可選）`, 'yellow');
      passedChecks++;
    }
  } else if (value.includes('****') || value.includes('your_') || value.trim() === '') {
    log(`  ❌ ${name}: 值為占位符或空值`, 'red');
    failedChecks++;
  } else {
    // 檢查是否匹配預期值
    if (expected && value === expected) {
      log(`  ✅ ${name}: 已設置且匹配預期值`, 'green');
    } else {
      log(`  ✅ ${name}: 已設置`, 'green');
    }
    log(`     長度: ${value.length} 字符`, 'cyan');
    log(`     預覽: ${value.substring(0, 30)}...`, 'cyan');
    passedChecks++;
  }
});

// 驗證 URL 格式
log('\n🔗 URL 格式驗證：', 'blue');
totalChecks++;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'https:' && urlObj.hostname.includes('supabase.co')) {
      log(`  ✅ URL 格式正確`, 'green');
      log(`     ${url}`, 'cyan');
      passedChecks++;
    } else {
      log(`  ⚠️  URL 格式可能不正確`, 'yellow');
      failedChecks++;
    }
  } catch (e) {
    log(`  ❌ URL 格式錯誤: ${e.message}`, 'red');
    failedChecks++;
  }
} else {
  log(`  ❌ URL 未設置`, 'red');
  failedChecks++;
}

// 驗證 Publishable Key 格式
log('\n🔑 Publishable Key 格式驗證：', 'blue');
totalChecks++;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (publishableKey) {
  if (publishableKey.startsWith('sb_publishable_')) {
    log(`  ✅ Publishable Key 格式正確`, 'green');
    log(`     前綴: ${publishableKey.substring(0, 20)}...`, 'cyan');
    passedChecks++;
  } else {
    log(`  ❌ Publishable Key 格式不正確`, 'red');
    log(`     預期格式: sb_publishable_...`, 'yellow');
    failedChecks++;
  }
} else {
  log(`  ❌ Publishable Key 未設置`, 'red');
  failedChecks++;
}

// 驗證 Service Role Key 格式
log('\n🔐 Service Role Key 格式驗證：', 'blue');
totalChecks++;
const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  if (serviceKey.startsWith('sb_secret_')) {
    log(`  ✅ Service Role Key 格式正確`, 'green');
    log(`     前綴: ${serviceKey.substring(0, 20)}...`, 'cyan');
    passedChecks++;
  } else if (serviceKey.startsWith('eyJ')) {
    log(`  ⚠️  Service Role Key 使用舊格式 (JWT)`, 'yellow');
    log(`     建議使用新格式: sb_secret_...`, 'yellow');
    passedChecks++;
  } else {
    log(`  ❌ Service Role Key 格式不正確`, 'red');
    failedChecks++;
  }
} else {
  log(`  ❌ Service Role Key 未設置`, 'red');
  failedChecks++;
}

// 檢查 GLM API Key（可選）
log('\n🤖 GLM AI 配置檢查：', 'blue');
totalChecks++;
const glmApiKey = process.env.GLM_API_KEY || process.env.GLM_API_KEYS;
if (glmApiKey) {
  log(`  ✅ GLM API Key: 已設置`, 'green');
  log(`     長度: ${glmApiKey.length} 字符`, 'cyan');
  log(`     預覽: ${glmApiKey.substring(0, 20)}...`, 'cyan');
  passedChecks++;
} else {
  log(`  ⚠️  GLM API Key: 未設置（可選，用於 AI 功能）`, 'yellow');
  passedChecks++;
}

// 顯示總結
log('\n' + '='.repeat(60), 'cyan');
log('📊 驗證結果摘要', 'cyan');
log('='.repeat(60), 'cyan');
log(`\n總檢查項: ${totalChecks}`, 'blue');
log(`通過: ${passedChecks}`, 'green');
if (failedChecks > 0) {
  log(`失敗: ${failedChecks}`, 'red');
}
const percentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
log(`通過率: ${percentage}%`, percentage === 100 ? 'green' : 'yellow');

if (failedChecks === 0) {
  log('\n🎉 所有配置檢查通過！', 'green');
  log('\n💡 下一步：', 'yellow');
  log('   1. 測試連接: node scripts/test-supabase-connection.js', 'cyan');
  log('   2. 查看配置指南: docs/SUPABASE_API_KEYS_UPDATE.md', 'cyan');
  process.exit(0);
} else {
  log('\n❌ 部分配置需要修復', 'red');
  log('\n💡 修復建議：', 'yellow');
  log('   1. 檢查 .env 文件中的變數名稱是否正確', 'cyan');
  log('   2. 確認所有必需的值都已設置', 'cyan');
  log('   3. 確認格式正確（URL、Key 格式等）', 'cyan');
  log('\n📖 參考文檔：', 'yellow');
  log('   docs/SUPABASE_API_KEYS_UPDATE.md', 'cyan');
  process.exit(1);
}
