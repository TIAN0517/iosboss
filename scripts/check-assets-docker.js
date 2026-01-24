// Docker 資產盤點腳本
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:Ss520520@localhost:5433/gas_management?schema=public'
    }
  }
})

async function checkAssets() {
  try {
    console.log('\n📊 九九瓦斯行資產盤點報告 (Docker)')
    console.log('='.repeat(50))

    // 1. 用戶
    const users = await prisma.user.count()
    const activeUsers = await prisma.user.count({ where: { isActive: true } })
    console.log(`\n👥 用戶 (User)`)
    console.log(`   總數: ${users}`)
    console.log(`   啟用: ${activeUsers}`)

    // 2. 客戶
    const customers = await prisma.customer.count()
    const cashCustomers = await prisma.customer.count({ where: { paymentType: 'cash' } })
    const monthlyCustomers = await prisma.customer.count({ where: { paymentType: 'monthly' } })
    console.log(`\n👤 客戶 (Customer)`)
    console.log(`   總數: ${customers}`)
    console.log(`   現金客: ${cashCustomers}`)
    console.log(`   月結客: ${monthlyCustomers}`)

    // 3. 產品
    const products = await prisma.product.count()
    const activeProducts = await prisma.product.count({ where: { isActive: true } })
    const categories = await prisma.productCategory.count()
    console.log(`\n📦 產品 (Product)`)
    console.log(`   總數: ${products}`)
    console.log(`   啟用: ${activeProducts}`)
    console.log(`   分類: ${categories}`)

    // 4. 庫存
    const inventories = await prisma.inventory.findMany({
      include: { product: true }
    })
    const totalInventory = inventories.reduce((sum, inv) => sum + inv.quantity, 0)
    const lowStock = inventories.filter(inv => inv.quantity <= inv.minStock)
    console.log(`\n📋 庫存 (Inventory)`)
    console.log(`   產品項目: ${inventories.length}`)
    console.log(`   總數量: ${totalInventory}`)
    console.log(`   低庫存警報: ${lowStock.length} 項`)
    if (lowStock.length > 0) {
      console.log(`   ⚠️ 低庫存項目:`)
      lowStock.forEach(inv => {
        console.log(`      - ${inv.product.name}: ${inv.quantity} (最低: ${inv.minStock})`)
      })
    }

    // 5. 訂單
    const orders = await prisma.gasOrder.count()
    const pendingOrders = await prisma.gasOrder.count({ where: { status: 'pending' } })
    const completedOrders = await prisma.gasOrder.count({ where: { status: 'completed' } })
    const orderTotal = await prisma.gasOrder.aggregate({ _sum: { total: true } })
    console.log(`\n🛒 訂單 (GasOrder)`)
    console.log(`   總數: ${orders}`)
    console.log(`   待處理: ${pendingOrders}`)
    console.log(`   已完成: ${completedOrders}`)
    console.log(`   總金額: NT$ ${orderTotal._sum.total || 0}`)

    // 6. 支票
    const checks = await prisma.check.count()
    const pendingChecks = await prisma.check.count({ where: { status: 'pending' } })
    const clearedChecks = await prisma.check.count({ where: { status: 'cleared' } })
    const bouncedChecks = await prisma.check.count({ where: { status: 'bounced' } })
    const checkTotal = await prisma.check.aggregate({ _sum: { amount: true } })
    console.log(`\n💳 支票 (Check)`)
    console.log(`   總數: ${checks}`)
    console.log(`   待入帳: ${pendingChecks}`)
    console.log(`   已兌現: ${clearedChecks}`)
    console.log(`   跳票: ${bouncedChecks}`)
    console.log(`   總金額: NT$ ${checkTotal._sum.amount || 0}`)

    // 7. 成本
    const costs = await prisma.costRecord.count()
    const costTotal = await prisma.costRecord.aggregate({ _sum: { amount: true } })
    console.log(`\n💰 成本 (CostRecord)`)
    console.log(`   記錄數: ${costs}`)
    console.log(`   總金額: NT$ ${costTotal._sum.amount || 0}`)

    // 8. 來電記錄
    const calls = await prisma.callRecord.count()
    const missedCalls = await prisma.callRecord.count({ where: { status: 'missed' } })
    console.log(`\n📞 來電記錄 (CallRecord)`)
    console.log(`   總數: ${calls}`)
    console.log(`   未接: ${missedCalls}`)

    // 9. 配送記錄
    const deliveries = await prisma.deliveryRecord.count()
    const completedDeliveries = await prisma.deliveryRecord.count({ where: { status: 'completed' } })
    console.log(`\n🚚 配送記錄 (DeliveryRecord)`)
    console.log(`   總數: ${deliveries}`)
    console.log(`   已完成: ${completedDeliveries}`)

    // 10. 抄錶記錄
    const meterReadings = await prisma.meterReading.count()
    console.log(`\n⏱️ 抄錶記錄 (MeterReading)`)
    console.log(`   總數: ${meterReadings}`)

    // 11. 月結報表
    const statements = await prisma.monthlyStatement.count()
    console.log(`\n📊 月結報表 (MonthlyStatement)`)
    console.log(`   總數: ${statements}`)

    // 12. 客戶分組
    const groups = await prisma.customerGroup.count()
    const activeGroups = await prisma.customerGroup.count({ where: { isActive: true } })
    console.log(`\n👥 客戶分組 (CustomerGroup)`)
    console.log(`   總數: ${groups}`)
    console.log(`   啟用: ${activeGroups}`)

    // 13. 庫存變動記錄
    const inventoryTx = await prisma.inventoryTransaction.count()
    console.log(`\n📝 庫存變動記錄 (InventoryTransaction)`)
    console.log(`   總數: ${inventoryTx}`)

    // 14. 促銷活動
    const promotions = await prisma.promotion.count()
    const activePromotions = await prisma.promotion.count({ where: { isActive: true } })
    console.log(`\n🎉 促銷活動 (Promotion)`)
    console.log(`   總數: ${promotions}`)
    console.log(`   進行中: ${activePromotions}`)

    // 15. LINE Bot
    const lineGroups = await prisma.lineGroup.count()
    const lineMessages = await prisma.lineMessage.count()
    console.log(`\n💬 LINE Bot`)
    console.log(`   群組數: ${lineGroups}`)
    console.log(`   訊息數: ${lineMessages}`)

    // 16. 會計同步
    const accountingSync = await prisma.accountingSync.count()
    console.log(`\n🔄 會計同步 (AccountingSync)`)
    console.log(`   總數: ${accountingSync}`)

    console.log('\n' + '='.repeat(50))
    console.log('✅ 資產盤點完成！')
    console.log('🐳 Docker 環境運行正常')
    console.log('='.repeat(50) + '\n')

  } catch (error) {
    console.error('❌ 錯誤:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkAssets()
