'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/ecommerce/coupons
 * 獲取所有有效的優惠券
 */
export async function GET(request: NextRequest) {
  try {
    const now = new Date()

    const coupons = await db.coupon.findMany({
      where: {
        isActive: true,
        expiresAt: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('獲取優惠券失敗:', error)
    return NextResponse.json({ error: '獲取優惠券失敗' }, { status: 500 })
  }
}

/**
 * POST /api/ecommerce/coupons
 * 驗證優惠券
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, cartAmount } = body

    if (!code) {
      return NextResponse.json({ error: '缺少優惠券代碼' }, { status: 400 })
    }

    const coupon = await db.coupon.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!coupon) {
      return NextResponse.json({ valid: false, error: '優惠券不存在' }, { status: 404 })
    }

    // 檢查優惠券是否有效
    const now = new Date()
    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, error: '優惠券已停用' }, { status: 400 })
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      return NextResponse.json({ valid: false, error: '優惠券已過期' }, { status: 400 })
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, error: '優惠券使用次數已達上限' }, { status: 400 })
    }

    if (coupon.minOrder && cartAmount < coupon.minOrder) {
      return NextResponse.json({
        valid: false,
        error: `最低消費金額為 NT$${coupon.minOrder.toLocaleString()}`
      }, { status: 400 })
    }

    // 計算折扣金額
    let discountAmount = 0
    if (coupon.type === 'percentage') {
      discountAmount = cartAmount * (coupon.value / 100)
    } else {
      discountAmount = coupon.value
    }

    // 限制最高折扣金額
    if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
      discountAmount = coupon.maxDiscount
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        ...coupon,
        discountType: coupon.type,
        discountValue: coupon.value,
        minAmount: coupon.minOrder,
        maxAmount: coupon.maxDiscount,
      },
      discountAmount: Math.round(discountAmount * 100) / 100,
    })
  } catch (error) {
    console.error('驗證優惠券失敗:', error)
    return NextResponse.json({ error: '驗證優惠券失敗' }, { status: 500 })
  }
}
