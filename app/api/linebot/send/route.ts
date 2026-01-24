import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

/**
 * LINE Bot 發送消息 API
 * POST /api/linebot/send
 * 發送消息到指定群組
 */

// LINE Bot 配置
const LINE_CONFIG = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  pushEndpoint: 'https://api.line.me/v2/bot/message/push',
}

// 驗證管理員權限
async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const user = await verifyAuth(token)

  if (!user || user.role !== 'admin') {
    return null
  }

  return user
}

// POST - 發送消息到群組
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
    }
    const { groupId, message, messageType = 'text' } = body

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // 檢查群組是否存在且激活
    const group = await db.lineGroup.findUnique({
      where: { groupId },
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (!group.isActive) {
      return NextResponse.json({ error: 'Group is not active' }, { status: 400 })
    }

    // 發送消息到 LINE 群組
    const response = await fetch(LINE_CONFIG.pushEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CONFIG.channelAccessToken}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [
          {
            type: messageType,
            text: message,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LINE API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to send message via LINE API', details: errorText },
        { status: 500 }
      )
    }

    // 保存發送記錄
    await db.lineMessage.create({
      data: {
        lineGroupId: groupId,
        userId: user.id,
        messageType: 'text',
        content: message,
        intent: 'broadcast',
        timestamp: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        groupId,
        groupName: group.groupName,
        messageType,
        timestamp: new Date(),
      },
    })
  } catch (error: any) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    )
  }
}

// GET - 獲取可用的群組列表（用於發送消息時選擇）
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groups = await db.lineGroup.findMany({
      where: { isActive: true },
      select: {
        id: true,
        groupId: true,
        groupName: true,
        groupType: true,
        memberCount: true,
      },
      orderBy: { groupName: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: groups,
    })
  } catch (error: any) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups', details: error.message },
      { status: 500 }
    )
  }
}
