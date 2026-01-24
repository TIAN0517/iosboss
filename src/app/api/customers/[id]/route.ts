'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/customers/[id] - 更新客戶
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, phone, address, paymentType, groupId, note, creditLimit } = body

    const customer = await db.customer.update({
      where: { id: params.id },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        address: address !== undefined ? address : undefined,
        paymentType: paymentType || undefined,
        groupId: groupId !== undefined ? groupId : null,
        note: note !== undefined ? note : null,
        creditLimit: creditLimit !== undefined ? parseFloat(creditLimit) : undefined,
      },
      include: {
        group: true
      }
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('更新客戶失敗:', error)
    return NextResponse.json(
      { error: '更新客戶失敗' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - 刪除客戶
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.customer.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('刪除客戶失敗:', error)
    return NextResponse.json(
      { error: '刪除客戶失敗' },
      { status: 500 }
    )
  }
}
