import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 2025/1/16 下午 15:00 下班記錄
  // 斷線導致沒紀錄到，現補上歷史記錄

  const records = [
    {
      userName: '小凱',
      // 需要查找實際的 userId
    },
    {
      userName: '彥榮',
      // 需要查找實際的 userId
    },
    {
      userName: 'BossJy',
      // 需要查找實際的 userId
    },
  ]

  const date = '2025-01-16'
  const clockOut = '15:00'
  const note = '補登錄：系統斷線導致未記錄'

  console.log('正在查找用戶...')

  // 查找所有用戶
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: '小凱' } },
        { name: { contains: '彥榮' } },
        { name: { contains: 'BossJy' } },
        { name: { contains: 'Boss' } },
        { username: { contains: 'kai' } },
      ],
    },
  })

  console.log('找到的用戶:', users.map(u => ({ id: u.id, name: u.name, username: u.username })))

  // 為每個用戶添加或更新打卡記錄
  for (const user of users) {
    const record = await prisma.attendanceRecord.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: date,
        },
      },
      update: {
        clockOut: clockOut,
        note: note,
      },
      create: {
        userId: user.id,
        userName: user.name || user.username,
        date: date,
        clockOut: clockOut,
        note: note,
      },
    })

    console.log(`✓ ${user.name || user.username}: ${record.clockOut}`)
  }

  console.log('\n歷史記錄添加完成！')
}

main()
  .catch((e) => {
    console.error('錯誤:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
