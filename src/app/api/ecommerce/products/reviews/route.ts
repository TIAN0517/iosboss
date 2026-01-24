'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/ecommerce/products/reviews?productId=xxx
 * 獲取產品評論列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: '缺少產品ID' }, { status: 400 })
    }

    const reviews = await db.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // 計算平均評分
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

    return NextResponse.json({
      reviews,
      stats: {
        count: reviews.length,
        averageRating: Math.round(avgRating * 10) / 10,
      },
    })
  } catch (error) {
    console.error('獲取評論失敗:', error)
    return NextResponse.json({ error: '獲取評論失敗' }, { status: 500 })
  }
}

/**
 * POST /api/ecommerce/products/reviews
 * 新增產品評論
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, userName, rating, comment } = body

    if (!productId || !userName || !rating) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: '評分必須在 1-5 之間' }, { status: 400 })
    }

    const review = await db.productReview.create({
      data: {
        productId,
        userName,
        rating,
        comment: comment || '',
      },
    })

    // 更新產品平均評分
    const allReviews = await db.productReview.findMany({
      where: { productId },
    })
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length

    await db.product.update({
      where: { id: productId },
      data: { rating: Math.round(avgRating * 10) / 10 },
    })

    return NextResponse.json({ review, message: '評論已提交' })
  } catch (error) {
    console.error('新增評論失敗:', error)
    return NextResponse.json({ error: '新增評論失敗' }, { status: 500 })
  }
}
