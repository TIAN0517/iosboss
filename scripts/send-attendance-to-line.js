const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

async function sendToLINE() {
  console.log('==============================================');
  console.log('  發送打卡記錄到 LINE 群組');
  console.log('==============================================');
  console.log('');

  // 從環境變量讀取 LINE Token
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!LINE_TOKEN) {
    console.error('✗ 未找到 LINE_CHANNEL_ACCESS_TOKEN');
    console.log('');
    console.log('💡 請設定環境變數:');
    console.log('   set LINE_CHANNEL_ACCESS_TOKEN=你的Token');
    return;
  }

  // 1. 獲取所有打卡記錄
  const allAttendance = await prisma.attendanceRecord.findMany({
    orderBy: {
      date: 'desc'
    }
  });

  // 2. 按員工分組
  const attendanceByUser = {};
  for (const record of allAttendance) {
    if (!attendanceByUser[record.userName]) {
      attendanceByUser[record.userName] = [];
    }
    attendanceByUser[record.userName].push(record);
  }

  // 3. 生成推播訊息
  let message = '📊 帝皇瓦斯行 - 打卡記錄報告\n';
  message += '═══════════════════════════\n\n';
  message += `更新時間: ${new Date().toLocaleString('zh-TW')}\n`;
  message += `總記錄數: ${allAttendance.length} 筆\n\n`;

  for (const [userName, records] of Object.entries(attendanceByUser)) {
    message += `👤 ${userName}\n`;
    // 顯示最近5筆記錄
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

  console.log('📤 推播訊息內容:');
  console.log('─'.repeat(50));
  console.log(message);
  console.log('─'.repeat(50));
  console.log('');

  // 4. 尋找「帝皇瓦斯行」LINE 群組
  let lineGroup = await prisma.lineGroup.findFirst({
    where: {
      OR: [
        { groupName: { contains: '帝皇' } },
        { groupName: { contains: '瓦斯' } }
      ]
    }
  });

  // 如果找不到，創建一個默認群組記錄
  if (!lineGroup) {
    console.log('⚠️  數據庫中未找到「帝皇瓦斯行」群組');
    console.log('');

    // 使用固定的 ADMIN_GROUP_ID
    const GROUP_ID = 'C986ae8b3208735b53872a6d609a7bbe7'; // LINE_ADMIN_GROUP_ID

    console.log('');
    console.log('📝 選項:');
    console.log('   [1] 使用環境變數 LINE_GROUP_ID');
    console.log('   [2] 手動輸入群組 ID');
    console.log('   [3] 只顯示訊息，不發送');
    console.log('');

    // 這裡我們自動使用環境變量（如果有）
    if (process.env.LINE_GROUP_ID && process.env.LINE_GROUP_ID !== '請輸入您的LINE群組ID') {
      console.log(`✓ 使用環境變數中的群組 ID: ${process.env.LINE_GROUP_ID}`);

      // 創建群組記錄
      lineGroup = await prisma.lineGroup.create({
        data: {
          id: process.env.LINE_GROUP_ID,
          groupName: '帝皇瓦斯行',
          groupId: process.env.LINE_GROUP_ID,
          isActive: true
        }
      });
      console.log('✓ 已將群組資訊保存到數據庫');
    } else {
      console.log('⚠️  未設置 LINE_GROUP_ID 環境變量');
      console.log('');
      console.log('💡 如何獲取 LINE 群組 ID:');
      console.log('   1. 將 LINE Bot 加入群組');
      console.log('   2. 發送訊息到群組');
      console.log('   3. 查看 webhook 日誌找到群組 ID');
      console.log('   4. 設定環境變數: set LINE_GROUP_ID=群組ID');
      console.log('');
      console.log('📋 訊息已準備完成（上方內容）');
      console.log('   可複製後手動發送到 LINE');
      await prisma.$disconnect();
      return;
    }
  } else {
    console.log(`✓ 找到 LINE 群組: ${lineGroup.groupName} (${lineGroup.id})`);
  }

  console.log('');
  console.log('📤 發送推播訊息...');

  try {
    // 使用 LINE Messaging API 發送訊息
    const response = await axios.post(
      `https://api.line.me/v2/bot/message/push`,
      {
        to: lineGroup.id,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${LINE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.status === 200) {
      console.log('✓ 推播成功！');
      console.log('');
      console.log('📊 發送統計:');
      console.log(`   - 群組: ${lineGroup.groupName}`);
      console.log(`   - 訊息長度: ${message.length} 字元`);
      console.log(`   - 打卡記錄: ${allAttendance.length} 筆`);
      console.log(`   - 員工人數: ${Object.keys(attendanceByUser).length} 人`);
    }
  } catch (error) {
    console.error('✗ 推播失敗:', error.response?.data || error.message);
    console.log('');
    console.log('💡 可能的原因:');
    console.log('   1. LINE_CHANNEL_ACCESS_TOKEN 無效');
    console.log('   2. 群組 ID 不正確');
    console.log('   3. LINE Bot 未加入該群組');
  }

  await prisma.$disconnect();
}

sendToLINE().catch(err => {
  console.error('✗ 執行失敗:', err);
  process.exit(1);
});
