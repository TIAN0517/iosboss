/**
 * 休假表管理 API
 * 支持审核、查询、通知等功能
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ========================================
// GET - 查询休假表列表
// ========================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // pending, approved, rejected
    const limit = parseInt(searchParams.get('limit') || '10')

    const where: any = {}
    if (status) {
      where.status = status
    }

    const sheets = await db.scheduleSheet.findMany({
      where,
      include: {
        stations: {
          include: {
            employees: {
              orderBy: { scheduleDate: 'asc' },
            },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: limit,
    })

    return NextResponse.json({
      success: true,
      sheets,
      count: sheets.length,
    })
  } catch (error: any) {
    console.error('[Schedule Sheets API] Error:', error)
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
// POST - 提交新的休假表
// ========================================
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const { text, submittedBy } = body

    if (!text) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少休假表内容',
        },
        { status: 400 }
      )
    }

    // 导入解析器
    const { parseScheduleSheet, detectScheduleSheet } = await import('@/lib/schedule-parser')

    // 检测是否为休假表格式
    if (!detectScheduleSheet(text)) {
      return NextResponse.json(
        {
          success: false,
          error: '不是有效的休假表格式',
        },
        { status: 400 }
      )
    }

    // 解析休假表
    const parsed = parseScheduleSheet(text)
    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          error: '解析休假表失败',
        },
        { status: 400 }
      )
    }

    // 检查是否已存在相同年月的休假表
    const existing = await db.scheduleSheet.findUnique({
      where: {
        year_month: {
          year: parsed.year,
          month: parsed.month,
        },
      },
    })

    if (existing) {
      // 更新现有休假表
      await db.scheduleStation.deleteMany({
        where: { sheetId: existing.id },
      })

      // 保存新的休假数据
      for (const station of parsed.stations) {
        const dbStation = await db.scheduleStation.create({
          data: {
            sheetId: existing.id,
            stationName: station.stationName,
          },
        })

        for (const employee of station.employees) {
          for (const dateInfo of employee.dates) {
            await db.employeeSchedule.create({
              data: {
                stationId: dbStation.id,
                employeeName: employee.employeeName,
                scheduleDate: dateInfo.date,
                displayDate: dateInfo.displayDate,
                isHalfDay: dateInfo.isHalfDay,
                isMorning: dateInfo.isMorning,
                note: dateInfo.note,
              },
            })
          }
        }
      }

      // 更新休假表
      const updated = await db.scheduleSheet.update({
        where: { id: existing.id },
        data: {
          rawText: parsed.rawText,
          submittedAt: new Date(),
          submittedBy: submittedBy || 'line_bot',
          status: 'pending',
          reviewedAt: null,
          reviewedBy: null,
          note: null,
        },
      })

      return NextResponse.json({
        success: true,
        sheet: updated,
        message: '休假表已更新',
      })
    }

    // 保存新的休假表
    const saved = await db.scheduleSheet.create({
      data: {
        year: parsed.year,
        month: parsed.month,
        title: parsed.title,
        rawText: parsed.rawText,
        status: 'pending',
        submittedBy: submittedBy || 'line_bot',
      },
    })

    // 保存各站点的休假数据
    for (const station of parsed.stations) {
      const dbStation = await db.scheduleStation.create({
        data: {
          sheetId: saved.id,
          stationName: station.stationName,
        },
      })

      // 保存员工休假数据
      for (const employee of station.employees) {
        for (const dateInfo of employee.dates) {
          await db.employeeSchedule.create({
            data: {
              stationId: dbStation.id,
              employeeName: employee.employeeName,
              scheduleDate: dateInfo.date,
              displayDate: dateInfo.displayDate,
              isHalfDay: dateInfo.isHalfDay,
              isMorning: dateInfo.isMorning,
              note: dateInfo.note,
            },
          })
        }
      }
    }

    // 发送通知到老板群组
    const { sendLineNotification } = await import('@/lib/notification-service')
    await sendLineNotification({
      type: 'schedule_submitted',
      sheetId: saved.id,
      year: saved.year,
      month: saved.month,
      submittedBy: submittedBy || 'LINE Bot',
      status: saved.status,
    })

    return NextResponse.json({
      success: true,
      sheet: saved,
      message: '休假表已提交并通知老板审核',
    })
  } catch (error: any) {
    console.error('[Schedule Sheets API] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
