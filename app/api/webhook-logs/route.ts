import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Webhook 發送日誌 API
 * 用於查看同步記錄和狀態
 */

// GET - 獲取 webhook 日誌
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const systemId = searchParams.get('systemId')
    const eventType = searchParams.get('eventType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (systemId) where.systemId = systemId
    if (eventType) where.eventType = eventType
    if (status) where.status = status

    const [logs, total] = await Promise.all([
      db.webhookLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.webhookLog.count({ where }),
    ])

    // 獲取系統名稱
    const systemIds = [...new Set(logs.map(l => l.systemId))]
    const systems = await db.externalSystem.findMany({
      where: { id: { in: systemIds } },
      select: { id: true, name: true },
    })

    const systemMap = new Map(systems.map(s => [s.id, s.name]))

    const enrichedLogs = logs.map(log => ({
      ...log,
      systemName: systemMap.get(log.systemId) || 'Unknown',
    }))

    return NextResponse.json({
      logs: enrichedLogs,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch logs', details: error.message },
      { status: 500 }
    )
  }
}
