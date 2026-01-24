'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/costs - 獲取所有成本記錄
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const costs = await db.costRecord.findMany({
      where,
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(costs)
  } catch (error) {
    console.error('獲取成本記錄失敗:', error)
    return NextResponse.json(
      { error: '獲取成本記錄失敗' },
      { status: 500 }
    )
  }
}

// POST /api/costs - 創建新成本記錄
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, amount, description, date } = body

    if (!category || !amount) {
      return NextResponse.json(
        { error: '類別和金額為必填項' },
        { status: 400 }
      )
    }

    const cost = await db.costRecord.create({
      data: {
        category,
        amount: parseFloat(amount),
        description: description || null,
        date: date ? new Date(date) : new Date(),
      }
    })

    return NextResponse.json(cost, { status: 201 })
  } catch (error) {
    console.error('創建成本記錄失敗:', error)
    return NextResponse.json(
      { error: '創建成本記錄失敗' },
      { status: 500 }
    )
  }
}
