'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/schedules - 獲取休假表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    const where: any = {}
    if (userId) where.userId = userId
    if (status) where.status = status

    const schedules = await db.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            department: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('獲取休假表失敗:', error)
    return NextResponse.json(
      { error: '獲取休假表失敗' },
      { status: 500 }
    )
  }
}

// POST /api/schedules - 創建休假申請
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, leaveType, startDate, endDate, reason } = body

    if (!userId || !leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { error: '用戶ID、休假類型、開始日期和結束日期為必填項' },
        { status: 400 }
      )
    }

    const schedule = await db.leaveRequest.create({
      data: {
        userId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        status: 'pending'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            department: true
          }
        }
      }
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error('創建休假申請失敗:', error)
    return NextResponse.json(
      { error: '創建休假申請失敗' },
      { status: 500 }
    )
  }
}
