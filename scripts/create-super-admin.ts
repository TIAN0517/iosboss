/**
 * 創建最高權限管理員帳號
 * 帳號：bossjy
 * 密碼：ji394su3@@
 */

import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function createSuperAdmin() {
  console.log('🔑 開始創建最高權限管理員帳號...')

  const username = 'bossjy'
  const password = 'ji394su3@@'
  const name = 'BossJy - 最高權限管理員'

  // 檢查是否已存在
  const existing = await prisma.user.findFirst({
    where: { username },
  })

  if (existing) {
    console.log('⚠️ 帳號', username, '已存在')
    console.log('   名字:', existing.name)
    console.log('   角色:', existing.role)
    return
  }

  // 雜湊密碼
  const hashedPassword = await bcrypt.hash(password, 10)

  // 創建帳號
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      email: 'bossjy@bossai.jytian.it.com',
      name,
      role: 'admin',
      phone: '0912345678',
      department: 'management',
      isActive: true,
    },
  })

  console.log('✅ 最高權限管理員帳號創建成功！')
  console.log('')
  console.log('📋 登入資訊:')
  console.log('   帳號:', user.username)
  console.log('   密碼:', password)
  console.log('   名字:', user.name)
  console.log('   角色:', user.role)
  console.log('   Email:', user.email)
  console.log('')
  console.log('⚠️  這是最高權限管理員帳號，請妥善保管！')
}

createSuperAdmin()
  .catch((e) => {
    console.error('❌ 創建失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
