'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/calls - 獲取來電記錄
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const limit = searchParams.get('limit')

    const where: any = {}
    if (customerId) where.customerId = customerId

    const calls = await db.callRecord.findMany({
      where,
      include: {
        customer: true
      },
      orderBy: { callTime: 'desc' },
      take: limit ? parseInt(limit) : undefined
    })

    return NextResponse.json(calls)
  } catch (error) {
    console.error('獲取來電記錄失敗:', error)
    return NextResponse.json(
      { error: '獲取來電記錄失敗' },
      { status: 500 }
    )
  }
}

// POST /api/calls - 創建來電記錄
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, customerId, status, duration, notes } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { error: '電話號碼為必填項' },
        { status: 400 }
      )
    }

    const call = await db.callRecord.create({
      data: {
        phoneNumber,
        customerId: customerId || null,
        status: status || 'missed',
        duration: duration ? parseInt(duration) : null,
        notes: notes || null,
        callTime: new Date()
      },
      include: {
        customer: true
      }
    })

    return NextResponse.json(call, { status: 201 })
  } catch (error) {
    console.error('創建來電記錄失敗:', error)
    return NextResponse.json(
      { error: '創建來電記錄失敗' },
      { status: 500 }
    )
  }
}
