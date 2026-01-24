'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/checks - 獲取所有支票記錄
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: any = {}
    if (status) where.status = status

    const checks = await db.check.findMany({
      where,
      orderBy: { checkDate: 'desc' }
    })

    return NextResponse.json(checks)
  } catch (error) {
    console.error('獲取支票列表失敗:', error)
    return NextResponse.json(
      { error: '獲取支票列表失敗' },
      { status: 500 }
    )
  }
}

// POST /api/checks - 創建新支票記錄
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      checkNumber,
      bank,
      amount,
      checkDate,
      fromCustomer,
      customerId,
      status,
      note
    } = body

    if (!checkNumber || !bank || !amount || !checkDate) {
      return NextResponse.json(
        { error: '支票號碼、銀行、金額和日期為必填項' },
        { status: 400 }
      )
    }

    const check = await db.check.create({
      data: {
        checkNumber,
        bank,
        amount: parseFloat(amount),
        checkDate: new Date(checkDate),
        fromCustomer: fromCustomer || null,
        customerId: customerId || null,
        status: status || 'pending',
        note: note || null
      }
    })

    return NextResponse.json(check, { status: 201 })
  } catch (error) {
    console.error('創建支票記錄失敗:', error)
    return NextResponse.json(
      { error: '創建支票記錄失敗' },
      { status: 500 }
    )
  }
}
