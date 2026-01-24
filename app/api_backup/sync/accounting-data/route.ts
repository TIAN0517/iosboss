import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * 接收外部會計系統數據庫同步的 API
 * 支援客戶、訂單、庫存、付款等數據自動同步
 */

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const { type, data, apiKey } = body

    // 驗證 API Key
    const validKey = process.env.ACCOUNTING_SYNC_API_KEY
    if (validKey && apiKey !== validKey) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    let result: any = { success: true, synced: 0, errors: [] }

    switch (type) {
      case 'customers':
        result = await syncCustomers(data)
        break

      case 'orders':
        result = await syncOrders(data)
        break

      case 'products':
        result = await syncProducts(data)
        break

      case 'inventory':
        result = await syncInventory(data)
        break

      case 'payments':
        result = await syncPayments(data)
        break

      case 'full_sync':
        // 完整同步
        result = {
          customers: await syncCustomers(data.customers || []),
          orders: await syncOrders(data.orders || []),
          products: await syncProducts(data.products || []),
          inventory: await syncInventory(data.inventory || []),
        }
        break

      default:
        return NextResponse.json(
          { error: `Unknown sync type: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[AccountingSync] Error:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    )
  }
}

// ========================================
// 數據同步函數
// ========================================

/**
 * 同步客戶數據
 */
async function syncCustomers(customers: any[]) {
  let synced = 0
  const errors: string[] = []

  for (const customer of customers) {
    try {
      await db.customer.upsert({
        where: { phone: customer.phone },
        create: {
          name: customer.name,
          phone: customer.phone,
          address: customer.address || '',
          paymentType: customer.paymentType || 'cash',
          balance: customer.balance || 0,
        },
        update: {
          name: customer.name,
          address: customer.address,
          ...(customer.paymentType && { paymentType: customer.paymentType }),
          ...(customer.balance !== undefined && { balance: customer.balance }),
        },
      })
      synced++
    } catch (error: any) {
      errors.push(`客戶 ${customer.name}: ${error.message}`)
    }
  }

  return { synced, errors }
}

/**
 * 同步訂單數據
 */
async function syncOrders(orders: any[]) {
  let synced = 0
  const errors: string[] = []

  for (const order of orders) {
    try {
      // 先查找或創建客戶
      let customer = await db.customer.findUnique({
        where: { phone: order.customerPhone },
      })

      if (!customer && order.customerName) {
        customer = await db.customer.create({
          data: {
            name: order.customerName,
            phone: order.customerPhone,
            address: order.customerAddress || '',
            paymentType: order.paymentType || 'cash',
          },
        })
      }

      if (customer) {
        // 創建或更新訂單
        await db.gasOrder.upsert({
          where: { orderNo: order.orderNo },
          create: {
            orderNo: order.orderNo,
            customerId: customer.id,
            orderDate: order.orderDate ? new Date(order.orderDate) : new Date(),
            deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : undefined,
            status: order.status || 'pending',
            subtotal: order.subtotal || 0,
            discount: order.discount || 0,
            deliveryFee: order.deliveryFee || 0,
            total: order.total || 0,
            note: order.note || '來自會計系統同步',
          },
          update: {
            status: order.status,
            ...(order.total !== undefined && { total: order.total }),
            ...(order.paidAmount !== undefined && { paidAmount: order.paidAmount }),
          },
        })
        synced++
      }
    } catch (error: any) {
      errors.push(`訂單 ${order.orderNo}: ${error.message}`)
    }
  }

  return { synced, errors }
}

/**
 * 同步產品數據
 */
async function syncProducts(products: any[]) {
  let synced = 0
  const errors: string[] = []

  for (const product of products) {
    try {
      // 確保類別存在
      let category = await db.productCategory.findFirst({
        where: { name: product.category || '瓦斯' },
      })

      if (!category) {
        category = await db.productCategory.create({
          data: {
            name: product.category || '瓦斯',
            description: product.categoryDescription || '瓦斯產品',
          },
        })
      }

      // 創建或更新產品
      const result = await db.product.upsert({
        where: { code: product.code || `PROD-${Date.now()}` },
        create: {
          code: product.code || `PROD-${Date.now()}`,
          categoryId: category.id,
          name: product.name,
          price: product.price || 0,
          cost: product.cost || 0,
          capacity: product.capacity,
          unit: product.unit || '個',
        },
        update: {
          name: product.name,
          price: product.price,
          cost: product.cost,
          capacity: product.capacity,
        },
      })

      // 創建或更新庫存
      if (product.stock !== undefined) {
        await db.inventory.upsert({
          where: { productId: result.id },
          create: {
            productId: result.id,
            quantity: product.stock,
            minStock: product.minStock || 10,
          },
          update: {
            quantity: product.stock,
          },
        })
      }

      synced++
    } catch (error: any) {
      errors.push(`產品 ${product.name}: ${error.message}`)
    }
  }

  return { synced, errors }
}

/**
 * 同步庫存數據
 */
async function syncInventory(inventoryData: any[]) {
  let synced = 0
  const errors: string[] = []

  for (const item of inventoryData) {
    try {
      const product = await db.product.findFirst({
        where: {
          OR: [
            { code: item.productCode },
            { name: item.productName },
            { capacity: item.capacity },
          ],
        },
      })

      if (product) {
        await db.inventory.update({
          where: { productId: product.id },
          data: {
            quantity: item.quantity,
            ...(item.minStock !== undefined && { minStock: item.minStock }),
          },
        })
        synced++
      } else {
        errors.push(`找不到產品：${item.productName || item.productCode}`)
      }
    } catch (error: any) {
      errors.push(`庫存 ${item.productName}: ${error.message}`)
    }
  }

  return { synced, errors }
}

/**
 * 同步付款數據
 */
async function syncPayments(payments: any[]) {
  let synced = 0
  const errors: string[] = []

  for (const payment of payments) {
    try {
      const order = await db.gasOrder.findUnique({
        where: { orderNo: payment.orderNo },
      })

      if (order) {
        await db.gasOrder.update({
          where: { id: order.id },
          data: {
            paidAmount: { increment: payment.amount },
            status: payment.paidInFull ? 'completed' : order.status,
          },
        })
        synced++
      } else {
        errors.push(`找不到訂單：${payment.orderNo}`)
      }
    } catch (error: any) {
      errors.push(`付款 ${payment.orderNo}: ${error.message}`)
    }
  }

  return { synced, errors }
}

// GET - 獲取同步狀態
export async function GET() {
  try {
    // 獲取最近的同步記錄
    const syncLogs = await db.accountingSync.findMany({
      orderBy: { syncDate: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      syncLogs,
      config: {
        apiEndpoint: process.env.ACCOUNTING_SYNC_API_KEY ? '已配置' : '未配置',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get sync status', details: error.message },
      { status: 500 }
    )
  }
}
