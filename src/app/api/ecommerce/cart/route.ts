'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/ecommerce/cart?sessionId=xxx&userId=xxx
 * 獲取購物車內容
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const userId = searchParams.get('userId')

    if (!sessionId && !userId) {
      return NextResponse.json({ error: '需要 sessionId 或 userId' }, { status: 400 })
    }

    const cartItems = await db.cartItem.findMany({
      where: {
        OR: [
          { sessionId: sessionId || undefined },
          { userId: userId || undefined },
        ],
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 計算總金額
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    )

    return NextResponse.json({
      items: cartItems,
      summary: {
        itemCount: cartItems.length,
        totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
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
 * 新增商品到購物車
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity, sessionId, userId } = body

    if (!productId || !quantity) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    if (!sessionId && !userId) {
      return NextResponse.json({ error: '需要 sessionId 或 userId' }, { status: 400 })
    }

    // 檢查產品是否存在
    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: '產品不存在' }, { status: 404 })
    }

    // 檢查是否已在購物車中
    const existingItem = await db.cartItem.findFirst({
      where: {
        productId,
        ...(userId ? { userId } : { sessionId }),
      },
    })

    let cartItem
    if (existingItem) {
      // 更新數量
      cartItem = await db.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
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
          sessionId: sessionId || undefined,
          userId: userId || undefined,
        },
        include: {
          product: true,
        },
      })
    }

    return NextResponse.json({
      cartItem,
      message: '已加入購物車',
    })
  } catch (error) {
    console.error('加入購物車失敗:', error)
    return NextResponse.json({ error: '加入購物車失敗' }, { status: 500 })
  }
}

/**
 * PUT /api/ecommerce/cart
 * 更新購物車商品數量
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { cartItemId, quantity } = body

    if (!cartItemId || quantity === undefined) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 })
    }

    if (quantity < 1) {
      return NextResponse.json({ error: '數量必須大於 0' }, { status: 400 })
    }

    const cartItem = await db.cartItem.update({
      where: { id: cartItemId },
      data: { quantity },
      include: {
        product: true,
      },
    })

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
