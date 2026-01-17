const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');

const prisma = new PrismaClient();

async function pushToLINE() {
  console.log('==============================================');
  console.log('  推播打卡記錄到 LINE 群組');
  console.log('==============================================');
  console.log('');

  // 讀取 .env 獲取 LINE Token
  const envContent = fs.readFileSync('.env', 'utf8');
  const lines = envContent.split('\n');
  const LINE_TOKEN = lines.find(l => l.startsWith('LINE_CHANNEL_ACCESS_TOKEN=')).split('=')[1].trim();
  const GROUP_ID = 'C986ae8b3208735b53872a6d609a7bbe7'; // 管理員群組

  console.log('📊 獲取打卡記錄...');

  const allAttendance = await prisma.attendanceRecord.findMany({
    orderBy: { date: 'desc' }
  });

  // 按員工分組
  const attendanceByUser = {};
  for (const record of allAttendance) {
    if (!attendanceByUser[record.userName]) {
      attendanceByUser[record.userName] = [];
    }
    attendanceByUser[record.userName].push(record);
  }

  // 生成推播訊息
  let message = '📊 帝皇瓦斯行 - 打卡記錄報告\n';
  message += '═══════════════════════════\n\n';
  message += `更新時間: ${new Date().toLocaleString('zh-TW')}\n`;
  message += `總記錄數: ${allAttendance.length} 筆\n\n`;

  for (const [userName, records] of Object.entries(attendanceByUser)) {
    message += `👤 ${userName}\n`;
    for (const record of records.slice(0, 5)) {
      const clockOut = record.clockOut || '未下班';
      const hours = record.workHours || 0;
      const status = record.note === '系統補卡' ? ' [補卡]' : '';
      message += `  ${record.date}: ${record.clockIn} - ${clockOut} (${hours}小時)${status}\n`;
    }
    if (records.length > 5) {
      message += `  ... 還有 ${records.length - 5} 筆記錄\n`;
    }
    message += '\n';
  }

  message += '═══════════════════════════\n';
  message += '✅ 記錄已同步至數據庫';

  console.log('');
  console.log('📤 推播訊息內容:');
  console.log('─'.repeat(50));
  console.log(message);
  console.log('─'.repeat(50));
  console.log('');

  console.log(`📤 發送推播訊息到 LINE 群組 ${GROUP_ID}...`);

  try {
    const response = await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: GROUP_ID,
        messages: [{ type: 'text', text: message }]
      },
      {
        headers: {
          'Authorization': `Bearer ${LINE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      console.log('');
      console.log('✓ 推播成功！');
      console.log('');
      console.log('📊 發送統計:');
      console.log(`   - 群組 ID: ${GROUP_ID}`);
      console.log(`   - 訊息長度: ${message.length} 字元`);
      console.log(`   - 打卡記錄: ${allAttendance.length} 筆`);
      console.log(`   - 員工人數: ${Object.keys(attendanceByUser).length} 人`);
    }
  } catch (error) {
    console.error('');
    console.error('✗ 推播失敗:', error.response?.data || error.message);
    console.log('');
    console.log('💡 可能的原因:');
    console.log('   1. LINE_CHANNEL_ACCESS_TOKEN 無效');
    console.log('   2. 群組 ID 不正確');
    console.log('   3. LINE Bot 未加入該群組');
  }

  await prisma.$disconnect();
}

pushToLINE().catch(err => {
  console.error('✗ 執行失敗:', err);
  process.exit(1);
});
