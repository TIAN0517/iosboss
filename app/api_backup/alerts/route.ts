import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * 智能提醒系統 API
 * 提供庫存不足、支票到期、月結帳單等提醒
 */
export async function GET(request: NextRequest) {
  try {
    const alerts: Array<{
      id: string
      type: 'inventory' | 'check' | 'payment' | 'order'
      title: string
      message: string
      severity: 'low' | 'medium' | 'high' | 'urgent'
      action?: string
      actionUrl?: string
      createdAt: Date
    }> = []

    // 1. 庫存不足提醒
    const lowStockItems = await db.inventory.findMany({
      where: {
        quantity: {
          lte: db.inventory.fields.minStock,
        },
      },
      include: {
        product: true,
      },
    })

    lowStockItems.forEach((item) => {
      alerts.push({
        id: `inv-${item.id}`,
        type: 'inventory',
        title: '🔔 庫存不足警告',
        message: `${item.product?.name || '產品'} 庫存只剩 ${item.quantity}${item.product?.unit || '桶'}，低於最低庫存 ${item.minStock}${item.product?.unit || '桶'}`,
        severity: item.quantity === 0 ? 'urgent' : item.quantity <= item.minStock / 2 ? 'high' : 'medium',
        action: '補貨',
        actionUrl: '/inventory',
        createdAt: new Date(),
      })
    })

    // 2. 支票即將到期提醒（7天內）
    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    const upcomingChecks = await db.check.findMany({
      where: {
        checkDate: {
          lte: sevenDaysLater,
        },
        status: {
          in: ['pending', 'deposited'],
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        checkDate: 'asc',
      },
    })

    upcomingChecks.forEach((check) => {
      const daysUntilDue = Math.ceil((check.checkDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const urgency = daysUntilDue <= 1 ? 'urgent' : daysUntilDue <= 3 ? 'high' : 'medium'

      alerts.push({
        id: `check-${check.id}`,
        type: 'check',
        title: daysUntilDue <= 0 ? '⚠️ 支票已到期' : `📅 支票 ${daysUntilDue} 天後到期`,
        message: `${check.customer?.name || '客戶'} 的支票 NT$${check.amount.toLocaleString()}，${check.bankName || '未知銀行'}，到期日：${new Date(check.checkDate).toLocaleDateString('zh-TW')}`,
        severity: urgency,
        action: '查看支票',
        actionUrl: '/checks',
        createdAt: new Date(),
      })
    })

    // 3. 月結客戶逾期未付款提醒
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const overdueCustomers = await db.customer.findMany({
      where: {
        paymentType: 'monthly',
        orders: {
          some: {
            createdAt: {
              lte: thirtyDaysAgo,
            },
            paidAmount: {
              lt: 999999, // 簡化：查找有未付款的訂單
            },
          },
        },
      },
      include: {
        orders: {
          where: {
            createdAt: {
              lte: thirtyDaysAgo,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    })

    overdueCustomers.forEach((customer) => {
      const lastOrder = customer.orders[0]
      const daysOverdue = Math.floor((Date.now() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24))

      alerts.push({
        id: `payment-${customer.id}`,
        type: 'payment',
        title: '💰 逾期未付款提醒',
        message: `${customer.name} ${customer.phone} 已逾期 ${daysOverdue} 天未結算`,
        severity: daysOverdue > 60 ? 'urgent' : daysOverdue > 30 ? 'high' : 'medium',
        action: '查看客戶',
        actionUrl: `/customers/${customer.id}`,
        createdAt: new Date(),
      })
    })

    // 4. 待配送訂單提醒
    const pendingOrders = await db.gasOrder.findMany({
      where: {
        status: {
          in: ['pending', 'processing'],
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // 如果有超過 5 筆待配送訂單，發出提醒
    if (pendingOrders.length > 5) {
      alerts.push({
        id: 'orders-pending',
        type: 'order',
        title: '📦 待配送訂單累積',
        message: `目前有 ${pendingOrders.length} 筆訂單待配送，請盡快安排`,
        severity: pendingOrders.length > 20 ? 'urgent' : pendingOrders.length > 10 ? 'high' : 'medium',
        action: '查看訂單',
        actionUrl: '/orders',
        createdAt: new Date(),
      })
    }

    // 5. 今日大額訂單提醒（超過 $5000）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const largeOrdersToday = await db.gasOrder.findMany({
      where: {
        createdAt: {
          gte: today,
          lte: todayEnd,
        },
        total: {
          gte: 5000,
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        total: 'desc',
      },
    })

    if (largeOrdersToday.length > 0) {
      const totalRevenue = largeOrdersToday.reduce((sum, order) => sum + order.total, 0)
      alerts.push({
        id: 'orders-large-today',
        type: 'order',
        title: '🎉 今日大額訂單',
        message: `今日已有 ${largeOrdersToday.length} 筆大額訂單，總金額 NT$${totalRevenue.toLocaleString()}`,
        severity: 'low',
        action: '查看詳情',
        actionUrl: '/orders',
        createdAt: new Date(),
      })
    }

    // 按嚴重程度排序
    const severityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      alerts,
      summary: {
        total: alerts.length,
        urgent: alerts.filter((a) => a.severity === 'urgent').length,
        high: alerts.filter((a) => a.severity === 'high').length,
        medium: alerts.filter((a) => a.severity === 'medium').length,
        low: alerts.filter((a) => a.severity === 'low').length,
      },
    })
  } catch (error) {
    console.error('Error loading alerts:', error)
    return NextResponse.json({ error: '載入提醒失敗' }, { status: 500 })
  }
}
