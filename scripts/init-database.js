#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 開始初始化數據庫...')

  try {
    // 檢查是否已經存在超級管理員
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'bossjy' }
    })

    if (existingAdmin) {
      console.log('✅ 超級管理員 "bossjy" 已經存在，跳過創建')
      console.log('   當前角色:', existingAdmin.role)
      return
    }

    // 創建密碼哈希
    const hashedPassword = await bcrypt.hash('bossjy123', 10)

    // 創建超級管理員用戶
    const admin = await prisma.user.create({
      data: {
        username: 'bossjy',
        password: hashedPassword,
        name: 'BossJy',
        email: 'bossjy@example.com',
        role: 'admin',
        isActive: true,
        phone: '0912345678',
        department: '管理部'
      }
    })

    console.log('✅ 超級管理員用戶創建成功:')
    console.log('   用戶名:', admin.username)
    console.log('   姓名:', admin.name)
    console.log('   角色:', admin.role)
    console.log('   電子:', admin.phone)
    console.log('   密碼: bossjy123')
    console.log('')
    console.log('🔐 請使用以下憑證登入:')
    console.log('   帳號: bossjy')
    console.log('   密碼: bossjy123')

    // 創建一些測試客戶數據
    const testCustomer = await prisma.customer.create({
      data: {
        name: '測試客戶',
        phone: '0987654321',
        address: '台南市永康區測試路123號',
        paymentType: 'cash',
        groupId: null
      }
    })

    console.log('')
    console.log('✅ 測試客戶創建成功:', testCustomer.name)

  } catch (error) {
    console.error('❌ 初始化失敗:', error.message)
    if (error.message.includes('Unique constraint')) {
      console.error('   可能是用戶名已經存在')
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('')
    console.log('🎉 數據庫初始化完成！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('')
    console.error('💥 初始化過程出錯:')
    console.error(error)
    process.exit(1)
  })
