import { LineMessageEvent } from '@/types/line';

export async function handleAttendanceCommand(event: LineMessageEvent) {
  const { source, message } = event;
  const userId = source?.userId;
  const text = message?.text?.toLowerCase();

  if (!userId) {
    return { text: '无法识别用户，请重新登录' };
  }

  const today = new Date().toISOString().split('T')[0];

  switch (text) {
    case '上班':
    case '打卡上班':
    case '簽到':
      try {
        const response = await fetch(`${process.env.MAIN_SYSTEM_URL || 'http://localhost:9999'}/api/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            userName: '员工',
            date: today,
            type: 'clockIn',
            note: 'LINE Bot 打卡'
          })
        });

        const data = await response.json();
        return {
          text: `✅ 上班打卡成功！\n\n📅 日期：${today}\n⏰ 时间：${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}\n👤 员工：员工\n\n💼 继续加油工作！`
        };
      } catch (error) {
        console.error('上班打卡失败:', error);
        return { text: '❌ 上班打卡失败，请稍后重试' };
      }

    case '下班':
    case '打卡下班':
    case '簽退':
      try {
        const response = await fetch(`${process.env.MAIN_SYSTEM_URL || 'http://localhost:9999'}/api/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            userName: '员工',
            date: today,
            type: 'clockOut',
            note: 'LINE Bot 打卡'
          })
        });

        const data = await response.json();
        return {
          text: `✅ 下班打卡成功！\n\n📅 日期：${today}\n⏰ 时间：${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}\n👤 员工：员工\n\n🏠 辛苦了，好好休息！`
        };
      } catch (error) {
        console.error('下班打卡失败:', error);
        return { text: '❌ 下班打卡失败，请稍后重试' };
      }

    case '打卡记录':
    case '我的打卡':
    case '打卡查詢':
      try {
        const response = await fetch(`${process.env.MAIN_SYSTEM_URL || 'http://localhost:9999'}/api/attendance?userId=${userId}&date=${today}`);
        const records = await response.json();

        if (!records || records.length === 0) {
          return { text: '📅 今天还没有打卡记录\n\n📍 请发送「上班」或「下班」进行打卡' };
        }

        const latestRecord = records[0];
        let statusText = '';

        if (latestRecord.clockIn && latestRecord.clockOut) {
          statusText = '✅ 已完成今日打卡（上班 + 下班）';
        } else if (latestRecord.clockIn) {
          statusText = '🟢 已上班打卡（尚未下班）';
        } else {
          statusText = '🔴 尚未打卡';
        }

        return {
          text: `📊 今日打卡记录\n\n${statusText}\n\n📅 日期：${today}\n⏰ 上班：${latestRecord.clockIn || '-'}\n⏰ 下班：${latestRecord.clockOut || '-'}\n⏱ 工时：${latestRecord.workHours || '-'} 小时\n\n📝 备注：${latestRecord.note || '无'}`
        };
      } catch (error) {
        console.error('查询打卡记录失败:', error);
        return { text: '❌ 查询打卡记录失败，请稍后重试' };
      }

    default:
      return null;
  }
}
