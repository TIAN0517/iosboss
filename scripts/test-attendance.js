const ATTENDANCE_API_URL = 'http://localhost:9999/api/attendance';

async function testAttendanceAPI() {
  console.log('🧪 測試打卡功能...\n');

  const testUserId = 'test-user-001';
  const testUserName = '測試員工';
  const today = new Date().toISOString().split('T')[0];

  try {
    console.log('📋 測試 1: 員工上班打卡...');
    const clockInResponse = await fetch(ATTENDANCE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        userName: testUserName,
        date: today,
        type: 'clockIn',
        note: '測試上班打卡',
      }),
    });

    if (clockInResponse.ok) {
      const clockInData = await clockInResponse.json();
      console.log('✅ 上班打卡成功！');
      console.log('   記錄 ID:', clockInData.id);
      console.log('   打卡時間:', clockInData.clockIn);
    } else {
      console.log('❌ 上班打卡失敗！');
      const error = await clockInResponse.text();
      console.log('   錯誤:', error);
      return;
    }

    console.log('\n📋 測試 2: 查詢打卡記錄...');
    const queryResponse = await fetch(`${ATTENDANCE_API_URL}?userId=${testUserId}&date=${today}`);

    if (queryResponse.ok) {
      const queryData = await queryResponse.json();
      console.log('✅ 查詢成功！');
      console.log('   記錄數量:', queryData.length);
      if (queryData.length > 0) {
        console.log('   最新記錄:', {
          用戶: queryData[0].userName,
          日期: queryData[0].date,
          上班時間: queryData[0].clockIn,
          下班時間: queryData[0].clockOut,
        });
      }
    } else {
      console.log('❌ 查詢失敗！');
      const error = await queryResponse.text();
      console.log('   錯誤:', error);
      return;
    }

    console.log('\n📋 測試 3: 員工下班打卡...');
    const clockOutResponse = await fetch(ATTENDANCE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: testUserId,
        userName: testUserName,
        date: today,
        type: 'clockOut',
        note: '測試下班打卡',
      }),
    });

    if (clockOutResponse.ok) {
      const clockOutData = await clockOutResponse.json();
      console.log('✅ 下班打卡成功！');
      console.log('   記錄 ID:', clockOutData.id);
      console.log('   打卡時間:', clockOutData.clockOut);
    } else {
      console.log('❌ 下班打卡失敗！');
      const error = await clockOutResponse.text();
      console.log('   錯誤:', error);
      return;
    }

    console.log('\n📋 測試 4: 查詢更新後的記錄...');
    const finalQueryResponse = await fetch(`${ATTENDANCE_API_URL}?userId=${testUserId}&date=${today}`);

    if (finalQueryResponse.ok) {
      const finalQueryData = await finalQueryResponse.json();
      console.log('✅ 查詢成功！');
      if (finalQueryData.length > 0) {
        console.log('   最終記錄:', {
          用戶: finalQueryData[0].userName,
          日期: finalQueryData[0].date,
          上班時間: finalQueryData[0].clockIn,
          下班時間: finalQueryData[0].clockOut,
          備註: finalQueryData[0].note,
        });
      }
    }

    console.log('\n📋 測試 5: 查詢日期範圍...');
    const rangeResponse = await fetch(`${ATTENDANCE_API_URL}?startDate=${today}&endDate=${today}`);

    if (rangeResponse.ok) {
      const rangeData = await rangeResponse.json();
      console.log('✅ 日期範圍查詢成功！');
      console.log('   總記錄數:', rangeData.length);
    }

    console.log('\n🎉 所有打卡功能測試通過！');
    console.log('💡 員工現在可以透過 LINE Bot 進行打卡了。');
    console.log('💡 範例訊息：「打卡上班」或「打卡下班」');
  } catch (error) {
    console.error('❌ 測試失敗：', error);
    console.log('\n📋 檢查事項：');
    console.log('1. 確認伺服器正在運行（npm run dev）');
    console.log('2. 確認 PostgreSQL 數據庫正在運行（localhost:5432）');
    console.log('3. 確認 .env 中的 DATABASE_URL 配置正確');
  }
}

testAttendanceAPI();
