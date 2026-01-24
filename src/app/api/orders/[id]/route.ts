'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/orders/[id] - 更新訂單
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, deliveryAddress, note } = body

    const order = await db.gasOrder.update({
      where: { id: params.id },
      data: {
        status: status || undefined,
        deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : undefined,
        note: note !== undefined ? note : undefined,
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

    return NextResponse.json(order)
  } catch (error) {
    console.error('更新訂單失敗:', error)
    return NextResponse.json(
      { error: '更新訂單失敗' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - 刪除訂單
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.gasOrder.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('刪除訂單失敗:', error)
    return NextResponse.json(
      { error: '刪除訂單失敗' },
      { status: 500 }
    )
  }
}
