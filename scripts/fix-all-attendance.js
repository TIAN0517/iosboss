const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllAttendance() {
  console.log('==============================================');
  console.log('  補齊所有打卡記錄');
  console.log('==============================================');
  console.log('');

  // 1. 獲取所有打卡記錄
  const allAttendance = await prisma.attendanceRecord.findMany({
    orderBy: { date: 'desc' }
  });

  console.log(`📊 總共找到 ${allAttendance.length} 筆打卡記錄`);
  console.log('');

  // 2. 找出需要修復的記錄
  const needFix = allAttendance.filter(r =>
    !r.clockIn || !r.clockOut || !r.workHours || r.workHours === 0
  );

  console.log(`🔧 需要修復的記錄: ${needFix.length} 筆`);
  console.log('');

  if (needFix.length === 0) {
    console.log('✓ 所有記錄都完整，無需修復');
    await prisma.$disconnect();
    return;
  }

  // 3. 顯示需要修復的記錄
  console.log('需要修復的記錄:');
  console.log('─'.repeat(80));
  for (const record of needFix) {
    const issues = [];
    if (!record.clockIn) issues.push('缺上班');
    if (!record.clockOut) issues.push('缺下班');
    if (!record.workHours || record.workHours === 0) issues.push('缺工時');
    console.log(`  ${record.date} | ${record.userName} | ${issues.join(', ')}`);
  }
  console.log('─'.repeat(80));
  console.log('');

  // 4. 修復記錄
  console.log('🔧 開始修復記錄...');
  console.log('');

  let fixedCount = 0;

  for (const record of needFix) {
    let clockIn = record.clockIn;
    let clockOut = record.clockOut;
    let workHours = record.workHours;

    // 默認時間
    const DEFAULT_CLOCK_IN = '08:00';
    const DEFAULT_CLOCK_OUT = '17:00';
    const DEFAULT_HOURS = 9.0;

    // 如果缺上班時間，使用默認
    if (!clockIn) {
      clockIn = DEFAULT_CLOCK_IN;
    }

    // 如果缺下班時間，使用默認
    if (!clockOut) {
      clockOut = DEFAULT_CLOCK_OUT;
    }

    // 如果缺工時，計算工時
    if (!workHours || workHours === 0) {
      // 計算工時
      const [inHour, inMin] = clockIn.split(':').map(Number);
      const [outHour, outMin] = clockOut.split(':').map(Number);
      const inMinutes = inHour * 60 + inMin;
      const outMinutes = outHour * 60 + outMin;
      workHours = Math.round((outMinutes - inMinutes) / 60 * 100) / 100;
      // 包含休息時間（1小時）
      if (workHours > 0) {
        workHours = Math.round((workHours - 1) * 100) / 100;
      }
      if (workHours <= 0) {
        workHours = DEFAULT_HOURS;
      }
    }

    // 更新記錄
    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockIn: clockIn,
        clockOut: clockOut,
        workHours: workHours,
        note: record.note ? `${record.note} (已修復)` : '系統修復'
      }
    });

    console.log(`  ✓ ${record.date} | ${record.userName}`);
    console.log(`    修復: ${clockIn} - ${clockOut} (${workHours}小時)`);
    fixedCount++;
  }

  console.log('');
  console.log('─'.repeat(80));
  console.log('');
  console.log(`✓ 成功修復 ${fixedCount} 筆記錄！`);
  console.log('');

  // 5. 顯示修復後的統計
  const afterFix = await prisma.attendanceRecord.findMany();
  const stillNeedFix = afterFix.filter(r =>
    !r.clockIn || !r.clockOut || !r.workHours || r.workHours === 0
  );

  console.log('📊 修復後統計:');
  console.log(`   - 總記錄數: ${afterFix.length} 筆`);
  console.log(`   - 已修復: ${fixedCount} 筆`);
  console.log(`   - 完整記錄: ${afterFix.length - stillNeedFix.length} 筆`);
  console.log(`   - 仍需修復: ${stillNeedFix.length} 筆`);

  // 6. 按員工統計
  console.log('');
  console.log('👥 員工打卡統計:');
  const byUser = {};
  for (const record of afterFix) {
    if (!byUser[record.userName]) {
      byUser[record.userName] = { total: 0, complete: 0, hours: 0 };
    }
    byUser[record.userName].total++;
    if (record.clockIn && record.clockOut && record.workHours > 0) {
      byUser[record.userName].complete++;
      byUser[record.userName].hours += record.workHours || 0;
    }
  }

  for (const [name, stats] of Object.entries(byUser)) {
    const percent = Math.round(stats.complete / stats.total * 100);
    console.log(`   ${name}: ${stats.complete}/${stats.total} 筆完整 (${percent}%) | 總工時 ${stats.hours.toFixed(1)} 小時`);
  }

  await prisma.$disconnect();
}

fixAllAttendance().catch(err => {
  console.error('✗ 執行失敗:', err);
  process.exit(1);
});
