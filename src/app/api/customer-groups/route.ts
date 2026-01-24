'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customer-groups - 獲取所有客戶分組
export async function GET(request: NextRequest) {
  try {
    const groups = await db.customerGroup.findMany({
      include: {
        _count: {
          select: { customers: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('獲取客戶分組失敗:', error)
    return NextResponse.json(
      { error: '獲取客戶分組失敗' },
      { status: 500 }
    )
  }
}

// POST /api/customer-groups - 創建新分組
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, discount, description, creditTerm } = body

    if (!name) {
      return NextResponse.json(
        { error: '分組名稱為必填項' },
        { status: 400 }
      )
    }

    const group = await db.customerGroup.create({
      data: {
        name,
        discount: discount ? parseFloat(discount) : 0,
        description: description || null,
        creditTerm: creditTerm ? parseInt(creditTerm) : null,
      }
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('創建客戶分組失敗:', error)
    return NextResponse.json(
      { error: '創建客戶分組失敗' },
      { status: 500 }
    )
  }
}
