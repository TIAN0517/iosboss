'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/ecommerce/orders/[orderNo]
 * 獲取訂單詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await params

    if (!orderNo) {
      return NextResponse.json({ error: '訂單編號為必填' }, { status: 400 })
    }

    const order = await db.shopOrder.findUnique({
      where: { orderNo },
      include: {
        items: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: '訂單不存在' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('獲取訂單詳情失敗:', error)
    return NextResponse.json({ error: '獲取訂單詳情失敗' }, { status: 500 })
  }
}
