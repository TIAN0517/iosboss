// 詳細資產報表腳本
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function generateDetailedReport() {
  try {
    console.log('\n' + '='.repeat(60))
    console.log('📊 九九瓦斯行 - 詳細資產報表')
    console.log('   報表時間:', new Date().toLocaleString('zh-TW'))
    console.log('='.repeat(60))

    // ========================================
    // 一、庫存分析
    // ========================================
    console.log('\n📦 一、庫存分析')
    console.log('-'.repeat(60))

    const inventories = await prisma.inventory.findMany({
      include: { product: true }
    })

    // 按分類統計
    const byCategory = {}
    let totalInventoryValue = 0
    let totalCostValue = 0

    inventories.forEach(inv => {
      const category = inv.product.category.name
      if (!byCategory[category]) {
        byCategory[category] = {
          count: 0,
          quantity: 0,
          value: 0,
          cost: 0
        }
      }
      byCategory[category].count++
      byCategory[category].quantity += inv.quantity
      byCategory[category].value += inv.quantity * inv.product.price
      byCategory[category].cost += inv.quantity * inv.product.cost
      totalInventoryValue += inv.quantity * inv.product.price
      totalCostValue += inv.quantity * inv.product.cost
    })

    console.log('\n按產品分類統計:')
    console.log('分類'.padEnd(15) + '項目'.padEnd(8) + '數量'.padEnd(10) + '售價總值'.padEnd(15) + '成本總值')
    console.log('-'.repeat(60))

    for (const [category, data] of Object.entries(byCategory)) {
      const profit = data.value - data.cost
      const margin = ((profit / data.value) * 100).toFixed(1)
      console.log(
        category.padEnd(15) +
        data.count.toString().padEnd(8) +
        data.quantity.toString().padEnd(10) +
        `NT$ ${data.value.toLocaleString()}`.padEnd(15) +
        `NT$ ${data.cost.toLocaleString()}`
      )
    }

    console.log('-'.repeat(60))
    console.log(
      '總計'.padEnd(15) +
      inventories.length.toString().padEnd(8) +
      inventories.reduce((s, i) => s + i.quantity, 0).toString().padEnd(10) +
      `NT$ ${totalInventoryValue.toLocaleString()}`.padEnd(15) +
      `NT$ ${totalCostValue.toLocaleString()}`
    )

    const totalProfit = totalInventoryValue - totalCostValue
    const overallMargin = ((totalProfit / totalInventoryValue) * 100).toFixed(1)
    console.log(`\n💰 預期毛利: NT$ ${totalProfit.toLocaleString()} (毛利率 ${overallMargin}%)`)

    // ========================================
    // 二、產品詳情
    // ========================================
    console.log('\n\n📋 二、產品庫存詳情 (TOP 10 價值)')
    console.log('-'.repeat(60))

    const topProducts = [...inventories]
      .sort((a, b) => (b.quantity * b.product.price) - (a.quantity * a.product.price))
      .slice(0, 10)

    console.log('產品名稱'.padEnd(25) + '數量'.padEnd(8) + '單價'.padEnd(12) + '總值')
    console.log('-'.repeat(60))
    topProducts.forEach(inv => {
      const total = inv.quantity * inv.product.price
      console.log(
        inv.product.name.padEnd(25) +
        inv.quantity.toString().padEnd(8) +
        `NT$ ${inv.product.price}`.padEnd(12) +
        `NT$ ${total.toLocaleString()}`
      )
    })

    // ========================================
    // 三、用戶資訊
    // ========================================
    console.log('\n\n👥 三、用戶資訊')
    console.log('-'.repeat(60))

    const users = await prisma.user.findMany({
      where: { isActive: true }
    })

    users.forEach(user => {
      console.log(`\n👤 ${user.name} (@${user.username})`)
      console.log(`   角色: ${getRoleName(user.role)}`)
      console.log(`   電話: ${user.phone || '未設定'}`)
      console.log(`   部門: ${user.department || '未設定'}`)
    })

    // ========================================
    // 四、客戶分組
    // ========================================
    console.log('\n\n👥 四、客戶分組設定')
    console.log('-'.repeat(60))

    const groups = await prisma.customerGroup.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { customers: true }
        }
      }
    })

    console.log('分組名稱'.padEnd(15) + '折扣'.padEnd(10) + '客戶數')
    console.log('-'.repeat(60))
    groups.forEach(group => {
      console.log(
        group.name.padEnd(15) +
        `${group.discount}%`.padEnd(10) +
        group._count.customers.toString()
      )
    })

    // ========================================
    // 五、庫存變動記錄
    // ========================================
    console.log('\n\n📝 五、最近庫存變動記錄')
    console.log('-'.repeat(60))

    const recentTransactions = await prisma.inventoryTransaction.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    recentTransactions.forEach(tx => {
      const date = new Date(tx.createdAt).toLocaleString('zh-TW')
      const arrow = tx.quantityAfter > tx.quantityBefore ? '↑' : '↓'
      console.log(
        `${date} | ${tx.product.name.padEnd(20)} | ` +
        `${tx.quantityBefore} → ${tx.quantityAfter} ${arrow} | ` +
        `${tx.reason || tx.type}`
      )
    })

    // ========================================
    // 六、系統健康狀態
    // ========================================
    console.log('\n\n🔍 六、系統健康狀態')
    console.log('-'.repeat(60))

    const healthChecks = [
      { name: '用戶帳號', status: users.length >= 1, tip: users.length === 0 ? '請建立管理員帳號' : '正常' },
      { name: '客戶資料', status: await prisma.customer.count() > 0, tip: '無客戶資料，請新增' },
      { name: '庫存水準', status: inventories.filter(i => i.quantity <= i.minStock).length === 0, tip: '檢查低庫存項目' },
      { name: '產品設定', status: await prisma.product.count() > 0, tip: '請設定產品資料' },
      { name: '客戶分組', status: groups.length > 0, tip: '請設定客戶分組' },
    ]

    healthChecks.forEach(check => {
      const icon = check.status ? '✅' : '⚠️'
      console.log(`${icon} ${check.name.padEnd(20)} ${check.tip}`)
    })

    // ========================================
    // 七、營運建議
    // ========================================
    console.log('\n\n💡 七、營運建議')
    console.log('-'.repeat(60))

    const customerCount = await prisma.customer.count()
    const suggestions = []

    if (customerCount === 0) {
      suggestions.push('🔴 優先：新增客戶資料，建立客戶庫')
    }
    if (inventories.filter(i => i.quantity <= i.minStock).length > 0) {
      suggestions.push('🟡 注意：有產品低於最低庫存，請補貨')
    }
    if (await prisma.costRecord.count() === 0) {
      suggestions.push('🟢 建議：開始記錄成本，追蹤利潤')
    }

    if (suggestions.length === 0) {
      suggestions.push('✅ 系統運作良好，持續監控即可')
    }

    suggestions.forEach(s => console.log(s))

    console.log('\n' + '='.repeat(60))
    console.log('✅ 報表生成完成')
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ 錯誤:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

function getRoleName(role) {
  const roleMap = {
    'admin': '系統管理員',
    'staff': '一般員工',
    'driver': '司機',
    'accountant': '會計'
  }
  return roleMap[role] || role
}

generateDetailedReport()
