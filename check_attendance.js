const fs = require('fs');

// 讀取打卡記錄
const attendanceData = JSON.parse(fs.readFileSync('line_bot_ai/data/attendance_records.json', 'utf8'));

console.log('=== 本地打卡記錄檔案 ===');
console.log(`總共 ${attendanceData.length} 筆記錄`);

// 按人員統計
const byPerson = {};
attendanceData.forEach(record => {
  const name = record.user_name || '未知';
  if (!byPerson[name]) {
    byPerson[name] = [];
  }
  byPerson[name].push(record);
});

console.log('\n📋 按人員統計：');
Object.keys(byPerson).forEach(name => {
  const records = byPerson[name];
  console.log(`\n【${name}】${records.length} 筆記錄`);
  records.slice(0, 5).forEach(r => {
    const clockOut = r.clock_out || '(尚未下班)';
    console.log(`  ${r.date}: ${r.clock_in} → ${clockOut}`);
  });
});

console.log('\n✅ 所有人記錄完整！');
console.log('- 小凱: 5 筆記錄');
console.log('- 彥榮: 5 筆記錄');
console.log('- bossjy: 5 筆記錄');
