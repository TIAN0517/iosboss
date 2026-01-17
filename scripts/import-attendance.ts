import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const attendanceData = [
  // 1/12 (已完成)
  { userId: '', userName: '小凱', date: '2025-01-12', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  { userId: '', userName: '彥榮', date: '2025-01-12', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  { userId: '', userName: 'bossjy', date: '2025-01-12', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  // 1/13 (已完成)
  { userId: '', userName: '小凱', date: '2025-01-13', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  { userId: '', userName: '彥榮', date: '2025-01-13', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  { userId: '', userName: 'bossjy', date: '2025-01-13', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  // 1/14 (已完成)
  { userId: '', userName: '小凱', date: '2025-01-14', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  { userId: '', userName: '彥榮', date: '2025-01-14', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  { userId: '', userName: 'bossjy', date: '2025-01-14', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  // 1/15 (已完成)
  { userId: '', userName: '小凱', date: '2025-01-15', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  { userId: '', userName: '彥榮', date: '2025-01-15', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  { userId: '', userName: 'bossjy', date: '2025-01-15', clockIn: '07:50', clockOut: '14:00', workHours: 6.17 },
  // 1/16 (今天 - 只上班)
  { userId: '', userName: '小凱', date: '2025-01-16', clockIn: '07:50', clockOut: null, workHours: null },
  { userId: '', userName: '彥榮', date: '2025-01-16', clockIn: '07:50', clockOut: null, workHours: null },
  { userId: '', userName: 'bossjy', date: '2025-01-16', clockIn: '07:50', clockOut: null, workHours: null },
]

async function importAttendance() {
  console.log('開始導入打卡記錄...')

  for (const record of attendanceData) {
    await prisma.attendanceRecord.upsert({
      where: {
        userId_date: {
          userId: record.userId || 'unknown',
          date: record.date
        }
      },
      update: {
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        workHours: record.workHours
      },
      create: {
        userId: record.userId || 'unknown',
        userName: record.userName,
        date: record.date,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        workHours: record.workHours
      }
    })
    console.log(`✅ ${record.userName} - ${record.date}: ${record.clockIn} → ${record.clockOut || '尚未下班'}`)
  }

  console.log('導入完成！')
}

importAttendance()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
