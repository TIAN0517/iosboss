// 導入數據到 Docker PostgreSQL
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

async function importToDocker() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DOCKER_DATABASE_URL || 'postgresql://postgres:Ss520520@localhost:5433/gas_management?schema=public'
      }
    }
  })

  try {
    // 清空現有數據（按照外鍵依賴反序刪除）
    console.log('🗑️ 清空現有數據...')
    await prisma.inventoryTransaction.deleteMany({})
    await prisma.accountingSync.deleteMany({})
    await prisma.lineMessage.deleteMany({})
    await prisma.lineGroup.deleteMany({})
    await prisma.monthlyStatement.deleteMany({})
    await prisma.meterReading.deleteMany({})
    await prisma.deliveryRecord.deleteMany({})
    await prisma.callRecord.deleteMany({})
    await prisma.costRecord.deleteMany({})
    await prisma.check.deleteMany({})
    await prisma.gasOrderItem.deleteMany({})
    await prisma.gasOrder.deleteMany({})
    await prisma.customer.deleteMany({})
    await prisma.inventory.deleteMany({})
    await prisma.product.deleteMany({})
    await prisma.productCategory.deleteMany({})
    await prisma.customerGroup.deleteMany({})
    await prisma.user.deleteMany({})
    console.log('✅ 數據清空完成\n')
    console.log('\n📥 開始導入數據到 Docker PostgreSQL...\n')

    // 找到最新的 JSON 備份文件
    const backupDir = path.join(__dirname, '../backups')
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'))

    if (files.length === 0) {
      throw new Error('沒有找到備份文件！請先運行 export-local-db.js')
    }

    // 按時間排序，取最新的
    files.sort()
    const latestFile = files[files.length - 1]
    const backupPath = path.join(backupDir, latestFile)

    console.log(`📄 讀取備份文件: ${latestFile}`)
    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))

    console.log('\n🔄 開始導入數據...\n')

    // 按照外鍵依賴順序導入

    // 1. 產品分類
    if (data.productCategories?.length > 0) {
      console.log(`📦 導入產品分類: ${data.productCategories.length} 筆`)
      for (const item of data.productCategories) {
        await prisma.productCategory.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    // 2. 客戶分組
    if (data.customerGroups?.length > 0) {
      console.log(`👥 導入客戶分組: ${data.customerGroups.length} 筆`)
      for (const item of data.customerGroups) {
        await prisma.customerGroup.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    // 3. 用戶
    if (data.users?.length > 0) {
      console.log(`👤 導入用戶: ${data.users.length} 筆`)
      for (const item of data.users) {
        await prisma.user.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    // 4. 產品
    if (data.products?.length > 0) {
      console.log(`📦 導入產品: ${data.products.length} 筆`)
      for (const item of data.products) {
        await prisma.product.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    // 5. 庫存
    if (data.inventories?.length > 0) {
      console.log(`📋 導入庫存: ${data.inventories.length} 筆`)
      for (const item of data.inventories) {
        await prisma.inventory.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    // 6. 庫存變動記錄
    if (data.inventoryTransactions?.length > 0) {
      console.log(`📝 導入庫存變動記錄: ${data.inventoryTransactions.length} 筆`)
      for (const item of data.inventoryTransactions) {
        try {
          await prisma.inventoryTransaction.create({ data: item })
        } catch (e) {
          // 忽略重複錯誤
        }
      }
    }

    // 7. 客戶
    if (data.customers?.length > 0) {
      console.log(`👤 導入客戶: ${data.customers.length} 筆`)
      for (const item of data.customers) {
        await prisma.customer.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    // 8. 訂單
    if (data.orders?.length > 0) {
      console.log(`🛒 導入訂單: ${data.orders.length} 筆`)
      for (const item of data.orders) {
        await prisma.gasOrder.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    // 9. 訂單明細
    if (data.orderItems?.length > 0) {
      console.log(`📋 導入訂單明細: ${data.orderItems.length} 筆`)
      for (const item of data.orderItems) {
        await prisma.gasOrderItem.create({
          data: item,
          skipDuplicates: true
        })
      }
    }

    // 10. 支票
    if (data.checks?.length > 0) {
      console.log(`💳 導入支票: ${data.checks.length} 筆`)
      for (const item of data.checks) {
        await prisma.check.upsert({
          where: { id: item.id },
          update: item,
          create: item
        })
      }
    }

    // 11. 其他記錄
    const otherTables = [
      { name: '成本記錄', key: 'costRecords', model: 'costRecord' },
      { name: '來電記錄', key: 'callRecords', model: 'callRecord' },
      { name: '配送記錄', key: 'deliveryRecords', model: 'deliveryRecord' },
      { name: '抄錶記錄', key: 'meterReadings', model: 'meterReading' },
      { name: '月結報表', key: 'monthlyStatements', model: 'monthlyStatement' },
      { name: 'LINE 群組', key: 'lineGroups', model: 'lineGroup' },
      { name: 'LINE 訊息', key: 'lineMessages', model: 'lineMessage' },
      { name: '會計同步', key: 'accountingSyncs', model: 'accountingSync' },
    ]

    for (const table of otherTables) {
      if (data[table.key]?.length > 0) {
        console.log(`📝 導入${table.name}: ${data[table.key].length} 筆`)
        for (const item of data[table.key]) {
          try {
            await prisma[table.model].create({ data: item })
          } catch (e) {
            // 忽略重複錯誤
          }
        }
      }
    }

    console.log('\n✅ 數據導入完成！')

    // 驗證導入結果
    const counts = {
      users: await prisma.user.count(),
      customers: await prisma.customer.count(),
      products: await prisma.product.count(),
      inventories: await prisma.inventory.count(),
      orders: await prisma.gasOrder.count(),
    }

    console.log('\n📊 導入後統計:')
    console.log(`   用戶: ${counts.users}`)
    console.log(`   客戶: ${counts.customers}`)
    console.log(`   產品: ${counts.products}`)
    console.log(`   庫存: ${counts.inventories}`)
    console.log(`   訂單: ${counts.orders}`)

  } catch (error) {
    console.error('\n❌ 導入失敗:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

importToDocker()
  .then(() => {
    console.log('\n✅ 導入完成！')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 導入失敗:', error)
    process.exit(1)
  })
