import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 台灣瓦斯器具零售價格（2025年資料）
const productPrices = [
  // ==================== 瓦斯熱水器 ====================
  {
    name: '林內屋外型10L瓦斯熱水器',
    code: 'RINNAI-RF-10L',
    category: '瓦斯熱水器',
    price: 9640,
    cost: 8000,
    capacity: '10公升',
    description: '屋外型自然排氣，適合一般家庭',
  },
  {
    name: '林內屋外型12L瓦斯熱水器',
    code: 'RINNAI-RF-12L',
    category: '瓦斯熱水器',
    price: 22000,
    cost: 18000,
    capacity: '12公升',
    description: '屋外型強制排氣，適合2-3人家庭',
  },
  {
    name: '林內屋內型16L瓦斯熱水器',
    code: 'RINNAI-RUA-D1600WF',
    category: '瓦斯熱水器',
    price: 20350,
    cost: 17000,
    capacity: '16公升',
    description: '屋內型強制排氣智慧控溫，適合3-4人家庭',
  },
  {
    name: '海爾16L恆溫熱水器',
    code: 'HAIER-16L',
    category: '瓦斯熱水器',
    price: 27900,
    cost: 23000,
    capacity: '16公升',
    description: '恆溫型水伺服UV殺菌，適合3-4人家庭',
  },
  {
    name: '林內24L大廈型熱水器',
    code: 'RINNAI-REU-A2426WF',
    category: '瓦斯熱水器',
    price: 47600,
    cost: 39000,
    capacity: '24公升',
    description: '屋內強制排氣型，適合5人以上家庭',
  },

  // ==================== 瓦斯爐 ====================
  {
    name: '林內雙口內焰瓦斯爐',
    code: 'RINNAI-RTS-N2701S',
    category: '瓦斯爐',
    price: 9000,
    cost: 7500,
    capacity: '2口',
    description: '台爐式內焰不鏽鋼雙口爐',
  },
  {
    name: '林內雙口玻璃瓦斯爐',
    code: 'RINNAI-RB-201GN',
    category: '瓦斯爐',
    price: 13700,
    cost: 11000,
    capacity: '2口',
    description: '檯面式內焰玻璃雙口爐',
  },
  {
    name: '櫻花雙內焰瓦斯爐',
    code: 'SAKURA-G2721G',
    category: '瓦斯爐',
    price: 12900,
    cost: 10500,
    capacity: '2口',
    description: '雙內焰檯面式瓦斯爐',
  },
  {
    name: '櫻花二口安全爐',
    code: 'SAKURA-G632K',
    category: '瓦斯爐',
    price: 5805,
    cost: 4800,
    capacity: '2口',
    description: '價格親民雙口火力，小家庭入門首選',
  },
  {
    name: '莊頭北內焰台爐',
    code: 'TOPAX-TG-7603',
    category: '瓦斯爐',
    price: 7940,
    cost: 6500,
    capacity: '2口',
    description: '內焰崁入式瓦斯爐',
  },
  {
    name: '林內三口瓦斯爐',
    code: 'RINNAI-RB-A3760G',
    category: '瓦斯爐',
    price: 24599,
    cost: 20000,
    capacity: '3口',
    description: '檯面式緻溫三口爐(定溫定時)',
  },

  // ==================== 桶裝瓦斯 ====================
  {
    name: '20公斤桶裝瓦斯',
    code: 'LPG-20KG',
    category: '桶裝瓦斯',
    price: 753,
    cost: 650,
    capacity: '20公斤',
    description: '全國平均價格，適合一般家庭1-2個月使用',
  },
  {
    name: '15公斤桶裝瓦斯',
    code: 'LPG-15KG',
    category: '桶裝瓦斯',
    price: 630,
    cost: 550,
    capacity: '15公斤',
    description: '住家15kg桶裝瓦斯',
  },
  {
    name: '50公斤商用桶裝瓦斯',
    code: 'LPG-50KG',
    category: '桶裝瓦斯',
    price: 2100,
    cost: 1800,
    capacity: '50公斤',
    description: '商用50kg瓦斯桶，適合餐廳使用',
  },

  // ==================== 瓦斯配件 ====================
  {
    name: '瓦斯調整器（高壓型）',
    code: 'REGULATOR-HIGH',
    category: '瓦斯配件',
    price: 400,
    cost: 250,
    capacity: '個',
    description: '20kg瓦斯桶用高壓型調整器',
  },
  {
    name: '瓦斯調整器（恆壓型）',
    code: 'REGULATOR-CONSTANT',
    category: '瓦斯配件',
    price: 900,
    cost: 600,
    capacity: '個',
    description: '恆壓型調整器，火力穩定',
  },
  {
    name: '瓦斯管（2米）',
    code: 'GAS-HOSE-2M',
    category: '瓦斯配件',
    price: 350,
    cost: 200,
    capacity: '2米',
    description: '橡膠瓦斯管，含接頭',
  },
  {
    name: '瓦斯管（3米）',
    code: 'GAS-HOSE-3M',
    category: '瓦斯配件',
    price: 450,
    cost: 280,
    capacity: '3米',
    description: '橡膠瓦斯管，含接頭',
  },
  {
    name: '銅管（1米）',
    code: 'COPPER-PIPE-1M',
    category: '瓦斯配件',
    price: 500,
    cost: 350,
    capacity: '1米',
    description: '銅管配管材料',
  },
  {
    name: '點火針',
    code: 'IGNITION-PIN',
    category: '瓦斯配件',
    price: 200,
    cost: 100,
    capacity: '個',
    description: '瓦斯爐點火針',
  },
  {
    name: '感應棒',
    code: 'THERMOCOUPLE',
    category: '瓦斯配件',
    price: 350,
    cost: 200,
    capacity: '個',
    description: '熄火保護感應棒',
  },
]

async function updateProductPrices() {
  console.log('開始更新產品價格...')

  let updated = 0
  let created = 0

  for (const productData of productPrices) {
    try {
      // 先查找產品類別
      let category = await prisma.productCategory.findFirst({
        where: { name: productData.category },
      })

      // 如果找不到，創建新類別
      if (!category) {
        category = await prisma.productCategory.create({
          data: {
            name: productData.category,
            description: `${productData.category}相關產品`,
            isActive: true,
          },
        })
        console.log(`✅ 建立新類別：${productData.category}`)
      }

      // 先查找是否有相同 code 的產品
      const existingProduct = await prisma.product.findFirst({
        where: { code: productData.code },
      })

      if (existingProduct) {
        // 更新現有產品
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: productData.name,
            categoryId: category.id,
            price: productData.price,
            cost: productData.cost,
            capacity: productData.capacity,
            unit: productData.category === '桶裝瓦斯' ? '桶' : '個',
            isActive: true,
          },
        })
        updated++
        console.log(`✏️ 更新：${productData.name} - NT$${productData.price}`)
      } else {
        // 創建新產品
        await prisma.product.create({
          data: {
            code: productData.code,
            name: productData.name,
            categoryId: category.id,
            price: productData.price,
            cost: productData.cost,
            capacity: productData.capacity,
            unit: productData.category === '桶裝瓦斯' ? '桶' : '個',
            isActive: true,
          },
        })
        created++
        console.log(`✅ 新增：${productData.name} - NT$${productData.price}`)
      }
    } catch (error) {
      console.error(`❌ 錯誤 ${productData.name}:`, error)
    }
  }

  console.log(`\n更新完成！`)
  console.log(`✏️ 更新產品：${updated} 筆`)
  console.log(`🆕 新增產品：${created} 筆`)
  console.log(`📊 總計：${updated + created} 筆`)
}

updateProductPrices()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
