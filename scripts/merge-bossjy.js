const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mergeBossJy() {
  console.log('==============================================');
  console.log('  合併 BossJy 和 bossjy 記錄');
  console.log('==============================================');
  console.log('');

  // 1. 查找兩個用戶的記錄
  const bossjyRecords = await prisma.attendanceRecord.findMany({
    where: { userName: 'bossjy' }
  });

  const BossJyRecords = await prisma.attendanceRecord.findMany({
    where: { userName: 'BossJy' }
  });

  console.log(`📊 找到記錄:`);
  console.log(`   - bossjy: ${bossjyRecords.length} 筆`);
  console.log(`   - BossJy: ${BossJyRecords.length} 筆`);
  console.log('');

  // 2. 將所有 BossJy 的記錄改成 bossjy
  if (BossJyRecords.length > 0) {
    console.log(`🔧 合併 ${BossJyRecords.length} 筆 BossJy 記錄到 bossjy...`);

    for (const record of BossJyRecords) {
      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: { userName: 'bossjy' }
      });
      console.log(`  ✓ ${record.date}: BossJy → bossjy`);
    }

    console.log('');
    console.log('✓ 合併完成！');
  } else {
    console.log('✓ 沒有需要合併的記錄');
  }

  console.log('');

  // 3. 顯示合併後的統計
  const mergedRecords = await prisma.attendanceRecord.findMany({
    where: { userName: 'bossjy' },
    orderBy: { date: 'desc' }
  });

  console.log('📊 合併後的 bossjy 打卡記錄:');
  console.log('─'.repeat(60));
  let totalHours = 0;
  for (const record of mergedRecords) {
    console.log(`  ${record.date}: ${record.clockIn} - ${record.clockOut} (${record.workHours}小時)`);
    totalHours += record.workHours || 0;
  }
  console.log('─'.repeat(60));
  console.log(`總計: ${mergedRecords.length} 筆記錄 | 總工時: ${totalHours.toFixed(1)} 小時`);

  // 4. 顯示所有員工統計
  console.log('');
  console.log('👥 所有員工打卡統計:');
  const allRecords = await prisma.attendanceRecord.findMany();
  const byUser = {};
  for (const record of allRecords) {
    if (!byUser[record.userName]) {
      byUser[record.userName] = { total: 0, hours: 0 };
    }
    byUser[record.userName].total++;
    byUser[record.userName].hours += record.workHours || 0;
  }

  for (const [name, stats] of Object.entries(byUser)) {
    console.log(`   ${name}: ${stats.total} 筆 | ${stats.hours.toFixed(1)} 小時`);
  }

  await prisma.$disconnect();
}

mergeBossJy().catch(err => {
  console.error('✗ 執行失敗:', err);
  process.exit(1);
});
