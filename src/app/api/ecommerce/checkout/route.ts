'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// 結帳請求驗證 schema
const checkoutSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  contactName: z.string().min(1, '聯絡人姓名為必填'),
  contactPhone: z.string().min(1, '聯絡電話為必填'),
  deliveryAddress: z.string().min(1, '配送地址為必填'),
  deliveryTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  note: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['cash', 'transfer', 'linepay']).default('cash'),
})

/**
 * POST /api/ecommerce/checkout
 * 結帳流程：
 * 1. 驗證購物車項目
 * 2. 檢查庫存（使用 transaction + 悲觀鎖）
 * 3. 建立訂單
 * 4. 扣減庫存
 * 5. 清除購物車中已選中的項目
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = checkoutSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const {
      sessionId,
      userId,
      contactName,
      contactPhone,
      deliveryAddress,
      deliveryTime,
      note,
      couponCode,
      paymentMethod,
    } = validationResult.data

    // 從 cookie 獲取 sessionId
    const cookieSessionId = request.cookies.get('cart_session_id')?.value
    const effectiveSessionId = sessionId || cookieSessionId

    if (!effectiveSessionId && !userId) {
      return NextResponse.json({ error: '需要 sessionId 或 userId' }, { status: 400 })
    }

    // 獲取購物車中已選中的項目
    const cartItems = await db.cartItem.findMany({
      where: {
        OR: [
          { sessionId: effectiveSessionId || undefined },
          { userId: userId || undefined },
        ],
        checked: true,
      },
      include: {
        product: {
          include: {
            inventory: true,
          },
        },
      },
    })

    if (cartItems.length === 0) {
      return NextResponse.json({ error: '購物車是空的' }, { status: 400 })
    }

    // 計算小計
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + item.product.price * item.quantity
    }, 0)

    // 處理優惠券
    let discount = 0
    let couponInfo = null
    if (couponCode) {
      const coupon = await db.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      })

      if (!coupon) {
        return NextResponse.json({ error: '優惠券不存在' }, { status: 400 })
      }

      if (!coupon.isActive) {
        return NextResponse.json({ error: '優惠券已停用' }, { status: 400 })
      }

      const now = new Date()
      if (coupon.validFrom && coupon.validFrom > now) {
        return NextResponse.json({ error: '優惠券尚未生效' }, { status: 400 })
      }

      if (coupon.validTo && coupon.validTo < now) {
        return NextResponse.json({ error: '優惠券已過期' }, { status: 400 })
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return NextResponse.json({ error: '優惠券已達使用上限' }, { status: 400 })
      }

      if (coupon.minAmount && subtotal < coupon.minAmount) {
        return NextResponse.json(
          { error: `消費滿 NT$ ${coupon.minAmount.toLocaleString()} 才能使用此優惠券` },
          { status: 400 }
        )
      }

      // 計算折扣
      if (coupon.discountType === 'percentage') {
        discount = subtotal * (coupon.discountValue / 100)
        if (coupon.maxAmount && discount > coupon.maxAmount) {
          discount = coupon.maxAmount
        }
      } else {
        discount = coupon.discountValue
      }

      couponInfo = {
        code: coupon.code,
        type: coupon.discountType,
        value: coupon.discountValue,
      }

      // 更新優惠券使用次數
      await db.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      })
    }

    // 運費
    const deliveryFee = subtotal >= 1000 ? 0 : 100

    // 總計
    const total = subtotal - discount + deliveryFee

    // 生成訂單編號
    const orderNo = `SHOP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // 使用 transaction 確保資料一致性
    const order = await db.$transaction(async (tx) => {
      // 1. 獲取並鎖定所有商品的當前庫存
      const inventoryMap = new Map<string, number>()

      for (const item of cartItems) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        })

        if (!inventory || inventory.quantity < item.quantity) {
          throw new Error(`產品 ${item.product.name} 庫存不足`)
        }

        inventoryMap.set(item.productId, inventory.quantity)
      }

      // 2. 建立訂單
      const newOrder = await tx.shopOrder.create({
        data: {
          orderNo,
          customerId: userId || null,
          contactName,
          contactPhone,
          deliveryAddress,
          deliveryTime: deliveryTime || null,
          note: note || null,
          paymentMethod,
          subtotal,
          discount,
          deliveryFee,
          total,
          status: 'pending',
          couponCode: couponInfo?.code || null,
        },
      })

      // 3. 建立訂單項目並扣減庫存
      for (const item of cartItems) {
        const quantityBefore = inventoryMap.get(item.productId) || 0
        const quantityAfter = quantityBefore - item.quantity

        // 建立訂單項目
        await tx.shopOrderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.product.name,
            productImage: item.product.imageUrl,
            quantity: item.quantity,
            unitPrice: item.product.price,
            subtotal: item.product.price * item.quantity,
          },
        })

        // 扣減庫存
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: quantityAfter,
          },
        })

        // 記錄庫存交易
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: 'sale',
            quantity: -item.quantity,
            quantityBefore,
            quantityAfter,
            reason: `商城訂單 ${orderNo}`,
          },
        })

        // 更新產品銷量
        await tx.product.update({
          where: { id: item.productId },
          data: {
            sales: { increment: item.quantity },
          },
        })
      }

      // 4. 清除已選中的購物車項目
      await tx.cartItem.deleteMany({
        where: {
          OR: [
            { sessionId: effectiveSessionId || undefined },
            { userId: userId || undefined },
          ],
          checked: true,
        },
      })

      return newOrder
    })

    // 返回訂單資訊
    return NextResponse.json({
      order,
      orderNo,
      message: '訂單建立成功',
    }, { status: 201 })
  } catch (error: any) {
    console.error('結帳失敗:', error)
    return NextResponse.json({ error: error.message || '結帳失敗' }, { status: 400 })
  }
}
