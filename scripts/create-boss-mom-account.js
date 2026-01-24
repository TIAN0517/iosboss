#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 創建老闆娘帳號...')

  try {
    // 檢查是否已經存在
    const existingUser = await prisma.user.findUnique({
      where: { username: 'uu19700413' }
    })

    if (existingUser) {
      console.log('⚠️  用戶 "uu19700413" 已經存在')
      console.log('   姓名:', existingUser.name)
      console.log('   角色:', existingUser.role)
      console.log('   電話:', existingUser.phone)
      return
    }

    // 創建密碼哈希
    const hashedPassword = await bcrypt.hash('uu19700413', 10)

    // 創建老闆娘用戶
    const bossMom = await prisma.user.create({
      data: {
        username: 'uu19700413',
        password: hashedPassword,
        name: '老闆娘',
        email: 'uu19700413@bossai.jytian.it.com',
        role: 'admin',
        isActive: true,
        phone: '0987654321',
        department: '管理部'
      }
    })

    console.log('✅ 老闆娘帳號創建成功:')
    console.log('   用戶名:', bossMom.username)
    console.log('   姓名:', bossMom.name)
    console.log('   角色:', bossMom.role)
    console.log('   電話:', bossMom.phone)
    console.log('   密碼: uu19700413')
    console.log('')
    console.log('🔐 老闆娘登入憑證:')
    console.log('   帳號: uu19700413')
    console.log('   密碼: uu19700413')

  } catch (error) {
    console.error('❌ 創建失敗:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('')
    console.log('🎉 操作完成！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('')
    console.error('💥 操作失敗:')
    console.error(error)
    process.exit(1)
  })
