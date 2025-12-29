import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// LINE Bot API - 九九瓦斯行管理系統 2025
// Jy技術團隊開發 - BossJy

interface LineGroup {
  groupId: string
  groupName: string
  groupType: string
  memberCount: number
  permissions: string[]
  isActive: boolean
}

interface LineMessage {
  type: 'text' | 'flex' | 'template'
  content: any
  to?: string | string[]
}

interface LineUser {
  userId: string
  displayName: string
  pictureUrl?: string
}

// LINE Bot 配置（從環境變量讀取）
const LINE_BOT_CONFIG = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'DEMO_ACCESS_TOKEN',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'DEMO_SECRET',
}

/**
 * 從數據庫獲取群組列表
 */
async function getGroupsFromDatabase(): Promise<LineGroup[]> {
  try {
    const groups = await db.lineGroup.findMany({
      where: { isActive: true },
      orderBy: { groupName: 'asc' },
    })

    return groups.map(g => ({
      groupId: g.groupId,
      groupName: g.groupName,
      groupType: g.groupType,
      memberCount: g.memberCount || 0,
      permissions: g.permissions as string[],
      isActive: g.isActive,
    }))
  } catch (error) {
    console.error('[LINE Bot] 從數據庫讀取群組失敗:', error)
    return []
  }
}

/**
 * 獲取單個群組
 */
async function getGroupFromDatabase(groupId: string): Promise<LineGroup | null> {
  try {
    const group = await db.lineGroup.findUnique({
      where: { groupId },
    })

    if (!group) return null

    return {
      groupId: group.groupId,
      groupName: group.groupName,
      groupType: group.groupType,
      memberCount: group.memberCount || 0,
      permissions: group.permissions as string[],
      isActive: group.isActive,
    }
  } catch (error) {
    console.error('[LINE Bot] 讀取群組失敗:', error)
    return null
  }
}

// 發送訊息到群組
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const { action, data } = body

    switch (action) {
      case 'sendToGroup': {
        const { groupId, type, content } = data
        return await sendToGroup(groupId, type, content)
      }

      case 'sendToUser': {
        const { userId, type, content } = data
        return await sendToUser(userId, type, content)
      }

      case 'broadcast': {
        const { type, content } = data
        return await broadcast(type, content)
      }

      case 'getGroups': {
        const groups = await getGroupsFromDatabase()
        return NextResponse.json({ groups, source: 'database' })
      }

      case 'getHistory': {
        const { limit = 50 } = data
        return await getMessageHistory(limit)
      }

      case 'syncGroups': {
        // 從 LINE API 同步群組到數據庫
        return await syncGroupsFromLINE()
      }

      default:
        return NextResponse.json(
          { error: '無效的操作' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('LINE Bot API Error:', error)
    return NextResponse.json(
      { error: 'LINE Bot操作失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// 發送訊息到群組
async function sendToGroup(groupId: string, type: string, content: any) {
  try {
    const group = await getGroupFromDatabase(groupId)
    if (!group) {
      return NextResponse.json(
        { error: '找不到該群組，請確認群組 ID 是否正確', hint: '將 LINE Bot 加入群組後系統會自動保存群組 ID' },
        { status: 404 }
      )
    }

    // 構建訊息
    const message: LineMessage = { type, content }

    // 實際實作時，使用LINE Messaging API
    // const response = await fetch('https://api.line.me/v2/bot/message/push', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${LINE_BOT_CONFIG.channelAccessToken}`,
    //   },
    //   body: JSON.stringify({
    //     to: groupId,
    //     messages: [message],
    //   }),
    // })

    // 模擬發送成功
    console.log(`[LINE Bot] 發送訊息到群組 ${group.groupName}:`, message)

    return NextResponse.json({
      success: true,
      message: '訊息發送成功',
      groupId,
      groupName: group.groupName,
      sentAt: new Date().toISOString(),
      messagePreview: type === 'text' ? content : JSON.stringify(content),
    })
  } catch (error) {
    console.error('發送訊息到群組失敗:', error)
    throw error
  }
}

// 發送訊息給用戶
async function sendToUser(userId: string, type: string, content: any) {
  try {
    const message: LineMessage = { type, content }

    // 實際實作時，使用LINE Messaging API
    console.log(`[LINE Bot] 發送訊息給用戶 ${userId}:`, message)

    return NextResponse.json({
      success: true,
      message: '訊息發送成功',
      userId,
      sentAt: new Date().toISOString(),
      messagePreview: type === 'text' ? content : JSON.stringify(content),
    })
  } catch (error) {
    console.error('發送訊息給用戶失敗:', error)
    throw error
  }
}

// 廣播訊息到所有群組
async function broadcast(type: string, content: any) {
  try {
    const groups = await getGroupsFromDatabase()

    console.log(`[LINE Bot] 廣播訊息到 ${groups.length} 個群組`)

    return NextResponse.json({
      success: true,
      message: '廣播發送成功',
      groups: groups.map(g => ({
        groupId: g.groupId,
        groupName: g.groupName,
        groupType: g.groupType,
        memberCount: g.memberCount,
      })),
      sentAt: new Date().toISOString(),
      messagePreview: type === 'text' ? content : JSON.stringify(content),
    })
  } catch (error) {
    console.error('廣播訊息失敗:', error)
    throw error
  }
}

// 獲取訊息歷史
async function getMessageHistory(limit: number) {
  try {
    // 模擬的訊息歷史（實際使用時應從數據庫或快取中獲取）
    const history = [
      {
        id: 'msg001',
        type: 'text',
        content: '今日瓦斯訂單已更新，請查看系統',
        sentTo: 'group001',
        sentToName: '九九瓦斯行管理群',
        sentAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'sent',
      },
      {
        id: 'msg002',
        type: 'text',
        content: '提醒：庫存即將不足，請安排進貨',
        sentTo: 'group002',
        sentToName: '配送司機群',
        sentAt: new Date(Date.now() - 7200000).toISOString(),
        status: 'sent',
      },
      {
        id: 'msg003',
        type: 'flex',
        content: {
          type: 'bubble',
          altText: '新客戶優惠活動',
          contents: [
            {
              type: 'text',
              text: '🎉 新客戶優惠活動開始！',
            },
            {
              type: 'text',
              text: '現金客戶享2%折扣，VIP客戶享5%折扣',
            },
          ],
        },
        sentTo: 'all',
        sentToName: '全體群組',
        sentAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'sent',
      },
    ]

    return NextResponse.json({
      success: true,
      total: history.length,
      messages: history.slice(0, limit),
    })
  } catch (error) {
    console.error('獲取訊息歷史失敗:', error)
    throw error
  }
}

// GET - 獲取Bot狀態和配置
export async function GET() {
  try {
    const groups = await getGroupsFromDatabase()

    return NextResponse.json({
      botName: '九九瓦斯行Bot',
      botStatus: 'active',
      groups,
      source: 'database',
      features: {
        sendToGroup: true,
        sendToUser: true,
        broadcast: true,
        messageHistory: true,
        webhook: true,
        autoSync: true,
      },
      setupInstructions: [
        '1. 在LINE Developers Console創建Bot',
        '2. 獲取Channel Access Token和Channel Secret',
        '3. 設定環境變數：LINE_CHANNEL_ACCESS_TOKEN 和 LINE_CHANNEL_SECRET',
        '4. 設定Webhook URL: https://yourdomain.com/api/webhook/line',
        '5. 將LINE Bot加入群組，系統會自動保存群組 ID',
        '6. 系統會根據群組名稱自動識別類型（管理/司機/業務/客服）',
        '7. 可以使用指令 /setname:群組名稱 來更新群組名稱',
      ],
      autoSyncEnabled: true,
      groupsCount: groups.length,
      groupsByType: {
        admin: groups.filter(g => g.groupType === 'admin').length,
        driver: groups.filter(g => g.groupType === 'driver').length,
        sales: groups.filter(g => g.groupType === 'sales').length,
        cs: groups.filter(g => g.groupType === 'cs').length,
        general: groups.filter(g => g.groupType === 'general').length,
      },
    })
  } catch (error) {
    console.error('獲取Bot狀態失敗:', error)
    return NextResponse.json(
      { error: '獲取Bot狀態失敗' },
      { status: 500 }
    )
  }
}

/**
 * 從 LINE API 同步群組信息到數據庫
 */
async function syncGroupsFromLINE() {
  try {
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN 未配置' },
        { status: 400 }
      )
    }

    // 注意：LINE API 不提供獲取所有群組的端點
    // 只能通過 Webhook 事件獲取 Bot 加入的群組信息
    // 這個函數返回提示信息
    return NextResponse.json({
      message: 'LINE 群組同步說明',
      note: 'LINE API 不支持主動獲取群組列表。請將 Bot 加入群組後，系統會自動保存群組 ID。',
      instructions: [
        '1. 將 LINE Bot 加入目標群組',
        '2. Bot 收到 join 事件後會自動保存群組 ID',
        '3. 發送訊息 /setname:群組名稱 來更新群組名稱',
        '4. 系統會根據群組名稱自動識別類型',
      ],
      currentGroups: await getGroupsFromDatabase(),
    })
  } catch (error) {
    console.error('同步群組失敗:', error)
    return NextResponse.json(
      { error: '同步群組失敗' },
      { status: 500 }
    )
  }
}
