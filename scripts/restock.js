// 庫存補貨腳本
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function restockInventory() {
  try {
    console.log('\n🔄 開始補貨...\n')

    // 獲取所有產品和當前庫存
    const inventories = await prisma.inventory.findMany({
      include: { product: true }
    })

    // 補貨數量配置 (產品名稱 -> 補貨數量)
    const restockAmounts = {
      // 瓦斯類 - 補到 50-100
      '4kg 桶裝瓦斯': 50,
      '10kg 桶裝瓦斯': 50,
      '16kg 桶裝瓦斯': 50,
      '20kg 標準桶裝瓦斯': 80,
      '20kg 高級桶裝瓦斯': 80,
      '50kg 商用桶裝瓦斯': 30,

      // 爐具類 - 補到 20
      '卡式瓦斯爐 2.9KW': 20,
      '單口傳統瓦斯爐': 20,
      '雙口傳統瓦斯爐': 20,
      '三口IH電磁爐': 10,
      '雙口IH電磁爐': 10,
      '智慧感應雙口爐': 10,

      // 熱水器類 - 補到 10-15
      '屋外型10L瓦斯熱水器': 15,
      '屋內型12L強排熱水器': 15,
      '屋內型13L強排熱水器': 15,
      '屋內型16L強排熱水器': 15,
      '16L智能恆溫強排熱水器': 10,
      '儲熱式電熱水器 20加侖': 10,

      // 配件類 - 補到 50-100
      '瓦斯調節器': 100,
      '瓦斯管': 100,
      '瓦斯桶架': 50
    }

    for (const inv of inventories) {
      const productName = inv.product.name
      const restockAmount = restockAmounts[productName] || 20
      const quantityBefore = inv.quantity
      const quantityAfter = restockAmount

      // 更新庫存
      await prisma.inventory.update({
        where: { id: inv.id },
        data: { quantity: quantityAfter }
      })

      // 記錄庫存變動
      await prisma.inventoryTransaction.create({
        data: {
          productId: inv.productId,
          type: 'restock',
          quantity: restockAmount,
          quantityBefore: quantityBefore,
          quantityAfter: quantityAfter,
          reason: '系統補貨'
        }
      })

      console.log(`✅ ${productName.padEnd(25)} ${quantityBefore} → ${quantityAfter}`)
    }

    // 統計補貨結果
    const totalAfter = await prisma.inventory.findMany()
    const totalQuantity = totalAfter.reduce((sum, inv) => sum + inv.quantity, 0)
    const lowStockCount = totalAfter.filter(inv => inv.quantity <= inv.minStock).length

    console.log('\n' + '='.repeat(50))
    console.log(`✅ 補貨完成！`)
    console.log(`   總庫存數量: ${totalQuantity}`)
    console.log(`   低庫存項目: ${lowStockCount}`)
    console.log('='.repeat(50) + '\n')

  } catch (error) {
    console.error('❌ 錯誤:', error.message)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

restockInventory()
