'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/orders - 獲取所有訂單（支持分頁）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const cursor = searchParams.get('cursor')

    const where: any = {}
    if (status) where.status = status
    if (customerId) where.customerId = customerId

    // 計算分頁
    const skip = (page - 1) * limit

    const [orders, total] = await Promise.all([
      db.gasOrder.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true }
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // 獲取多一條來判斷是否有下一頁
        skip: cursor ? undefined : skip,
        cursor: cursor ? { id: cursor } : undefined
      }),
      db.gasOrder.count({ where })
    ])

    // 判斷是否有下一頁
    let hasNextPage = false
    if (orders.length > limit) {
      const nextItem = orders.pop()
      hasNextPage = true
    }

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error('獲取訂單列表失敗:', error)
    return NextResponse.json(
      { error: '獲取訂單列表失敗' },
      { status: 500 }
    )
  }
}

// POST /api/orders - 創建新訂單
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, items, status, deliveryAddress, note } = body

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: '客戶ID和訂單項目為必填項' },
        { status: 400 }
      )
    }

    // 計算總金額
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity)
    }, 0)

    // 處理每個訂單項目
    const orderItems = items.map((item: any) => ({
      productId: item.productId,
      quantity: parseInt(item.quantity),
      price: parseFloat(item.price),
      subtotal: parseFloat(item.price) * parseInt(item.quantity)
    }))

    const order = await db.gasOrder.create({
      data: {
        customerId,
        totalAmount,
        status: status || 'pending',
        deliveryAddress: deliveryAddress || null,
        note: note || null,
        items: {
          create: orderItems
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('創建訂單失敗:', error)
    return NextResponse.json(
      { error: '創建訂單失敗' },
      { status: 500 }
    )
  }
}
