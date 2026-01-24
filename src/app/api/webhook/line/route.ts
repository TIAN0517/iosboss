'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { getAIManager } from '@/lib/ai-provider-unified'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

/**
 * 發送訊息到 LINE
 */
async function replyToLine(replyToken: string, text: string): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('[LINE Webhook] No LINE channel access token configured')
    return false
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[LINE Webhook] Reply API error:', errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('[LINE Webhook] Reply error:', error)
    return false
  }
}

/**
 * 發送訊息到 LINE 群組
 */
async function sendToLineGroup(groupId: string, text: string): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return false

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: groupId,
        messages: [{ type: 'text', text }],
      }),
    })

    return response.ok
  } catch (error) {
    console.error('[LINE Webhook] Send to group error:', error)
    return false
  }
}

// POST /api/webhook/line - LINE Bot Webhook
export async function POST(request: NextRequest) {
  try {
    // 驗證 LINE 簽名
    const signature = request.headers.get('x-line-signature')

    if (!LINE_CHANNEL_SECRET || process.env.LINE_SKIP_SIGNATURE_VERIFY === 'true') {
      // 跳過驗證（僅用於開發環境）
    } else {
      if (!signature) {
        return NextResponse.json(
          { error: '缺少簽名' },
          { status: 401 }
        )
      }

      const body = await request.text()
      const hash = crypto
        .createHmac('SHA256', LINE_CHANNEL_SECRET)
        .update(body)
        .digest('base64')

      if (signature !== `sha256=${hash}`) {
        return NextResponse.json(
          { error: '簽名驗證失敗' },
          { status: 401 }
        )
      }
    }

    const body = await request.text()
    const data = JSON.parse(body)
    const events = data.events || []

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text
        const source = event.source

        // 判斷訊息來源類型
        const sourceType = source.type // 'user', 'group', 'room'
        const userId = source.userId
        const groupId = source.groupId
        const roomId = source.roomId
        const replyToken = event.replyToken

        console.log(`[LINE Webhook] 收到訊息 - 來源: ${sourceType}, 用戶: ${userId}, 群組: ${groupId || '無'}`)

        // 構建會話 ID（根據來源類型）
        const conversationId = groupId || roomId || userId

        // 獲取或創建會話
        let conversation = await db.lineConversation.findFirst({
          where: { userId: conversationId }
        })

        if (!conversation) {
          conversation = await db.lineConversation.create({
            data: {
              userId: conversationId,
              messages: []
            }
          })
        }

        // 獲取 AI 回應
        const aiManager = getAIManager()
        const aiResponse = await aiManager.chat(
          userMessage,
          conversation.messages as any[]
        )

        // 保存會話
        await db.lineConversation.update({
          where: { id: conversation.id },
          data: {
            messages: {
              push: [
                ...conversation.messages as any[],
                { role: 'user', content: userMessage, timestamp: new Date() },
                { role: 'assistant', content: aiResponse, timestamp: new Date() }
              ]
            }
          }
        })

        // 回覆訊息
        let replySuccess = false

        if (sourceType === 'group') {
          // 群組訊息：使用 reply API
          replySuccess = await replyToLine(replyToken, aiResponse)
          console.log(`[LINE Webhook] 回復群組: ${groupId}, 成功: ${replySuccess}`)
        } else if (sourceType === 'room') {
          // 房間訊息：使用 reply API
          replySuccess = await replyToLine(replyToken, aiResponse)
          console.log(`[LINE Webhook] 回復房間: ${roomId}, 成功: ${replySuccess}`)
        } else {
          // 個人訊息：使用 reply API
          replySuccess = await replyToLine(replyToken, aiResponse)
          console.log(`[LINE Webhook] 回復用戶: ${userId}, 成功: ${replySuccess}`)
        }

        if (!replySuccess) {
          console.error('[LINE Webhook] 回復失敗:', { sourceType, userId, groupId, roomId })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('LINE Webhook 錯誤:', error)
    return NextResponse.json(
      { error: 'Webhook 處理失敗' },
      { status: 500 }
    )
  }
}
