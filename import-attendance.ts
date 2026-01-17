import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function importAttendance() {
  try {
    // 讀取本地打卡記錄
    const localData = JSON.parse(
      fs.readFileSync('line_bot_ai/data/attendance_records.json', 'utf-8')
    );

    console.log('=== 導入打卡記錄到數據庫 ===');
    console.log(`本地記錄: ${localData.length} 筆`);

    // 統計本地記錄
    const byPerson = {};
    localData.forEach(r => {
      if (!byPerson[r.user_name]) byPerson[r.user_name] = 0;
      byPerson[r.user_name]++;
    });

    console.log('\n本地記錄統計:');
    Object.keys(byPerson).forEach(name => {
      console.log(`- ${name}: ${byPerson[name]} 筆`);
    });

    // 檢查數據庫現有記錄
    const existingRecords = await prisma.attendanceRecord.findMany();
    console.log(`\n數據庫現有記錄: ${existingRecords.length} 筆`);

    // 導入記錄
    let imported = 0;
    let skipped = 0;

    for (const record of localData) {
      // 檢查是否已存在（使用 userName + date，而不是 userId）
      const existing = await prisma.attendanceRecord.findFirst({
        where: {
          userName: record.user_name,
          date: record.date
        }
      });

      if (existing) {
        skipped++;
        continue;
      }

      // 計算工時
      let workHours = null;
      if (record.clock_in && record.clock_out) {
        const [inH, inM] = record.clock_in.split(':').map(Number);
        const [outH, outM] = record.clock_out.split(':').map(Number);
        const minutes = (outH * 60 + outM) - (inH * 60 + inM);
        workHours = Math.round((minutes / 60) * 10) / 10;
      }

      // 創建記錄
      // 使用 userName 作為 userId（確保唯一性）
      const userId = record.user_id || `user_${record.user_name}`;

      await prisma.attendanceRecord.create({
        data: {
          userId: userId,
          userName: record.user_name,
          date: record.date,
          clockIn: record.clock_in,
          clockOut: record.clock_out,
          workHours: workHours,
          note: '從本地 JSON 導入'
        }
      });

      imported++;
      console.log(`✅ ${record.user_name} - ${record.date}: ${record.clock_in} → ${record.clock_out || '尚未下班'}`);
    }

    console.log(`\n=== 導入完成 ===`);
    console.log(`新導入: ${imported} 筆`);
    console.log(`跳過重複: ${skipped} 筆`);

    // 顯示最終統計
    const finalRecords = await prisma.attendanceRecord.findMany();
    const finalByPerson = {};
    finalRecords.forEach(r => {
      if (!finalByPerson[r.userName]) finalByPerson[r.userName] = 0;
      finalByPerson[r.userName]++;
    });

    console.log('\n📊 數據庫最終統計:');
    Object.keys(finalByPerson).forEach(name => {
      console.log(`- ${name}: ${finalByPerson[name]} 筆`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importAttendance();
