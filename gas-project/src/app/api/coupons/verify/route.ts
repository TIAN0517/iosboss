import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/coupons/verify - 验证优惠券是否可用
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, orderAmount } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const coupon = await db.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon not found',
      });
    }

    // 检查优惠券状态
    const now = new Date();
    if (!coupon.isActive) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon is inactive',
      });
    }

    if (new Date(coupon.validFrom) > now) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon not yet valid',
      });
    }

    if (new Date(coupon.validTo) < now) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon has expired',
      });
    }

    // 检查使用次数
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({
        valid: false,
        error: 'Coupon usage limit reached',
      });
    }

    // 检查最低消费金额
    if (coupon.minAmount && orderAmount && orderAmount < coupon.minAmount) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount is NT$${coupon.minAmount}`,
      });
    }

    // 计算折扣金额
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderAmount || 0) * (coupon.discountValue / 100);
      // 应用最高折扣限制
      if (coupon.maxAmount && discountAmount > coupon.maxAmount) {
        discountAmount = coupon.maxAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount,
      message: `Coupon applied! You save NT$${discountAmount.toLocaleString()}`,
    });
  } catch (error) {
    console.error('Failed to verify coupon:', error);
    return NextResponse.json(
      { error: 'Failed to verify coupon' },
      { status: 500 }
    );
  }
}
