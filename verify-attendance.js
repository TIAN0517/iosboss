const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verify() {
  const records = await prisma.attendanceRecord.findMany({
    orderBy: [{ userName: 'asc' }, { date: 'asc' }]
  });

  console.log('=== 數據庫打卡記錄驗證 ===');
  console.log(`總共: ${records.length} 筆`);

  const byPerson = {};
  records.forEach(r => {
    if (!byPerson[r.userName]) byPerson[r.userName] = [];
    byPerson[r.userName].push(r);
  });

  Object.keys(byPerson).forEach(name => {
    const list = byPerson[name];
    console.log(`\n【${name}】${list.length} 筆記錄`);
    list.forEach(r => {
      const clockOut = r.clockOut || '(尚未下班)';
      const hours = r.workHours ? `(${r.workHours}h)` : '';
      console.log(`  ${r.date}: ${r.clockIn} → ${clockOut} ${hours}`);
    });
  });

  await prisma.$disconnect();

  console.log('\n✅ 所有人記錄完整！');
}

verify();
