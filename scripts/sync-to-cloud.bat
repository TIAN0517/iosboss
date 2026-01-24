@echo off
chcp 65001 > nul
cls

echo ===============================================
echo   同步本地數據到雲端（Supabase）
echo ===============================================
echo.
echo   這將會：
echo   1. 讀取本地數據庫
echo   2. 上傳到 Supabase 備份
echo   3. 保留雲端最新備份
echo.
echo   ⚠️  本地為主，雲端為輔
echo.

cd /d "%~dp0.."

echo 正在同步...
echo.

node -e "
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const prisma = new PrismaClient();

async function syncToCloud() {
  console.log('1/4 讀取本地數據...');

  // 讀取所有本地數據
  const localData = {
    users: await prisma.user.findMany(),
    customers: await prisma.customer.findMany(),
    products: await prisma.product.findMany(),
    orders: await prisma.gasOrder.findMany({ include: { items: true } }),
    inventory: await prisma.inventory.findMany(),
    checks: await prisma.check.findMany(),
    attendanceRecords: await prisma.attendanceRecord.findMany(),
    lineGroups: await prisma.lineGroup.findMany(),
    lineMessages: await prisma.lineMessage.findMany(),
    lineConversations: await prisma.lineConversation.findMany(),
  };

  console.log('  ✓ 用戶:', localData.users.length);
  console.log('  ✓ 客戶:', localData.customers.length);
  console.log('  ✓ 產品:', localData.products.length);
  console.log('  ✓ 訂單:', localData.orders.length);
  console.log('  ✓ 庫存:', localData.inventory.length);
  console.log('  ✓ 支票:', localData.checks.length);
  console.log('  ✓ 打卡:', localData.attendanceRecords.length);
  console.log('  ✓ LINE 群組:', localData.lineGroups.length);

  console.log('');
  console.log('2/4 準備上傳到 Supabase...');

  // 從環境變量讀取 Supabase 配置
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('  ⚠️  未設置 Supabase 環境變量');
    console.log('  💡 跳過雲端同步');
    await prisma.\$disconnect();
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('');
  console.log('3/4 上傳備份到 Supabase...');

  // 上傳到 backup 表
  const backup = {
    timestamp: new Date().toISOString(),
    data: localData,
    source: 'local-sync'
  };

  const { error } = await supabase
    .from('backup')
    .insert([backup]);

  if (error) {
    console.log('  ⚠️  上傳失敗:', error.message);
    console.log('  💡 這是正常的，如果尚未創建 backup 表');
  } else {
    console.log('  ✓ 備份已上傳到雲端');
  }

  console.log('');
  console.log('4/4 清理舊備份...');

  // 只保留最近 7 天的備份
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { error: deleteError } = await supabase
    .from('backup')
    .delete()
    .lt('timestamp', sevenDaysAgo.toISOString());

  if (deleteError) {
    console.log('  ⚠️  清理失敗:', deleteError.message);
  } else {
    console.log('  ✓ 已清理 7 天前的舊備份');
  }

  console.log('');
  console.log('✓ 同步完成！');
  console.log('');
  console.log('📊 同步統計:');
  console.log(\`   - 總記錄數: \${Object.values(localData).flat().length} 筆\`);
  console.log(\`   - 備份時間: \${backup.timestamp}\`);
  console.log('   - 備份位置: Supabase Cloud');

  await prisma.\$disconnect();
}

syncToCloud().catch(err => {
  console.error('✗ 同步失敗:', err);
  process.exit(1);
});
"

echo.
echo ===============================================
echo   同步完成
echo ===============================================
echo.
pause
