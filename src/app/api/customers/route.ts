'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customers - 獲取所有客戶
export async function GET(request: NextRequest) {
  try {
    const customers = await db.customer.findMany({
      include: {
        group: true,
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('獲取客戶列表失敗:', error)
    return NextResponse.json(
      { error: '獲取客戶列表失敗' },
      { status: 500 }
    )
  }
}

// POST /api/customers - 創建新客戶
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, address, paymentType, groupId, note, creditLimit } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: '姓名和電話為必填項' },
        { status: 400 }
      )
    }

    const customer = await db.customer.create({
      data: {
        name,
        phone,
        address: address || '',
        paymentType: paymentType || 'cash',
        groupId: groupId || null,
        note: note || null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
      },
      include: {
        group: true
      }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('創建客戶失敗:', error)
    return NextResponse.json(
      { error: '創建客戶失敗' },
      { status: 500 }
    )
  }
}
