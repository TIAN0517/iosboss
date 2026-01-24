import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, extractToken } from '@/lib/auth'

// 認證檢查輔助函數
function requireAuth(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

// 獲取庫存變動記錄
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const transactions = await db.inventoryTransaction.findMany({
      where: {
        ...(productId && { productId }),
        ...(type && { type }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            capacity: true,
            unit: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 1000), // 最多 1000 條
      skip: offset,
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching inventory transactions:', error)
    return NextResponse.json(
      { error: '獲取庫存變動記錄失敗' },
      { status: 500 }
    )
  }
}
