'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/monthly - 獲取月結帳單
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const where: any = {}

    if (customerId) where.customerId = customerId
    if (year) where.year = parseInt(year)
    if (month) where.month = parseInt(month)

    const statements = await db.monthlyStatement.findMany({
      where,
      include: {
        customer: true
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    })

    return NextResponse.json(statements)
  } catch (error) {
    console.error('獲取月結帳單失敗:', error)
    return NextResponse.json(
      { error: '獲取月結帳單失敗' },
      { status: 500 }
    )
  }
}

// POST /api/monthly - 創新月結帳單
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, year, month, startDate, endDate } = body

    if (!customerId || !year || !month) {
      return NextResponse.json(
        { error: '客戶ID、年份和月份為必填項' },
        { status: 400 }
      )
    }

    // 獲取該月份的所有訂單
    const orders = await db.gasOrder.findMany({
      where: {
        customerId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    })

    // 計算總金額
    const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)

    // 檢查是否已存在該月的帳單
    const existing = await db.monthlyStatement.findFirst({
      where: {
        customerId,
        year: parseInt(year),
        month: parseInt(month)
      }
    })

    let statement

    if (existing) {
      // 更新現有帳單
      statement = await db.monthlyStatement.update({
        where: { id: existing.id },
        data: {
          totalAmount,
          orderCount: orders.length,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
        include: {
          customer: true
        }
      })
    } else {
      // 創建新帳單
      statement = await db.monthlyStatement.create({
        data: {
          customerId,
          year: parseInt(year),
          month: parseInt(month),
          totalAmount,
          orderCount: orders.length,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'pending'
        },
        include: {
          customer: true
        }
      })
    }

    return NextResponse.json(statement, { status: 201 })
  } catch (error) {
    console.error('創建月結帳單失敗:', error)
    return NextResponse.json(
      { error: '創建月結帳單失敗' },
      { status: 500 }
    )
  }
}
