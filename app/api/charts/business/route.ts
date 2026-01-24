import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * 業務圖表數據 API
 * 提供各種圖表所需的數據
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 計算日期範圍（默認近30天）
    const end = endDate ? new Date(endDate) : new Date()
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // 並行獲取所有數據
    const [orders, costs, products] = await Promise.all([
      // 獲取訂單數據
      db.gasOrder.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
      // 獲取成本數據
      db.costRecord.findMany({
        where: {
          recordDate: {
            gte: start,
            lte: end,
          },
        },
        include: {
          items: true,
        },
      }),
      // 獲取所有產品
      db.product.findMany({
        include: {
          category: true,
        },
      }),
    ])

    // 1. 按月統計營收、成本、利潤
    const monthlyData = calculateMonthlyData(orders, costs)

    // 2. 熱銷商品排行
    const topProducts = calculateTopProducts(orders)

    // 3. 成本結構
    const costByCategory = calculateCostByCategory(costs)

    // 4. 每日營收
    const dailyRevenue = calculateDailyRevenue(orders)

    return NextResponse.json({
      revenueByMonth: monthlyData,
      topProducts,
      costByCategory,
      dailyRevenue,
    })
  } catch (error) {
    console.error('Error loading chart data:', error)
    return NextResponse.json({ error: '載入圖表數據失敗' }, { status: 500 })
  }
}

/**
 * 按月統計營收、成本、利潤
 */
function calculateMonthlyData(orders: any[], costs: any[]) {
  const monthlyMap = new Map<string, { revenue: number; cost: number; profit: number }>()

  // 初始化近6個月
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, { revenue: 0, cost: 0, profit: 0 })
  }

  // 統計訂單營收
  orders.forEach((order) => {
    const date = new Date(order.createdAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const current = monthlyMap.get(key) || { revenue: 0, cost: 0, profit: 0 }
    current.revenue += order.totalAmount

    // 計算成本
    let orderCost = 0
    order.items.forEach((item: any) => {
      orderCost += (item.product?.cost || 0) * item.quantity
    })
    current.cost += orderCost
    current.profit = current.revenue - current.cost

    monthlyMap.set(key, current)
  })

  // 加上其他成本
  costs.forEach((costRecord) => {
    const date = new Date(costRecord.recordDate)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const current = monthlyMap.get(key)
    if (current) {
      const additionalCost = costRecord.items.reduce((sum: number, item: any) => sum + item.amount, 0)
      current.cost += additionalCost
      current.profit = current.revenue - current.cost
    }
  })

  return Array.from(monthlyMap.entries()).map(([month, data]) => ({
    month,
    ...data,
  }))
}

/**
 * 計算熱銷商品
 */
function calculateTopProducts(orders: any[]) {
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()

  orders.forEach((order) => {
    order.items.forEach((item: any) => {
      const productName = item.product?.name || '未知產品'
      const current = productMap.get(productName) || { name: productName, quantity: 0, revenue: 0 }
      current.quantity += item.quantity
      current.revenue += item.quantity * (item.product?.price || 0)
      productMap.set(productName, current)
    })
  })

  return Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
}

/**
 * 計算成本結構
 */
function calculateCostByCategory(costs: any[]) {
  const categoryMap = new Map<string, number>()

  costs.forEach((costRecord) => {
    const category = costRecord.category || '其他'
    const total = costRecord.items.reduce((sum: number, item: any) => sum + item.amount, 0)
    categoryMap.set(category, (categoryMap.get(category) || 0) + total)
  })

  return Array.from(categoryMap.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * 計算每日營收
 */
function calculateDailyRevenue(orders: any[]) {
  const dailyMap = new Map<string, number>()

  // 初始化最近30天
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const key = date.toISOString().split('T')[0]
    dailyMap.set(key, 0)
  }

  orders.forEach((order) => {
    const date = new Date(order.createdAt).toISOString().split('T')[0]
    dailyMap.set(date, (dailyMap.get(date) || 0) + order.totalAmount)
  })

  return Array.from(dailyMap.entries()).map(([date, revenue]) => ({
    date: new Date(date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
    revenue,
  }))
}
