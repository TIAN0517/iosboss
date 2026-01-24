@echo off
chcp 65001 > nul

set "BACKUP_FILE=%~1"

if "%BACKUP_FILE%"=="" (
    echo ===============================================
    echo   數據庫還原工具
    echo ===============================================
    echo.
    echo 用法: restore-database.bat [備份檔案路徑]
    echo.
    echo 可用的備份檔案:
    echo.
    if exist "C:\BossAI-Backups\*.json" (
        dir /B "C:\BossAI-Backups\bossai-backup-*.json" 2>nul
    ) else (
        echo   (沒有找到備份檔案)
    )
    echo.
    exit /b 1
)

echo ===============================================
echo   還原數據庫
echo ===============================================
echo.
echo 警告: 這將會覆蓋現有數據！
echo.
echo 備份檔案: %BACKUP_FILE%
echo.

:: 顯示備份檔案資訊
node -e "
try {
    const fs = require('fs');
    const backup = JSON.parse(fs.readFileSync('%BACKUP_FILE%', 'utf8'));
    console.log('備份時間:', backup.timestamp);
    console.log('備份版本:', backup.version);
    console.log('');
    console.log('資料統計:');
    console.log('  - 用戶:', backup.data.users?.length || 0);
    console.log('  - 客戶:', backup.data.customers?.length || 0);
    console.log('  - 產品:', backup.data.products?.length || 0);
    console.log('  - 訂單:', backup.data.orders?.length || 0);
    console.log('  - 庫存:', backup.data.inventory?.length || 0);
    console.log('  - 支票:', backup.data.checks?.length || 0);
    console.log('  - 通話記錄:', backup.data.callRecords?.length || 0);
    console.log('  - LINE 群組:', backup.data.lineGroups?.length || 0);
    console.log('  - 打卡記錄:', backup.data.attendanceRecords?.length || 0);
} catch (err) {
    console.error('無法讀取備份檔案:', err.message);
    process.exit(1);
}
" 2>nul

echo.
set /p confirm="確定要還原嗎？(輸入 YES 確認): "

if /i not "%confirm%"=="YES" (
    echo 已取消還原
    exit /b 0
)

echo.
echo 正在還原數據庫...
echo 請稍候...

cd /d "%~dp0.."

node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restore() {
  const backupData = JSON.parse(fs.readFileSync('%BACKUP_FILE%', 'utf8'));

  console.log('1/11 清空舊數據...');

  // 按照正確的順序刪除（考慮外鍵約束）
  await prisma.attendanceRecord.deleteMany({});
  await prisma.employeeSchedule.deleteMany({});
  await prisma.scheduleStation.deleteMany({});
  await prisma.scheduleSheet.deleteMany({});
  await prisma.dispatchRecord.deleteMany({});
  await prisma.driverLocation.deleteMany({});
  await prisma.lineMessage.deleteMany({});
  await prisma.lineConversation.deleteMany({});
  await prisma.lineGroup.deleteMany({});
  await prisma.callRecord.deleteMany({});
  await prisma.deliveryRecord.deleteMany({});
  await prisma.gasOrderItem.deleteMany({});
  await prisma.gasOrder.deleteMany({});
  await prisma.check.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('2/11 還原用戶數據...');
  for (const user of backupData.data.users || []) {
    try {
      await prisma.user.create({ data: user });
    } catch (err) {
      // 忽略重複鍵錯誤
      if (!err.message.includes('unique constraint')) {
        console.warn('  跳過用戶:', user.username);
      }
    }
  }
  console.log('   ✓ 用戶:', backupData.data.users?.length || 0);

  console.log('3/11 還原客戶數據...');
  for (const customer of backupData.data.customers || []) {
    try {
      await prisma.customer.create({ data: customer });
    } catch (err) {
      if (!err.message.includes('unique constraint')) {
        console.warn('  跳過客戶:', customer.name);
      }
    }
  }
  console.log('   ✓ 客戶:', backupData.data.customers?.length || 0);

  console.log('4/11 還原產品數據...');
  for (const product of backupData.data.products || []) {
    try {
      await prisma.product.create({ data: product });
    } catch (err) {
      if (!err.message.includes('unique constraint')) {
        console.warn('  跳過產品:', product.name);
      }
    }
  }
  console.log('   ✓ 產品:', backupData.data.products?.length || 0);

  console.log('5/11 還原庫存數據...');
  for (const inventory of backupData.data.inventory || []) {
    try {
      await prisma.inventory.create({ data: inventory });
    } catch (err) {
      if (!err.message.includes('unique constraint')) {
        console.warn('  跳過庫存');
      }
    }
  }
  console.log('   ✓ 庫存:', backupData.data.inventory?.length || 0);

  console.log('6/11 還原訂單數據...');
  for (const order of backupData.data.orders || []) {
    try {
      // 移除 id 讓 Prisma 自動生成
      const { id, ...orderData } = order;
      await prisma.gasOrder.create({
        data: orderData
      });
    } catch (err) {
      if (!err.message.includes('unique constraint')) {
        console.warn('  跳過訂單:', order.orderNo);
      }
    }
  }
  console.log('   ✓ 訂單:', backupData.data.orders?.length || 0);

  console.log('7/11 還原支票數據...');
  for (const check of backupData.data.checks || []) {
    try {
      const { id, ...checkData } = check;
      await prisma.check.create({ data: checkData });
    } catch (err) {
      if (!err.message.includes('unique constraint')) {
        console.warn('  跳過支票:', check.checkNo);
      }
    }
  }
  console.log('   ✓ 支票:', backupData.data.checks?.length || 0);

  console.log('8/11 還原通話記錄...');
  for (const call of backupData.data.callRecords || []) {
    try {
      const { id, ...callData } = call;
      await prisma.callRecord.create({ data: callData });
    } catch (err) {
      // 忽略錯誤
    }
  }
  console.log('   ✓ 通話記錄:', backupData.data.callRecords?.length || 0);

  console.log('9/11 還原 LINE 群組...');
  for (const group of backupData.data.lineGroups || []) {
    try {
      const { id, ...groupData } = group;
      await prisma.lineGroup.create({ data: groupData });
    } catch (err) {
      if (!err.message.includes('unique constraint')) {
        console.warn('  跳過群組:', group.groupName);
      }
    }
  }
  console.log('   ✓ LINE 群組:', backupData.data.lineGroups?.length || 0);

  console.log('10/11 還原打卡記錄...');
  for (const attendance of backupData.data.attendanceRecords || []) {
    try {
      const { id, ...attendanceData } = attendance;
      await prisma.attendanceRecord.create({ data: attendanceData });
    } catch (err) {
      // 忽略重複
    }
  }
  console.log('   ✓ 打卡記錄:', backupData.data.attendanceRecords?.length || 0);

  console.log('11/11 完成！');

  await prisma.\$disconnect();
  process.exit(0);
}

restore().catch(err => {
  console.error('✗ 還原失敗:', err.message);
  process.exit(1);
});
"

echo.
echo ===============================================
echo   還原完成！
echo ===============================================
echo.
echo 請重新啟動應用程式以載入新數據
echo.
pause
