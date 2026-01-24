// ========================================
// 今日休假查询 API
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // 获取当前日期（台湾时区）
    const now = new Date()
    const taiwanTime = new Date(now.getTime() + 8 * 60 * 60 * 1000)
    const today = taiwanTime.toISOString().split('T')[0]

    // 查找当前月份已批准的休假表
    const currentYear = taiwanTime.getFullYear()
    const currentMonth = taiwanTime.getMonth() + 1

    const schedule = await db.scheduleSheet.findUnique({
      where: {
        year_month: {
          year: currentYear,
          month: currentMonth,
        },
        status: 'approved',
      },
      include: {
        stations: {
          include: {
            employees: {
              where: {
                scheduleDate: {
                  gte: new Date(today + 'T00:00:00.000Z'),
                  lt: new Date(today + 'T23:59:59.999Z'),
                },
              },
            },
          },
        },
      },
    })

    if (!schedule) {
      return NextResponse.json({
        date: today,
        employees: [],
        message: '今天没有休假人员',
      })
    }

    // 收集今天休假的人员
    const todayEmployees: Array<{
      station: string
      name: string
      date: string
      isHalfDay: boolean
      note?: string
    }> = []

    for (const station of schedule.stations) {
      for (const emp of station.employees) {
        todayEmployees.push({
          station: station.stationName,
          name: emp.employeeName,
          date: emp.displayDate,
          isHalfDay: emp.isHalfDay,
          note: emp.note,
        })
      }
    }

    return NextResponse.json({
      date: today,
      employees: todayEmployees,
      count: todayEmployees.length,
    })
  } catch (error: any) {
    console.error('[Today Off] Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
