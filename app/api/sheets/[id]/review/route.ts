/**
 * 休假表审核 API
 * /api/sheets/[id]/review
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const { action, note, reviewedBy } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的审核操作',
        },
        { status: 400 }
      )
    }

    // 查找休假表
    const sheet = await db.scheduleSheet.findUnique({
      where: { id },
      include: {
        stations: {
          include: {
            employees: true,
          },
        },
      },
    })

    if (!sheet) {
      return NextResponse.json(
        {
          success: false,
          error: '找不到休假表',
        },
        { status: 404 }
      )
    }

    if (sheet.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: '此休假表已被审核',
        },
        { status: 400 }
      )
    }

    // 更新状态
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const updated = await db.scheduleSheet.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: reviewedBy || 'admin',
        note: note || null,
      },
    })

    // 发送通知
    const { sendLineNotification } = await import('@/lib/notification-service')
    await sendLineNotification({
      type: action === 'approve' ? 'schedule_approved' : 'schedule_rejected',
      sheetId: id,
      year: sheet.year,
      month: sheet.month,
      reviewedBy: reviewedBy || 'admin',
      status: newStatus,
      note: note,
    })

    return NextResponse.json({
      success: true,
      sheet: updated,
      message: action === 'approve' ? '已通过审核' : '已拒绝',
    })
  } catch (error: any) {
    console.error('[Schedule Review API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
