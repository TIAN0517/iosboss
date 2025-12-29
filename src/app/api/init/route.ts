import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// 初始化系統數據 - 九九瓦斯行管理系統 2025
// 僅創建老闆娘帳號，其他人無法登入
export async function POST() {
  try {
    // 僅創建老闆娘（管理員）帳號
    const existingAdmin = await db.user.findFirst({
      where: { role: 'admin' },
    })

    let adminInfo = null

    if (!existingAdmin) {
      // 創建老闆娘帳號
      const adminPassword = 'Uu19700413'
      const hashedPassword = await hashPassword(adminPassword)

      const admin = await db.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          email: 'admin@bossai.jytian.it.com',
          name: '老闆娘',
          role: 'admin',
          phone: '0912345678',
          department: 'management',
          isActive: true,
        },
      })

      adminInfo = {
        username: admin.username,
        password: adminPassword,
        name: admin.name,
        email: admin.email,
        warning: '⚠️ 這是老闆娘專屬帳號，請妥善保管密碼！'
      }
    } else {
      adminInfo = {
        username: existingAdmin.username,
        name: existingAdmin.name,
        email: existingAdmin.email,
        note: '老闆娘帳號已存在'
      }
    }

    // 檢查是否已初始化產品
    const existingProducts = await db.product.count()
    if (existingProducts > 0) {
      return NextResponse.json(
        {
          message: '系統已初始化',
          admin: adminInfo,
        },
        { status: 200 }
      )
    }

    // 1. 創建產品分類
    const categories = [
      { name: '瓦斯', description: '桶裝瓦斯產品' },
      { name: '爐具', description: '瓦斯爐、電磁爐等' },
      { name: '熱水器', description: '瓦斯熱水器、電熱水器' },
      { name: '配件', description: '瓦斯相關配件' },
    ]

    const gasCategory = await db.productCategory.create({
      data: { name: '瓦斯', description: '桶裝瓦斯產品' },
    })

    const stoveCategory = await db.productCategory.create({
      data: { name: '爐具', description: '瓦斯爐、電磁爐等' },
    })

    const heaterCategory = await db.productCategory.create({
      data: { name: '熱水器', description: '瓦斯熱水器、電熱水器' },
    })

    const accessoriesCategory = await db.productCategory.create({
      data: { name: '配件', description: '瓦斯相關配件' },
    })

    // 2. 創建瓦斯產品（2025年台灣參考價格）
    const gasProducts = [
      { name: '4kg 桶裝瓦斯', code: 'GAS-04', price: 220, cost: 170, capacity: '4kg', unit: '桶' },
      { name: '10kg 桶裝瓦斯', code: 'GAS-10', price: 360, cost: 280, capacity: '10kg', unit: '桶' },
      { name: '16kg 桶裝瓦斯', code: 'GAS-16', price: 550, cost: 420, capacity: '16kg', unit: '桶' },
      { name: '20kg 標準桶裝瓦斯', code: 'GAS-20', price: 620, cost: 470, capacity: '20kg', unit: '桶' },
      { name: '20kg 高級桶裝瓦斯', code: 'GAS-20P', price: 730, cost: 550, capacity: '20kg', unit: '桶' },
      { name: '50kg 商用桶裝瓦斯', code: 'GAS-50', price: 1550, cost: 1200, capacity: '50kg', unit: '桶' },
    ]

    for (const product of gasProducts) {
      const newProduct = await db.product.create({
        data: {
          categoryId: gasCategory.id,
          name: product.name,
          code: product.code,
          price: product.price,
          cost: product.cost,
          capacity: product.capacity,
          unit: product.unit,
        },
      })

      // 創建庫存記錄
      await db.inventory.create({
        data: {
          productId: newProduct.id,
          quantity: 0,
          minStock: 10,
        },
      })
    }

    // 3. 創建爐具產品（2025年台灣參考價格）
    const stoveProducts = [
      { name: '卡式瓦斯爐 2.9KW', code: 'STO-001', price: 350, cost: 280, unit: '台' },
      { name: '單口傳統瓦斯爐', code: 'STO-002', price: 2500, cost: 2000, unit: '台' },
      { name: '雙口傳統瓦斯爐', code: 'STO-003', price: 3200, cost: 2500, unit: '台' },
      { name: '三口IH電磁爐', code: 'STO-004', price: 5880, cost: 4700, unit: '台' },
      { name: '雙口IH電磁爐', code: 'STO-005', price: 4600, cost: 3600, unit: '台' },
      { name: '智慧感應雙口爐', code: 'STO-006', price: 39770, cost: 32000, unit: '台' },
    ]

    for (const product of stoveProducts) {
      const newProduct = await db.product.create({
        data: {
          categoryId: stoveCategory.id,
          name: product.name,
          code: product.code,
          price: product.price,
          cost: product.cost,
          unit: product.unit,
        },
      })

      await db.inventory.create({
        data: {
          productId: newProduct.id,
          quantity: 0,
          minStock: 5,
        },
      })
    }

    // 4. 創建熱水器產品（2025年台灣參考價格）
    const heaterProducts = [
      { name: '屋外型10L瓦斯熱水器', code: 'HT-010', price: 5490, cost: 4400, capacity: '10L', unit: '台' },
      { name: '屋內型12L強排熱水器', code: 'HT-012', price: 15000, cost: 12000, capacity: '12L', unit: '台' },
      { name: '屋內型13L強排熱水器', code: 'HT-013', price: 16500, cost: 13200, capacity: '13L', unit: '台' },
      { name: '屋內型16L強排熱水器', code: 'HT-016', price: 20350, cost: 16200, capacity: '16L', unit: '台' },
      { name: '16L智能恆溫強排熱水器', code: 'HT-016S', price: 20900, cost: 16700, capacity: '16L', unit: '台' },
      { name: '儲熱式電熱水器 20加侖', code: 'HT-E020', price: 12000, cost: 9500, capacity: '20加侖', unit: '台' },
    ]

    for (const product of heaterProducts) {
      const newProduct = await db.product.create({
        data: {
          categoryId: heaterCategory.id,
          name: product.name,
          code: product.code,
          price: product.price,
          cost: product.cost,
          capacity: product.capacity,
          unit: product.unit,
        },
      })

      await db.inventory.create({
        data: {
          productId: newProduct.id,
          quantity: 0,
          minStock: 3,
        },
      })
    }

    // 5. 創建配件產品
    const accessoryProducts = [
      { name: '瓦斯調節器', code: 'ACC-001', price: 150, cost: 120, unit: '個' },
      { name: '瓦斯管', code: 'ACC-002', price: 100, cost: 75, unit: '條' },
      { name: '瓦斯桶架', code: 'ACC-003', price: 200, cost: 150, unit: '組' },
    ]

    for (const product of accessoryProducts) {
      const newProduct = await db.product.create({
        data: {
          categoryId: accessoriesCategory.id,
          name: product.name,
          code: product.code,
          price: product.price,
          cost: product.cost,
          unit: product.unit,
        },
      })

      await db.inventory.create({
        data: {
          productId: newProduct.id,
          quantity: 0,
          minStock: 20,
        },
      })
    }

    // 6. 創建客戶分組
    const groups = [
      { name: '一般客戶', discount: 0, description: '標準客戶，無折扣', creditTerm: null },
      { name: '現金客戶', discount: 0.02, description: '現金付款，享2%折扣', creditTerm: null },
      { name: 'VIP客戶', discount: 0.05, description: 'VIP客戶，享5%折扣', creditTerm: 7 },
      { name: '月結客戶', discount: 0.03, description: '月結客戶，享3%折扣', creditTerm: 30 },
      { name: '批發商', discount: 0.1, description: '批發商，享10%折扣', creditTerm: null },
    ]

    for (const group of groups) {
      await db.customerGroup.create({
        data: {
          name: group.name,
          discount: group.discount,
          description: group.description,
          creditTerm: group.creditTerm,
        },
      })
    }

    return NextResponse.json(
      {
        message: '九九瓦斯行管理系統 2025 初始化完成',
        admin: adminInfo,
        summary: {
          products: gasProducts.length + stoveProducts.length + heaterProducts.length + accessoryProducts.length,
          gasProducts: gasProducts.length,
          stoveProducts: stoveProducts.length,
          heaterProducts: heaterProducts.length,
          customerGroups: groups.length,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error initializing system:', error)
    return NextResponse.json(
      { error: '初始化失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// 檢查初始化狀態
export async function GET() {
  try {
    const productsCount = await db.product.count()
    const groupsCount = await db.customerGroup.count()
    const categoriesCount = await db.productCategory.count()

    return NextResponse.json({
      initialized: productsCount > 0,
      productsCount,
      groupsCount,
      categoriesCount,
      systemName: '九九瓦斯行管理系統',
      version: '2025 Pro',
    })
  } catch (error) {
    console.error('Error checking initialization:', error)
    return NextResponse.json(
      { error: '檢查失敗' },
      { status: 500 }
    )
  }
}
