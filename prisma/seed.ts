import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始初始化數據庫...')
  console.log('👥 創建管理員帳號...')

  // 創建老闆娘（管理員）帳號
  const adminPassword = 'Uu19700413'
  const hashedPassword = await bcrypt.hash(adminPassword, 10)

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      name: '管理員',
    },
    create: {
      username: 'admin',
      password: hashedPassword,
      email: 'admin@bossai.jytian.it.com',
      name: '管理員',
      role: 'admin',
      phone: '0912345678',
      department: 'management',
      isActive: true,
    },
  })

  console.log('✅ 管理員帳號已創建/更新:')
  console.log('   帳號:', admin.username)
  console.log('   密碼:', adminPassword)

  // 創建 BossJy 超級管理員帳號（最大權限）
  const bossjyPassword = 'ji394su3@@'
  const hashedBossjyPassword = await bcrypt.hash(bossjyPassword, 10)

  const bossjy = await prisma.user.upsert({
    where: { username: 'bossjy' },
    update: {},
    create: {
      username: 'bossjy',
      password: hashedBossjyPassword,
      email: 'bossjy@jytian.it.com',
      name: 'BossJy',
      role: 'admin',
      phone: '0912345679',
      department: 'management',
      isActive: true,
    },
  })

  console.log('✅ BossJy 超級管理員帳號已創建/更新:')
  console.log('   帳號:', bossjy.username)
  console.log('   密碼:', bossjyPassword)
  console.log('   權限: 最大權限')

  // 創建 kai801129 管理員帳號
  const kaiPassword = '520520@@'
  const hashedKaiPassword = await bcrypt.hash(kaiPassword, 10)

  const kai = await prisma.user.upsert({
    where: { username: 'kai801129' },
    update: {},
    create: {
      username: 'kai801129',
      password: hashedKaiPassword,
      email: 'kai801129@jytian.it.com',
      name: 'Kai',
      role: 'admin',
      phone: '0912345680',
      department: 'management',
      isActive: true,
    },
  })

  console.log('✅ Kai 管理員帳號已創建/更新:')
  console.log('   帳號:', kai.username)
  console.log('   密碼:', kaiPassword)

  // 創建 tian1111 管理員帳號
  const tianPassword = 'tian1111'
  const hashedTianPassword = await bcrypt.hash(tianPassword, 10)

  const tian = await prisma.user.upsert({
    where: { username: 'tian1111' },
    update: {},
    create: {
      username: 'tian1111',
      password: hashedTianPassword,
      email: 'tian1111@jytian.it.com',
      name: 'Tian',
      role: 'admin',
      phone: '0912345681',
      department: 'management',
      isActive: true,
    },
  })

  console.log('✅ Tian 管理員帳號已創建/更新:')
  console.log('   帳號:', tian.username)
  console.log('   密碼:', tianPassword)

  // 創建 yzrong (彥榮) 員工帳號
  const yzrongPassword = 'yzrong123'
  const hashedYzrongPassword = await bcrypt.hash(yzrongPassword, 10)

  const yzrong = await prisma.user.upsert({
    where: { username: 'yzrong' },
    update: {},
    create: {
      username: 'yzrong',
      password: hashedYzrongPassword,
      email: 'yzrong@bossai.jytian.it.com',
      name: '彥榮',
      role: 'staff',
      phone: '0912345682',
      department: 'operations',
      isActive: true,
    },
  })

  console.log('✅ 彥榮員工帳號已創建/更新:')
  console.log('   帳號:', yzrong.username)
  console.log('   密碼:', yzrongPassword)

  // 創建員工帳號（最低權限）
  console.log('')
  console.log('👷 創建員工帳號（最低權限 - 只能看非敏感資料）...')

  const staffPassword = 'staff123'
  const hashedStaffPassword = await bcrypt.hash(staffPassword, 10)

  const staff = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {},
    create: {
      username: 'staff',
      password: hashedStaffPassword,
      email: 'staff@bossai.jytian.it.com',
      name: '員工',
      role: 'staff',
      phone: '0912345690',
      department: 'operations',
      isActive: true,
    },
  })

  console.log('✅ 員工帳號已創建/更新:')
  console.log('   帳號:', staff.username)
  console.log('   密碼:', staffPassword)
  console.log('   權限: 最低（只能看非敏感資料）')
  console.log('')
  console.log('⚠️  共創建了 5 個帳號（4 管理員 + 1 員工），請妥善保管密碼！')
}

main()
  .catch((e) => {
    console.error('❌ 初始化失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
