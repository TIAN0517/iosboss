import { NextRequest, NextResponse } from 'next/server'

// 獲取店家統計
export async function GET(request: NextRequest) {
  try {
    const { db } = await import('@/lib/db')
    
    const stores = await db.store.findMany()

    // 計算統計數據
    const totalStores = stores.length
    const storesWithPhone = stores.filter(s => s.phoneNumber).length
    const storesWithAddress = stores.filter(s => s.address).length
    const storesWithImage = stores.filter(s => s.imageUrl).length
    const storesWithLineAccount = stores.filter(s => s.lineAccount).length
    const lineActiveStores = stores.filter(s => s.lineActive === true).length
    const lineInactiveStores = stores.filter(s => s.lineActive === false).length
    const unverifiedStores = stores.filter(s => s.lineActive === null).length

    // 按地點統計
    const locationStats: Record<string, number> = {}
    stores.forEach(store => {
      const location = store.location || '未知'
      locationStats[location] = (locationStats[location] || 0) + 1
    })

    // 計算完整度分數
    const averageCompleteness = stores.reduce((sum, store) => {
      let score = 0
      if (store.name) score += 25
      if (store.phoneNumber) score += 25
      if (store.address) score += 25
      if (store.imageUrl) score += 15
      if (store.lineAccount || store.lineActive) score += 10
      return sum + score
    }, 0) / stores.length

    // 按建立時間統計（最近7天、30天）
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const storesLast7Days = stores.filter(s => 
      s.createdAt && new Date(s.createdAt) >= sevenDaysAgo
    ).length

    const storesLast30Days = stores.filter(s => 
      s.createdAt && new Date(s.createdAt) >= thirtyDaysAgo
    ).length

    return NextResponse.json({
      success: true,
      stats: {
        overview: {
          totalStores,
          storesWithPhone,
          storesWithAddress,
          storesWithImage,
          storesWithLineAccount,
          averageCompleteness: Math.round(averageCompleteness),
        },
        lineStats: {
          lineActive: lineActiveStores,
          lineInactive: lineInactiveStores,
          unverified: unverifiedStores,
          verificationRate: totalStores > 0 ? Math.round((lineActiveStores / totalStores) * 100) : 0,
        },
        locationDistribution: locationStats,
        timeDistribution: {
          last7Days: storesLast7Days,
          last30Days: storesLast30Days,
        },
      },
    })
  } catch (error) {
    console.error('Error getting stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: '獲取統計時發生錯誤',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
