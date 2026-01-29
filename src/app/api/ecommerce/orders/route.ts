'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

// 查詢參數驗證
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
  userId: z.string().optional(),
})

/**
 * GET /api/ecommerce/orders
 * 獲取訂單列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    // 從 header 獲取當前用戶資訊
    const currentUserId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    const where: any = {}

    // 驗證狀態參數
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: '無效的訂單狀態' }, { status: 400 })
    }

    // 如果有 userId，則只返回該用戶的訂單
    if (userId) {
      // 非管理員只能查看自己的訂單
      if (userId !== currentUserId && !['admin', 'manager'].includes(userRole || '')) {
        return NextResponse.json({ error: '無權查看此訂單' }, { status: 403 })
      }
      where.customerId = userId
    } else if (!['admin', 'manager'].includes(userRole || '')) {
      // 普通用戶未指定 userId 時，查看自己的訂單
      where.customerId = currentUserId
    }

    // 狀態篩選
    if (status) {
      where.status = status
    }

    const [orders, total] = await Promise.all([
      db.shopOrder.findMany({
        where,
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.shopOrder.count({ where }),
    ])

    return NextResponse.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error('獲取訂單列表失敗:', error)
    return NextResponse.json({ error: '獲取訂單列表失敗' }, { status: 500 })
  }
}

/**
 * PUT /api/ecommerce/orders
 * 更新訂單狀態（僅限管理員）
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderNo, status } = body

    if (!orderNo || !status) {
      return NextResponse.json({ error: '訂單編號和狀態為必填' }, { status: 400 })
    }

    // 驗證狀態轉換
    const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: '無效的訂單狀態' }, { status: 400 })
    }

    // 檢查用戶權限（從 header 獲取）
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    // 只有管理員可以更新狀態
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      return NextResponse.json({ error: '無權限更新訂單狀態' }, { status: 403 })
    }

    const order = await db.shopOrder.findUnique({
      where: { orderNo },
    })

    if (!order) {
      return NextResponse.json({ error: '訂單不存在' }, { status: 404 })
    }

    // 驗證狀態轉換邏輯
    if (order.status === 'completed' || order.status === 'cancelled') {
      return NextResponse.json({ error: '已完成的訂單無法修改狀態' }, { status: 400 })
    }

    // 驗證狀態轉換順序
    const statusOrder = ['pending', 'paid', 'processing', 'shipped', 'completed']
    const currentIndex = statusOrder.indexOf(order.status)
    const newIndex = statusOrder.indexOf(status)

    // 允許跳過某些狀態（如直接標記為已完成），但禁止回退
    if (newIndex < currentIndex && status !== 'cancelled') {
      return NextResponse.json({ error: '不能將訂單狀態回退' }, { status: 400 })
    }

    // pending -> cancelled 是允許的
    if (order.status === 'pending' && status === 'cancelled') {
      // 取消訂單，退還庫存
      await db.$transaction(async (tx) => {
        const items = await tx.shopOrderItem.findMany({
          where: { orderId: order.id },
        })

        for (const item of items) {
          const inventory = await tx.inventory.findUnique({
            where: { productId: item.productId },
          })

          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              quantity: { increment: item.quantity },
            },
          })

          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'return',
              quantity: item.quantity,
              quantityBefore: inventory?.quantity || 0,
              quantityAfter: (inventory?.quantity || 0) + item.quantity,
              reason: `取消訂單 ${orderNo}`,
            },
          })

          // 扣減銷量
          await tx.product.update({
            where: { id: item.productId },
            data: {
              sales: { decrement: item.quantity },
            },
          })
        }

        await tx.shopOrder.update({
          where: { orderNo },
          data: { status },
        })
      })
    } else {
      await db.shopOrder.update({
        where: { orderNo },
        data: {
          status,
          ...(status === 'paid' ? { paymentAt: new Date() } : {}),
        },
      })
    }

    const updatedOrder = await db.shopOrder.findUnique({
      where: { orderNo },
      include: { items: true },
    })

    return NextResponse.json({
      order: updatedOrder,
      message: '訂單狀態已更新',
    })
  } catch (error) {
    console.error('更新訂單失敗:', error)
    return NextResponse.json({ error: '更新訂單失敗' }, { status: 500 })
  }
}
