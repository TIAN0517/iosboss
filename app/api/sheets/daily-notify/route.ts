// ========================================
// 每日休假通知 API
// 每天早上发送当天休假名单到老板群组
// ========================================

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID

export async function GET(request: NextRequest) {
  try {
    // 验证权限（简单验证，生产环境需要更严格的认证）
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.JWT_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
        status: 'approved', // 只发送已批准的休假表
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
        success: true,
        message: '今天没有休假人员',
        data: { date: today, employees: [] },
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

    if (todayEmployees.length === 0) {
      return NextResponse.json({
        success: true,
        message: '今天没有休假人员',
        data: { date: today, employees: [] },
      })
    }

    // 发送 LINE 通知到老板群组
    if (LINE_CHANNEL_ACCESS_TOKEN && LINE_ADMIN_GROUP_ID) {
      const message = buildDailyNotifyMessage(today, todayEmployees)

      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: LINE_ADMIN_GROUP_ID,
          messages: [
            {
              type: 'text',
              text: message,
            },
          ],
        }),
      })
    }

    return NextResponse.json({
      success: true,
      message: `已发送今日休假通知（${todayEmployees.length}人）`,
      data: {
        date: today,
        employees: todayEmployees,
      },
    })
  } catch (error: any) {
    console.error('[Daily Notify] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * 构建每日休假通知消息
 */
function buildDailyNotifyMessage(
  date: string,
  employees: Array<{
    station: string
    name: string
    date: string
    isHalfDay: boolean
    note?: string
  }>
): string {
  // 格式化日期
  const dateObj = new Date(date)
  const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`

  let message = `📅 **今日休假通知**\n\n`
  message += `日期：${formattedDate}\n\n`

  // 按站点分组
  const byStation = new Map<string, typeof employees>()
  for (const emp of employees) {
    if (!byStation.has(emp.station)) {
      byStation.set(emp.station, [])
    }
    byStation.get(emp.station)!.push(emp)
  }

  // 列出每个站点的休假人员
  for (const [station, emps] of byStation) {
    message += `🏠 ${station}站\n`
    for (const emp of emps) {
      const halfDayMark = emp.isHalfDay ? ` (${emp.note || '半天'})` : ''
      message += `  • ${emp.name}${halfDayMark}\n`
    }
    message += '\n'
  }

  message += `---\n`
  message += `总计：${employees.length} 人休假\n`
  message += `\n请安排代班人员。`

  return message
}
