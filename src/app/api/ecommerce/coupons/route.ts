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
        validFrom: { lte: now },
        validTo: { gte: now },
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
 * POST /api/ecommerce/coupons/validate
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

    if (coupon.validFrom > now) {
      return NextResponse.json({ valid: false, error: '優惠券尚未生效' }, { status: 400 })
    }

    if (coupon.validTo < now) {
      return NextResponse.json({ valid: false, error: '優惠券已過期' }, { status: 400 })
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, error: '優惠券使用次數已達上限' }, { status: 400 })
    }

    if (coupon.minAmount && cartAmount < coupon.minAmount) {
      return NextResponse.json({
        valid: false,
        error: `最低消費金額為 NT$${coupon.minAmount.toLocaleString()}`
      }, { status: 400 })
    }

    // 計算折扣金額
    let discountAmount = 0
    if (coupon.discountType === 'percentage') {
      discountAmount = cartAmount * (coupon.discountValue / 100)
    } else {
      discountAmount = coupon.discountValue
    }

    // 限制最高折扣金額
    if (coupon.maxAmount && discountAmount > coupon.maxAmount) {
      discountAmount = coupon.maxAmount
    }

    return NextResponse.json({
      valid: true,
      coupon,
      discountAmount: Math.round(discountAmount * 100) / 100,
    })
  } catch (error) {
    console.error('驗證優惠券失敗:', error)
    return NextResponse.json({ error: '驗證優惠券失敗' }, { status: 500 })
  }
}
