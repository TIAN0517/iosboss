'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// 驗證 schema
const addToCartSchema = z.object({
  productId: z.string().min(1, '產品ID為必填'),
  quantity: z.number().int().min(1, '數量必須大於0'),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
})

const updateCartSchema = z.object({
  cartItemId: z.string().min(1),
  quantity: z.number().int().min(0, '數量不能為負數'),
  checked: z.boolean().optional(),
})

/**
 * GET /api/ecommerce/cart?sessionId=xxx&userId=xxx
 * 獲取購物車內容
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const userId = searchParams.get('userId')

    // 支援從 cookie 獲取 sessionId
    const cookieSessionId = request.cookies.get('cart_session_id')?.value

    if (!sessionId && !userId && !cookieSessionId) {
      return NextResponse.json({ error: '需要 sessionId 或 userId' }, { status: 400 })
    }

    const effectiveSessionId = sessionId || cookieSessionId

    const cartItems = await db.cartItem.findMany({
      where: {
        OR: [
          { sessionId: effectiveSessionId || undefined },
          { userId: userId || undefined },
        ],
        // 只返回選中的項目用於結帳
        // checked: true,
      },
      include: {
        product: {
          include: {
            category: true,
            inventory: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 計算總金額（只計算選中的項目）
    const checkedItems = cartItems.filter(item => item.checked)
    const subtotal = checkedItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )

    const totalItems = checkedItems.reduce((sum, item) => sum + item.quantity, 0)

    return NextResponse.json({
      items: cartItems,
      summary: {
        itemCount: cartItems.length,
        checkedItemCount: checkedItems.length,
        totalItems,
        subtotal: Math.round(subtotal * 100) / 100,
      },
    })
  } catch (error) {
    console.error('獲取購物車失敗:', error)
    return NextResponse.json({ error: '獲取購物車失敗' }, { status: 500 })
  }
}

/**
 * POST /api/ecommerce/cart
 * 新增商品到購物車（支援庫存檢查）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = addToCartSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { productId, quantity, sessionId, userId } = validationResult.data

    // 從 cookie 獲取 sessionId
    const cookieSessionId = request.cookies.get('cart_session_id')?.value
    const effectiveSessionId = sessionId || cookieSessionId

    if (!effectiveSessionId && !userId) {
      return NextResponse.json({ error: '需要 sessionId 或 userId' }, { status: 400 })
    }

    // 檢查產品是否存在且上架中
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    })

    if (!product) {
      return NextResponse.json({ error: '產品不存在' }, { status: 404 })
    }

    if (!product.isActive) {
      return NextResponse.json({ error: '產品已下架' }, { status: 400 })
    }

    // 庫存檢查
    const currentStock = product.inventory?.quantity || 0
    const existingCartItem = await db.cartItem.findFirst({
      where: {
        productId,
        ...(userId ? { userId } : { sessionId: effectiveSessionId }),
      },
    })

    const newQuantity = existingCartItem
      ? existingCartItem.quantity + quantity
      : quantity

    if (newQuantity > currentStock) {
      return NextResponse.json(
        { error: `庫存不足，目前庫存: ${currentStock}` },
        { status: 400 }
      )
    }

    let cartItem
    if (existingCartItem) {
      // 更新數量
      cartItem = await db.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: newQuantity,
        },
        include: {
          product: true,
        },
      })
    } else {
      // 新增到購物車
      cartItem = await db.cartItem.create({
        data: {
          productId,
          quantity,
          sessionId: effectiveSessionId || undefined,
          userId: userId || undefined,
          checked: true,
        },
        include: {
          product: true,
        },
      })
    }

    // 構造響應並設置 session cookie
    const response = NextResponse.json({
      cartItem,
      message: '已加入購物車',
    })

    // 如果沒有 cookie sessionId，設置一個
    if (!cookieSessionId && effectiveSessionId) {
      response.cookies.set('cart_session_id', effectiveSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 天
        path: '/',
      })
    }

    return response
  } catch (error) {
    console.error('加入購物車失敗:', error)
    return NextResponse.json({ error: '加入購物車失敗' }, { status: 500 })
  }
}

/**
 * PUT /api/ecommerce/cart
 * 更新購物車商品數量或勾選狀態
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = updateCartSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { cartItemId, quantity, checked } = validationResult.data

    const updateData: any = {}
    if (quantity !== undefined) updateData.quantity = quantity
    if (checked !== undefined) updateData.checked = checked

    const cartItem = await db.cartItem.update({
      where: { id: cartItemId },
      data: updateData,
      include: {
        product: {
          include: {
            inventory: true,
          },
        },
      },
    })

    // 如果是增加數量，檢查庫存
    if (quantity !== undefined) {
      const currentStock = cartItem.product.inventory?.quantity || 0
      if (quantity > currentStock) {
        return NextResponse.json(
          { error: `庫存不足，目前庫存: ${currentStock}` },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({
      cartItem,
      message: '購物車已更新',
    })
  } catch (error) {
    console.error('更新購物車失敗:', error)
    return NextResponse.json({ error: '更新購物車失敗' }, { status: 500 })
  }
}

/**
 * DELETE /api/ecommerce/cart?cartItemId=xxx
 * 從購物車移除商品
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cartItemId = searchParams.get('cartItemId')

    if (!cartItemId) {
      return NextResponse.json({ error: '缺少購物車項目ID' }, { status: 400 })
    }

    await db.cartItem.delete({
      where: { id: cartItemId },
    })

    return NextResponse.json({ message: '商品已從購物車移除' })
  } catch (error) {
    console.error('移除購物車商品失敗:', error)
    return NextResponse.json({ error: '移除購物車商品失敗' }, { status: 500 })
  }
}
