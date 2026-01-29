'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customers - 獲取所有客戶（支持分頁和搜索）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const groupId = searchParams.get('groupId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 計算分頁
    const skip = (page - 1) * limit

    // 構建搜索條件
    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { address: { contains: search } }
      ]
    }
    if (groupId) where.groupId = groupId

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: {
          group: {
            select: { id: true, name: true, discount: true }
          },
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip
      }),
      db.customer.count({ where })
    ])

    return NextResponse.json({
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    })
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
