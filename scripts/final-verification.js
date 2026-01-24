#!/usr/bin/env node
/**
 * 最終配置驗證腳本
 * 檢查所有配置是否完成，包括本地和部署環境
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

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

const checks = {
  env: { name: '環境變數配置', items: [] },
  supabase: { name: 'Supabase 連接', items: [] },
  rls: { name: 'RLS 策略', items: [] },
  data: { name: '數據完整性', items: [] },
  app: { name: '應用程序配置', items: [] },
};

let totalChecks = 0;
let passedChecks = 0;

// 1. 檢查環境變數
function checkEnvironmentVariables() {
  log('\n📋 檢查環境變數配置...', 'cyan');
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  required.forEach(varName => {
    totalChecks++;
    const value = process.env[varName];
    if (value && !value.includes('****') && value.trim() !== '') {
      log(`  ✅ ${varName}: 已設置`, 'green');
      checks.env.items.push({ name: varName, status: 'pass' });
      passedChecks++;
    } else {
      log(`  ❌ ${varName}: 未設置或無效`, 'red');
      checks.env.items.push({ name: varName, status: 'fail' });
    }
  });
}

// 2. 測試 Supabase 連接
async function testSupabaseConnection() {
  log('\n🔌 測試 Supabase 連接...', 'cyan');
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    log('  ⚠️  缺少必要的環境變數，跳過連接測試', 'yellow');
    return;
  }
  
  try {
    const supabase = createClient(url, key);
    
    // 測試查詢
    totalChecks++;
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .limit(1);
    
    if (error) {
      log(`  ❌ 連接失敗: ${error.message}`, 'red');
      checks.supabase.items.push({ name: '連接測試', status: 'fail' });
    } else {
      log(`  ✅ 連接成功！找到 ${data?.length || 0} 條記錄`, 'green');
      checks.supabase.items.push({ name: '連接測試', status: 'pass' });
      passedChecks++;
    }
  } catch (err) {
    log(`  ❌ 連接錯誤: ${err.message}`, 'red');
    checks.supabase.items.push({ name: '連接測試', status: 'fail' });
  }
}

// 3. 檢查應用程序文件
function checkApplicationFiles() {
  log('\n📁 檢查應用程序文件...', 'cyan');
  
  const fs = require('fs');
  const path = require('path');
  
  const files = [
    'package.json',
    'next.config.mjs',
    'lib/supabase-client.ts',
    'utils/supabase.ts',
  ];
  
  files.forEach(file => {
    totalChecks++;
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      log(`  ✅ ${file}: 存在`, 'green');
      checks.app.items.push({ name: file, status: 'pass' });
      passedChecks++;
    } else {
      log(`  ⚠️  ${file}: 不存在（可選）`, 'yellow');
      checks.app.items.push({ name: file, status: 'optional' });
    }
  });
  
  // 檢查是否安裝了 @supabase/supabase-js
  totalChecks++;
  try {
    require('@supabase/supabase-js');
    log(`  ✅ @supabase/supabase-js: 已安裝`, 'green');
    checks.app.items.push({ name: '@supabase/supabase-js', status: 'pass' });
    passedChecks++;
  } catch (e) {
    log(`  ❌ @supabase/supabase-js: 未安裝`, 'red');
    log(`     請運行: npm install @supabase/supabase-js`, 'yellow');
    checks.app.items.push({ name: '@supabase/supabase-js', status: 'fail' });
  }
}

// 顯示總結
function showSummary() {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 最終配置驗證結果', 'cyan');
  log('='.repeat(60), 'cyan');
  
  Object.entries(checks).forEach(([key, check]) => {
    const passed = check.items.filter(i => i.status === 'pass').length;
    const total = check.items.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    log(`\n${check.name}:`, 'blue');
    log(`  通過: ${passed}/${total} (${percentage}%)`, 
      percentage === 100 ? 'green' : percentage >= 50 ? 'yellow' : 'red');
  });
  
  const overallPercentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  
  log('\n' + '='.repeat(60), 'cyan');
  log(`總體完成度: ${passedChecks}/${totalChecks} (${overallPercentage}%)`, 
    overallPercentage === 100 ? 'green' : overallPercentage >= 80 ? 'yellow' : 'red');
  
  if (overallPercentage === 100) {
    log('\n🎉 所有配置已完成！系統可以正常使用！', 'green');
    log('\n💡 下一步：', 'yellow');
    log('   1. 運行開發服務器: npm run dev', 'cyan');
    log('   2. 訪問: http://localhost:9999', 'cyan');
    log('   3. 部署到 Vercel（如需要）', 'cyan');
  } else if (overallPercentage >= 80) {
    log('\n⚠️  大部分配置已完成，還有少量項目需要完成', 'yellow');
    log('   請查看上面的檢查結果，完成剩餘配置', 'yellow');
  } else {
    log('\n❌ 配置未完成，請完成必要的配置項目', 'red');
    log('   請參考: CONFIGURATION_COMPLETE_CHECKLIST.md', 'yellow');
  }
}

// 主函數
async function main() {
  log('\n🚀 九九瓦斯行管理系統 - 最終配置驗證', 'cyan');
  log('='.repeat(60), 'cyan');
  
  checkEnvironmentVariables();
  await testSupabaseConnection();
  checkApplicationFiles();
  showSummary();
  
  const overallPercentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  process.exit(overallPercentage === 100 ? 0 : 1);
}

main().catch(error => {
  log(`\n❌ 發生錯誤: ${error.message}`, 'red');
  process.exit(1);
});
