/**
 * 休假表單筆 API
 * GET - 取得單筆休假表
 * PATCH - 更新休假表狀態（核准/拒絕）
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ========================================
// GET - 取得單筆休假表
// ========================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const sheet = await db.scheduleSheet.findUnique({
      where: { id },
      include: {
        stations: {
          include: {
            employees: {
              orderBy: { scheduleDate: 'asc' },
            },
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

    return NextResponse.json({
      success: true,
      sheet,
    })
  } catch (error: any) {
    console.error('[Schedule Sheet API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

// ========================================
// PATCH - 更新休假表狀態（核准/拒絕）
// ========================================
export async function PATCH(
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

    const { status, note } = body

    // 驗證狀態
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: '無效的狀態值',
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
          error: '此休假表已被審核',
        },
        { status: 400 }
      )
    }

    // 取得審核者資訊
    const reviewedBy = body.reviewedBy || 'admin'

    // 更新狀態
    const updated = await db.scheduleSheet.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy,
        note: note || null,
      },
    })

    // 發送 LINE 通知
    const { sendLineNotification } = await import('@/lib/notification-service')
    await sendLineNotification({
      type: status === 'approved' ? 'schedule_approved' : 'schedule_rejected',
      sheetId: id,
      year: sheet.year,
      month: sheet.month,
      reviewedBy,
      status,
      note: note,
    })

    return NextResponse.json({
      success: true,
      sheet: updated,
      message: status === 'approved' ? '已核准休假表' : '已拒絕休假表',
    })
  } catch (error: any) {
    console.error('[Schedule Sheet API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
