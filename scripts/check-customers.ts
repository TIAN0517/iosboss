import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkCustomers() {
  console.log('🔍 檢查數據庫中的客戶資料...\n')

  // 檢查所有客戶
  const allCustomers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  console.log(`📊 總客戶數: ${allCustomers.length}\n`)

  if (allCustomers.length === 0) {
    console.log('⚠️  數據庫中沒有任何客戶資料！')
    console.log('\n💡 解決方案:')
    console.log('1. 在系統中點擊「新增客戶」按鈕添加客戶')
    console.log('2. 或訪問 /api/init 初始化系統數據')
  } else {
    console.log('📋 客戶列表:')
    console.log('─'.repeat(80))
    allCustomers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name.padEnd(10)} | ${c.phone.padEnd(15)} | ${c.address}`)
    })
    console.log('─'.repeat(80))

    // 檢查是否有「佑蓮」
    const youLian = allCustomers.find(c => c.name.includes('佑蓮'))
    if (youLian) {
      console.log('\n✅ 找到「佑蓮」客戶:')
      console.log(`   姓名: ${youLian.name}`)
      console.log(`   電話: ${youLian.phone}`)
      console.log(`   地址: ${youLian.address}`)
    } else {
      console.log('\n❌ 沒有找到「佑蓮」客戶')
      console.log('\n💡 解決方案:')
      console.log('   在客戶管理頁面點擊「新增客戶」按鈕，輸入以下資料:')
      console.log('   - 客戶姓名: 佑蓮')
      console.log('   - 聯絡電話: (輸入電話號碼)')
      console.log('   - 配送地址: (輸入地址)')
    }
  }

  await prisma.$disconnect()
}

checkCustomers().catch(console.error)
