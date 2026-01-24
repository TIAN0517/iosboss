import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAIAssistant, MessageContext } from '@/lib/unified-ai-assistant'
import { db } from '@/lib/db'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import { getLineDialogHandler } from '@/lib/line-dialog-handler'
import { getConversationStateManager } from '@/lib/line-conversation-state'
import crypto from 'crypto'

/**
 * LINE Bot Webhook API (升級版)
 * 整合統一 AI 助手、群組管理、意圖分析
 *
 * 優化：立即返回 200 OK，異步處理事件避免 LINE webhook 逾時
 */

// LINE Bot 配置
const LINE_CONFIG = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
  apiEndpoint: 'https://api.line.me/v2/bot/message/reply',
  pushEndpoint: 'https://api.line.me/v2/bot/message/push',
  skipSignatureVerify: process.env.LINE_SKIP_SIGNATURE_VERIFY === 'true',
}

// 驗證 LINE 簽名
function verifyLineSignature(body: string, signature: string): boolean {
  // 如果設置了跳過驗證，直接返回 true
  if (LINE_CONFIG.skipSignatureVerify) {
    console.warn('[LINE Webhook] Signature verification is DISABLED (LINE_SKIP_SIGNATURE_VERIFY=true)')
    return true
  }

  // 調試日誌
  console.log('[LINE Webhook] Debug info:', {
    hasSecret: !!LINE_CONFIG.channelSecret,
    secretLength: LINE_CONFIG.channelSecret?.length,
    receivedSignature: signature?.substring(0, 20) + '...',
    bodyLength: body?.length,
  })

  if (!LINE_CONFIG.channelSecret) {
    console.warn('LINE_CHANNEL_SECRET not configured, skipping signature verification')
    return true // 開發環境可以跳過
  }

  const hash = crypto
    .createHmac('sha256', LINE_CONFIG.channelSecret)
    .update(body, 'utf8')
    .digest('base64')

  const expectedSignature = `sha256=${hash}`

  console.log('[LINE Webhook] Signature comparison:', {
    expected: expectedSignature.substring(0, 30) + '...',
    received: signature?.substring(0, 30) + '...',
    match: signature === expectedSignature,
  })

  return signature === expectedSignature
}

// POST - 接收 LINE Webhook（立即返回，異步處理）
export async function POST(request: NextRequest) {
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('LINE_WEBHOOK')

  try {
    // 獲取原始 body 用於驗證簽名
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')

    // ⚡ 如果沒有簽名，可能是驗證請求，直接返回 200
    if (!signature) {
      // LINE 有時會發送驗證請求（沒有簽名）
      if (body.length === 0 || body === '{}') {
        logger.info(LogCategory.API, 'LINE webhook verification request', logContext.get())
        return NextResponse.json({ status: 'ok', message: 'Webhook verified' }, { status: 200 })
      }
      
      logger.warn(LogCategory.SECURITY, 'Missing LINE signature', logContext.get())
      // 開發環境允許跳過簽名驗證
      if (process.env.NODE_ENV === 'development' || LINE_CONFIG.skipSignatureVerify) {
        logger.warn(LogCategory.SECURITY, 'Skipping signature check in development', logContext.get())
      } else {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    } else {
    // 驗證簽名
    if (!verifyLineSignature(body, signature)) {
      logger.warn(LogCategory.SECURITY, 'Invalid LINE signature', logContext.get())
        // 開發環境允許跳過簽名驗證
        if (process.env.NODE_ENV === 'development' || LINE_CONFIG.skipSignatureVerify) {
          logger.warn(LogCategory.SECURITY, 'Skipping signature check in development', logContext.get())
        } else {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
      }
    }

    // 解析事件數據
    let data: any
    try {
      data = JSON.parse(body)
    } catch (parseError) {
      // 如果解析失敗，可能是空請求或驗證請求
      logger.info(LogCategory.API, 'LINE webhook empty or invalid JSON', logContext.get())
      return NextResponse.json({ status: 'ok', message: 'Empty request' }, { status: 200 })
    }

    const events = data.events || []

    // 如果沒有事件，直接返回 200
    if (events.length === 0) {
      logger.info(LogCategory.API, 'LINE webhook no events', logContext.get())
      return NextResponse.json({ status: 'ok', message: 'No events' }, { status: 200 })
    }

    logger.info(LogCategory.BUSINESS, 'LINE webhook received - async processing', {
      ...logContext.get(),
      eventCount: events.length,
    })

    // ⚡ 立即返回 200 OK，避免 LINE webhook 逾時
    // 使用 setImmediate 確保響應已發送後再異步處理
    setImmediate(() => {
      processEventsAsync(events, requestId).catch((error) => {
        console.error('[LINE Webhook Async] Error processing events:', error)
      })
    })

    // 確保返回 200 狀態碼
    return NextResponse.json({ status: 'ok', processed: true }, { status: 200 })
  } catch (error: any) {
    logger.error(LogCategory.API, 'LINE webhook error', error, logContext.get())
    // 即使出錯也要返回 200，避免 LINE 重試
    return NextResponse.json({ 
      status: 'error', 
      message: 'Error processing webhook',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 200 })
  }
}

// 異步處理所有事件
async function processEventsAsync(events: any[], requestId: string) {
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('LINE_WEBHOOK_ASYNC')

  for (const event of events) {
    try {
      await handleLineEvent(event, logContext)
    } catch (error) {
      console.error(`[LINE Webhook Async] Error handling event:`, error)
      logger.error(LogCategory.API, 'Failed to handle LINE event', error, logContext.get())
    }
  }

  logger.info(LogCategory.BUSINESS, 'All LINE webhook events processed', {
    ...logContext.get(),
    totalEvents: events.length,
  })
}

// 處理 LINE 事件
async function handleLineEvent(event: any, logContext: any) {
  const { type, source, message, replyToken, timestamp } = event

  // 處理不同類型的事件
  if (type === 'join') {
    await handleJoinEvent(event, logContext)
    return
  }

  if (type === 'memberJoined') {
    await handleMemberJoinedEvent(event, logContext)
    return
  }

  // 只處理訊息事件
  if (type !== 'message') {
    logger.debug(LogCategory.API, 'Skipping non-message event', {
      ...logContext.get(),
      eventType: type,
    })
    return
  }

  const userId = source?.userId
  const groupId = source?.groupId
  const roomId = source?.roomId
  const messageType = message?.type
  const messageText = messageType === 'text' ? message.text : ''

  logger.info(LogCategory.BUSINESS, 'LINE message received (async)', {
    ...logContext.get(),
    userId,
    groupId,
    messageType,
    messageText: messageText?.substring(0, 100),
  })

  // ⚡ 獲取群組類型（從資料庫）
  let groupType: string | undefined = undefined
  let isNewGroup = false
  let capturedGroupInfo: any = null

  if (groupId) {
    // 先從資料庫查找現有群組
    const existingGroup = await db.lineGroup.findUnique({
      where: { groupId },
      select: { groupType: true, isActive: true },
    })

    if (existingGroup) {
      // 確保 groupType 是有效的 GroupType 枚舉值
      const validTypes = ['admin', 'driver', 'sales', 'staff', 'cs', 'general']
      if (validTypes.includes(existingGroup.groupType)) {
        groupType = existingGroup.groupType
      }
    }

    // 自動捕獲群組信息
    isNewGroup = await captureGroupInfo(groupId, logContext)
    if (isNewGroup) {
      logger.info(LogCategory.BUSINESS, 'New group captured', {
        ...logContext.get(),
        groupId,
      })
      // 獲取捕獲的群組信息
      capturedGroupInfo = await db.lineGroup.findUnique({
        where: { groupId },
      })
      const validTypes = ['admin', 'driver', 'sales', 'staff', 'cs', 'general']
      if (capturedGroupInfo?.groupType && validTypes.includes(capturedGroupInfo.groupType)) {
        groupType = capturedGroupInfo.groupType
      }
    }
  }

  // 保存訊息記錄
  await saveLineMessage({
    lineGroupId: groupId,
    userId,
    messageType: messageType || 'unknown',
    content: messageText || JSON.stringify(message),
    timestamp: timestamp ? new Date(timestamp) : new Date(),
  })

  // 獲取 AI 回應
  let responseText: string
  let flexMessage: any = null
  let quickReply: any = null
  let audioResponse: Buffer | undefined = undefined

  // 檢查是否請求語音回覆（文字訊息也可以觸發）
  const wantsVoiceReply =
    messageType === 'audio' ||  // 語音訊息自動用語音回覆
    messageText.includes('用語音') ||  // 文字包含「用語音」
    messageText.includes('語音回覆') ||  // 或「語音回覆」
    messageText.includes('講給我聽')  // 或「講給我聽」

  if (messageType === 'text') {
    // ✨ 先檢查多輪對話處理器
    const dialogHandler = getLineDialogHandler()
    const dialogResult = await dialogHandler.handleDialog(userId, messageText, groupId)

    if (dialogResult) {
      // 多輪對話處理結果
      responseText = dialogResult.response
      quickReply = dialogResult.quickReply

      // 如果對話結束，清除狀態
      if (dialogResult.endConversation) {
        const stateManager = getConversationStateManager()
        stateManager.clearState(userId)
      }

      logger.info(LogCategory.BUSINESS, 'Dialog response generated', {
        ...logContext.get(),
        userId,
        groupId,
        responseLength: responseText.length,
      })
    } else {
      // 單輪對話 - 使用統一 AI 助手
      const assistant = getUnifiedAIAssistant()

      // 構建上下文（包含群組類型）
      const context: MessageContext = {
        platform: wantsVoiceReply ? 'voice' : 'line',  // 如果請求語音，平台設為 voice
        userId,
        groupId,
        groupType: groupType as any, // 傳遞群組類型
      }

      // 處理訊息（設置 15 秒超時）
      const aiResponse = await Promise.race([
        assistant.processMessage(messageText, context),
        new Promise((resolve) =>
          setTimeout(() => resolve({ text: '我正在處理您的請求，請稍候...' }), 15000)
        )
      ]) as any

      responseText = aiResponse.text
      flexMessage = aiResponse.flex
      quickReply = aiResponse.quickReply

      // 如果請求語音回覆，生成 TTS
      if (wantsVoiceReply && aiResponse.shouldSpeak && aiResponse.text) {
        try {
          const { synthesizeWithElevenLabs, synthesizeWithAzure } = await import('@/lib/voice-service')
          console.log('[LINE] TTS: Trying ElevenLabs for text message...')
          const ttsResult = await synthesizeWithElevenLabs(aiResponse.text)
          audioResponse = ttsResult.audioBuffer
          console.log('[LINE] TTS: ElevenLabs success')
        } catch (e) {
          console.warn('[LINE] ElevenLabs failed, trying Azure:', e)
          try {
            const { synthesizeWithAzure } = await import('@/lib/voice-service')
            const ttsResult = await synthesizeWithAzure(aiResponse.text)
            audioResponse = ttsResult.audioBuffer
            console.log('[LINE] TTS: Azure success')
          } catch (e2) {
            console.warn('[LINE] Azure TTS also failed')
          }
        }
      }

      logger.info(LogCategory.BUSINESS, 'AI response generated', {
        ...logContext.get(),
        userId,
        groupId,
        responseLength: responseText.length,
        wantsVoiceReply,
      })
    }
  } else if (messageType === 'audio') {
    // 語音訊息 - 使用 Deepgram ASR + ElevenLabs/Azure TTS
    const audioUrl = message?.content?.provider?.originalContentUrl
    const assistant = getUnifiedAIAssistant()

    logger.info(LogCategory.BUSINESS, 'Processing voice message', {
      ...logContext.get(),
      audioUrl: audioUrl?.substring(0, 50) + '...',
    })

    if (audioUrl) {
      // 增加超時時間到 30 秒
      const voiceResult = await Promise.race([
        assistant.processVoiceMessage(audioUrl, {
          platform: 'line',
          userId,
          groupId,
        }),
        new Promise((resolve) =>
          setTimeout(() => resolve({
            text: '語音處理中，請稍後...（處理時間較長）',
            shouldSpeak: false,
          }), 30000)
        )
      ]) as any

      responseText = voiceResult.text

      logger.info(LogCategory.BUSINESS, 'Voice processing completed', {
        ...logContext.get(),
        hasAudio: !!voiceResult.audioResponse,
        shouldSpeak: voiceResult.shouldSpeak,
      })

      // 如果有 TTS 音频，保存到 audioResponse 以便发送
      if (voiceResult.audioResponse && voiceResult.shouldSpeak) {
        audioResponse = voiceResult.audioResponse
      }
    } else {
      responseText = '收到您的語音訊息，但無法獲取音頻...'
    }
  } else {
    responseText = '我目前只能處理文字訊息喔！'
  }

  // ✨ 如果是新捕獲的群組，在回應前添加群組 ID 信息
  if (isNewGroup && groupId && capturedGroupInfo) {
    const groupInfoHeader = `🔔 已自動捕獲群組信息

群組名稱: ${capturedGroupInfo.groupName}
群組 ID: ${groupId}
成員數: ${capturedGroupInfo.memberCount || '未知'}

---
`
    responseText = groupInfoHeader + responseText
  }

  // 回覆 LINE 用戶
  await replyToLine(
    replyToken,
    responseText,
    flexMessage,
    quickReply,
    logContext,
    audioResponse // 传递 TTS 音频（如果有）
  )

  // 保存回應記錄
  await saveLineMessage({
    lineGroupId: groupId,
    userId: 'bot',
    messageType: flexMessage ? 'flex' : 'text',
    content: responseText,
    timestamp: new Date(),
  })
}

// 處理 Bot 加入群組事件
async function handleJoinEvent(event: any, logContext: any) {
  const { source, replyToken, timestamp } = event
  const groupId = source?.groupId

  if (!groupId) return

  logger.info(LogCategory.BUSINESS, 'Bot joined group', {
    ...logContext.get(),
    groupId,
  })

  // 獲取群組資訊（成員數、群組摘要等）
  const groupInfo = await getGroupInfo(groupId)

  // 發送歡迎訊息
  const welcomeMessage = `👋 歡迎使用九九瓦斯行 LINE Bot！

我可以幫您：
🛒 訂購瓦斯
📦 查詢庫存
📋 查詢訂單
💬 客戶服務

群組ID: ${groupId.slice(-8)}
成員數: ${groupInfo.memberCount || '未知'}

直接輸入指令即可使用！`

  await replyToLine(replyToken, welcomeMessage)

  // 保存群組記錄（包含詳細資訊）
  try {
    await db.lineGroup.upsert({
      where: { groupId },
      update: {
        isActive: true,
        memberCount: groupInfo.memberCount,
        groupName: groupInfo.groupName,
        updatedAt: new Date(),
      },
      create: {
        groupId,
        groupName: groupInfo.groupName || `LINE群組-${groupId.slice(-6)}`,
        groupType: 'general',
        permissions: ['create_order', 'check_order', 'check_inventory'],
        isActive: true,
        memberCount: groupInfo.memberCount,
      },
    })

    logger.info(LogCategory.BUSINESS, 'Group info saved', {
      ...logContext.get(),
      groupId,
      groupName: groupInfo.groupName,
      memberCount: groupInfo.memberCount,
    })
  } catch (error) {
    console.error('Failed to save group:', error)
  }
}

// 獲取群組詳細資訊
async function getGroupInfo(groupId: string): Promise<{
  groupName?: string
  memberCount?: number
}> {
  try {
    // 使用 LINE Messaging API 獲取群組成員數
    const membersUrl = `https://api.line.me/v2/bot/group/${groupId}/members/count`
    const summaryUrl = `https://api.line.me/v2/bot/group/${groupId}/summary`

    const [membersResponse, summaryResponse] = await Promise.allSettled([
      fetch(membersUrl, {
        headers: {
          'Authorization': `Bearer ${LINE_CONFIG.channelAccessToken}`,
        },
      }),
      fetch(summaryUrl, {
        headers: {
          'Authorization': `Bearer ${LINE_CONFIG.channelAccessToken}`,
        },
      }),
    ])

    let memberCount: number | undefined
    let groupName: string | undefined

    if (membersResponse.status === 'fulfilled' && membersResponse.value.ok) {
      const data = await membersResponse.value.json()
      memberCount = data.count
    }

    if (summaryResponse.status === 'fulfilled' && summaryResponse.value.ok) {
      const data = await summaryResponse.value.json()
      groupName = data.groupName
    }

    return { groupName, memberCount }
  } catch (error) {
    console.error('Failed to get group info:', error)
    return {}
  }
}

// 處理成員加入事件
async function handleMemberJoinedEvent(event: any, logContext: any) {
  const { source, joinedMembers, replyToken } = event
  const groupId = source?.groupId

  if (!groupId) return

  logger.info(LogCategory.BUSINESS, 'Member joined group', {
    ...logContext.get(),
    groupId,
    memberCount: joinedMembers?.length || 0,
  })
}

// ============================================
// 自動捕獲群組信息（用於任何群組訊息）
// ============================================
/**
 * 當收到群組訊息時，自動捕獲並保存群組信息
 * 如果群組已存在則更新信息，否則創建新記錄
 * @returns true 如果是新捕獲的群組，false 如果群組已存在
 */
async function captureGroupInfo(groupId: string, logContext: any): Promise<boolean> {
  try {
    // 檢查群組是否已存在
    const existingGroup = await db.lineGroup.findUnique({
      where: { groupId },
    })

    // 獲取群組資訊（成員數、群組名稱）
    const groupInfo = await getGroupInfo(groupId)

    // 保存或更新群組記錄
    await db.lineGroup.upsert({
      where: { groupId },
      update: {
        groupName: groupInfo.groupName || existingGroup?.groupName,
        memberCount: groupInfo.memberCount || existingGroup?.memberCount,
        isActive: true,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        groupId,
        groupName: groupInfo.groupName || `LINE群組-${groupId.slice(-6)}`,
        groupType: 'general',
        permissions: ['create_order', 'check_order', 'check_inventory'],
        isActive: true,
        memberCount: groupInfo.memberCount,
        lastMessageAt: new Date(),
      },
    })

    // 如果是新群組（之前不存在），返回 true
    const isNewGroup = !existingGroup

    if (isNewGroup) {
      logger.info(LogCategory.BUSINESS, 'New LINE group auto-captured', {
        ...logContext.get(),
        groupId,
        groupName: groupInfo.groupName,
        memberCount: groupInfo.memberCount,
      })
    }

    return isNewGroup
  } catch (error) {
    console.error('[LINE Webhook] Failed to capture group info:', error)
    return false
  }
}

// 回覆到 LINE
async function replyToLine(
  replyToken: string,
  text: string,
  flex?: any,
  quickReply?: any,
  logContext?: any,
  audioBuffer?: Buffer
) {
  try {
    const messages: any[] = []

    // 如果有音频，先上传并添加音频消息
    if (audioBuffer) {
      try {
        const audioUrl = await uploadAudioToLine(audioBuffer)
        messages.push({
          type: 'audio',
          originalContentUrl: audioUrl,
          duration: getAudioDurationMs(audioBuffer),
        })
        logger.info(LogCategory.BUSINESS, 'LINE audio uploaded', { ...logContext, audioUrl })
      } catch (audioError) {
        console.warn('[LINE Webhook] Failed to upload audio, sending text only:', audioError)
        // 音频上传失败时只发送文字
      }
    }

    // 構建訊息數組
    if (flex) {
      messages.push({
        type: 'flex',
        altText: text,
        contents: flex,
      })
    } else {
      messages.push({
        type: 'text',
        text,
      })
    }

    // 添加 Quick Reply
    if (quickReply && messages.length > 0) {
      messages[messages.length - 1].quickReply = quickReply
    }

    // 設置 10 秒超時
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(LINE_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CONFIG.channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(LogCategory.API, 'LINE reply failed', new Error(errorText), logContext)
      throw new Error(`LINE API error: ${response.status}`)
    }

    logger.info(LogCategory.BUSINESS, 'LINE reply sent', {
      ...logContext,
      messageLength: text.length,
      hasFlex: !!flex,
      hasQuickReply: !!quickReply,
      hasAudio: !!audioBuffer,
    })

    const result = await response.json()
    return result
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[LINE Webhook] Reply timeout after 10s')
    } else {
      console.error('Error replying to LINE:', error)
    }
    throw error
  }
}

/**
 * 上传音频到 LINE Messaging API
 * @param audioBuffer 音频 Buffer (MP3 格式)
 * @returns 音频 URL
 */
async function uploadAudioToLine(audioBuffer: Buffer): Promise<string> {
  const LINE_DATA_ENDPOINT = 'https://api-data.line.me/v2/bot/message'

  // 创建 FormData
  const formData = new FormData()
  // @ts-ignore - Buffer 可以直接作为 Blob 使用
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
  formData.append('file', blob, 'response.mp3')

  const response = await fetch(`${LINE_DATA_ENDPOINT}/${Math.random().toString(36).substring(7)}/content`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LINE_CONFIG.channelAccessToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`LINE audio upload failed: ${response.status}`)
  }

  // LINE 返回的音频 URL
  const data = await response.json()
  return data.url || response.headers.get('x-line-request-url') || ''
}

/**
 * 估算音频时长（毫秒）
 * 对于 MP3 128kbps 16kHz mono，大约 1KB = 60ms
 */
function getAudioDurationMs(audioBuffer: Buffer): number {
  // 简单估算：128kbps = 16KB/s，所以 1KB ≈ 62.5ms
  return Math.round((audioBuffer.length * 62.5))
}

// 保存 LINE 訊息記錄
async function saveLineMessage(data: {
  lineGroupId?: string
  userId?: string
  messageType: string
  content: string
  timestamp: Date
}) {
  try {
    await db.lineMessage.create({
      data: {
        lineGroupId: data.lineGroupId,
        userId: data.userId,
        messageType: data.messageType,
        content: data.content,
        timestamp: data.timestamp,
      },
    })
  } catch (error) {
    console.error('Failed to save LINE message:', error)
    // 不拋出錯誤，避免影響主要功能
  }
}

// GET - Webhook 驗證端點
export async function GET(request: NextRequest) {
  // 同時返回當前配置的群組 ID 信息
  const adminGroupId = process.env.LINE_ADMIN_GROUP_ID || '未設定'

  return NextResponse.json({
    status: 'ready',
    message: 'LINE Bot Webhook is ready (Humanized Conversational AI)',
    configuredGroups: {
      admin: adminGroupId,
      driver: process.env.LINE_DRIVER_GROUP_ID || '未設定',
      sales: process.env.LINE_SALES_GROUP_ID || '未設定',
    },
    hint: '請發送訊息到 LINE 群組以自動捕獲群組 ID',
    features: {
      intentAnalysis: true,
      groupManagement: true,
      unifiedAI: true,
      flexMessages: true,
      quickReply: true,
      voiceSupport: true,
      asyncProcessing: true,
      scheduleSheet: true, // 休假表功能
    },
  })
}
