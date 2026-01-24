#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 檢查數據庫內容...')

  try {
    // 檢查所有用戶
    const users = await prisma.user.findMany()
    console.log('\n👤 數據庫中的所有用戶:')
    console.log('='.repeat(60))
    users.forEach(user => {
      console.log(`ID: ${user.id}`)
      console.log(`用戶名: ${user.username}`)
      console.log(`姓名: ${user.name}`)
      console.log(`角色: ${user.role}`)
      console.log(`電子郵件: ${user.email}`)
      console.log(`電話: ${user.phone}`)
      console.log(`是否啟用: ${user.isActive}`)
      console.log(`創建時間: ${user.createdAt}`)
      console.log('-'.repeat(40))
    })

    // 統計用戶數量
    console.log(`\n📊 用戶統計:`)
    console.log(`總用戶數: ${users.length}`)
    console.log(`管理員數: ${users.filter(u => u.role === 'admin').length}`)
    console.log(`員工數: ${users.filter(u => u.role === 'staff').length}`)
    console.log(`啟用數: ${users.filter(u => u.isActive).length}`)

    // 檢查客戶數量
    const customers = await prisma.customer.count()
    console.log(`\n👥 客戶數量: ${customers}`)

    // 檢查訂單數量
    const orders = await prisma.gasOrder.count()
    console.log(`📦 訂單數量: ${orders}`)

  } catch (error) {
    console.error('❌ 檢查失敗:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .then(() => {
    console.log('\n🎉 檢查完成！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 檢查失敗:')
    console.error(error)
    process.exit(1)
  })
