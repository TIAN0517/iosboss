import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/coupons - 获取所有可用优惠券
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
      // 查询特定优惠券
      const coupon = await db.coupon.findUnique({
        where: { code },
      });

      if (!coupon) {
        return NextResponse.json(
          { error: 'Coupon not found' },
          { status: 404 }
        );
      }

      // 检查优惠券是否有效
      const now = new Date();
      if (!coupon.isActive || new Date(coupon.validFrom) > now || new Date(coupon.validTo) < now) {
        return NextResponse.json(
          { error: 'Coupon is expired or inactive' },
          { status: 400 }
        );
      }

      // 检查使用次数限制
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return NextResponse.json(
          { error: 'Coupon usage limit reached' },
          { status: 400 }
        );
      }

      return NextResponse.json(coupon);
    } else {
      // 查询所有可用优惠券
      const coupons = await db.coupon.findMany({
        where: {
          isActive: true,
          validTo: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(coupons);
    }
  } catch (error) {
    console.error('Failed to fetch coupons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coupons' },
      { status: 500 }
    );
  }
}

// POST /api/coupons - 创建新优惠券（管理员功能）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, description, discountType, discountValue, minAmount, maxAmount, usageLimit, validTo } = body;

    if (!code || !name || !discountType || !discountValue) {
      return NextResponse.json(
        { error: 'code, name, discountType, and discountValue are required' },
        { status: 400 }
      );
    }

    const coupon = await db.coupon.create({
      data: {
        code,
        name,
        description,
        discountType,
        discountValue,
        minAmount,
        maxAmount,
        usageLimit,
        validTo: validTo ? new Date(validTo) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        validFrom: new Date(),
        isActive: true,
        usedCount: 0,
      },
    });

    return NextResponse.json(coupon);
  } catch (error) {
    console.error('Failed to create coupon:', error);
    return NextResponse.json(
      { error: 'Failed to create coupon' },
      { status: 500 }
    );
  }
}
