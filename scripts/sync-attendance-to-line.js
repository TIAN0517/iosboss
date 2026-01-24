const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('==============================================');
  console.log('  補卡記錄 + 推播到 LINE 群組');
  console.log('==============================================');
  console.log('');

  // 1. 補齊彥榮的打卡記錄
  console.log('[1/2] 補齊打卡記錄...');
  const LINE_USER_ID = 'YuanRong';
  const EMPLOYEE_NAME = '彥榮';
  const dates = ['2026-01-16', '2026-01-17'];

  for (const date of dates) {
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        userId: LINE_USER_ID,
        date: date
      }
    });

    if (existing) {
      console.log(`  ${date}: 已有打卡記錄，跳過`);
    } else {
      await prisma.attendanceRecord.create({
        data: {
          userId: LINE_USER_ID,
          userName: EMPLOYEE_NAME,
          date: date,
          clockIn: '08:00',
          clockOut: '17:00',
          workHours: 9.0,
          note: '系統補卡'
        }
      });
      console.log(`  ✓ ${date}: 補卡成功 (08:00 - 17:00)`);
    }
  }

  console.log('');
  console.log('[2/2] 準備推播到「帝皇瓦斯行」LINE 群組...');
  console.log('');

  // 2. 獲取所有打卡記錄（包含今天和歷史）
  const allAttendance = await prisma.attendanceRecord.findMany({
    orderBy: {
      date: 'desc'
    }
  });

  // 3. 按員工分組
  const attendanceByUser = {};
  for (const record of allAttendance) {
    if (!attendanceByUser[record.userName]) {
      attendanceByUser[record.userName] = [];
    }
    attendanceByUser[record.userName].push(record);
  }

  // 4. 生成推播訊息
  let message = '📊 帝皇瓦斯行 - 打卡記錄報告\n';
  message += '═══════════════════════════\n\n';
  message += `更新時間: ${new Date().toLocaleString('zh-TW')}\n`;
  message += `總記錄數: ${allAttendance.length} 筆\n\n`;

  for (const [userName, records] of Object.entries(attendanceByUser)) {
    message += `👤 ${userName}\n`;
    for (const record of records.slice(0, 5)) { // 顯示最近5筆
      const status = record.note === '系統補卡' ? ' [補卡]' : '';
      message += `  ${record.date}: ${record.clockIn} - ${record.clockOut} (${record.workHours}小時)${status}\n`;
    }
    if (records.length > 5) {
      message += `  ... 還有 ${records.length - 5} 筆記錄\n`;
    }
    message += '\n';
  }

  message += '═══════════════════════════\n';
  message += '✅ 記錄已同步至數據庫';

  console.log('推播訊息內容:');
  console.log('─'.repeat(50));
  console.log(message);
  console.log('─'.repeat(50));
  console.log('');

  // 5. 尋找「帝皇瓦斯行」LINE 群組
  const lineGroup = await prisma.lineGroup.findFirst({
    where: {
      groupName: {
        contains: '帝皇'
      }
    }
  });

  if (!lineGroup) {
    console.log('⚠️  未找到「帝皇瓦斯行」LINE 群組');
    console.log('');
    console.log('💡 需要先設定 LINE 群組：');
    console.log('   1. 將 LINE Bot 加入「帝皇瓦斯行」群組');
    console.log('   2. 發送訊息觸發 webhook');
    console.log('   3. 系統會自動記錄群組資訊');
  } else {
    console.log(`✓ 找到 LINE 群組: ${lineGroup.groupName}`);
    console.log('');
    console.log('📤 準備推播訊息...');

    // 這裡需要實際的 LINE Messaging API 調用
    // 由於需要 LINE_CHANNEL_ACCESS_TOKEN，暫時顯示訊息內容

    console.log('');
    console.log('⚠️  需要配置 LINE Messaging API 才能實際推播');
    console.log('   訊息已準備好，可以使用 LINE Bot SDK 發送');
  }

  console.log('');
  console.log('✓ 打卡記錄已補齊！');
  console.log('');
  console.log('📋 統計資訊:');
  console.log(`   - 總打卡記錄: ${allAttendance.length} 筆`);
  console.log(`   - 員工人數: ${Object.keys(attendanceByUser).length} 人`);
  console.log(`   - 最新補卡: ${dates.join(', ')}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('✗ 執行失敗:', err);
  process.exit(1);
});
