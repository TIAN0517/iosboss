import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 獲取成本分析報表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (type) where.type = type
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const costRecords = await db.costRecord.findMany({
      where,
      include: {
        items: true,
        recordedByUser: true,
      },
      orderBy: { date: 'desc' },
    })

    // 計算總成本
    const totalCost = costRecords.reduce((sum, record) => sum + record.amount, 0)

    // 按類型分組統計
    const costByType = costRecords.reduce((acc, record) => {
      acc[record.type] = (acc[record.type] || 0) + record.amount
      return acc
    }, {} as Record<string, number>)

    // 按分類分組統計
    const costByCategory = costRecords.reduce((acc, record) => {
      acc[record.category] = (acc[record.category] || 0) + record.amount
      return acc
    }, {} as Record<string, number>)

    // 計算營業額（用於利潤分析）
    const orders = await db.gasOrder.findMany({
      where: {
        ...(startDate && { orderDate: { gte: new Date(startDate) } }),
        ...(endDate && { orderDate: { lte: new Date(endDate) } }),
        status: 'completed',
      },
    })

    const revenue = orders.reduce((sum, order) => sum + order.total, 0)

    // 計算利潤
    const profit = revenue - totalCost
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

    return NextResponse.json({
      summary: {
        totalCost,
        revenue,
        profit,
        profitMargin: profitMargin.toFixed(2),
        orderCount: orders.length,
      },
      costByType,
      costByCategory,
      records: costRecords,
    })
  } catch (error) {
    console.error('Error analyzing costs:', error)
    return NextResponse.json(
      { error: '成本分析失敗' },
      { status: 500 }
    )
  }
}
