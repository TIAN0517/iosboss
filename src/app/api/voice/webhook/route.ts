import { NextRequest, NextResponse } from 'next/server'
import { getVoiceAssistant, initVoiceAssistantFromEnv } from '@/lib/voice-assistant'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import crypto from 'crypto'

/**
 * 語音服務 Webhook API
 * 用於接收語音服務的來電通知
 */

/**
 * 生成 HMAC-SHA256 簽名
 */
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')
}

/**
 * 驗證 Webhook 簽名
 */
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(body, secret)
  // 支援兩種格式：純 hex 或 sha256= 前綴
  const normalizedSignature = signature.startsWith('sha256=')
    ? signature.slice(7)
    : signature
  return normalizedSignature === expectedSignature
}

export async function POST(request: NextRequest) {
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('VOICE_WEBHOOK')

  try {
    // 驗證 Webhook 簽名（安全檢查）
    const signature = request.headers.get('x-webhook-signature')
    const webhookSecret = process.env.VOICE_WEBHOOK_SECRET

    let body: any
    let rawBody = ''

    if (webhookSecret) {
      if (!signature) {
        logger.warn(LogCategory.SECURITY, 'Missing webhook signature', logContext.get())
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }

      // 獲取原始 body 用於驗證簽名
      rawBody = await request.text()

      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        logger.warn(LogCategory.SECURITY, 'Invalid webhook signature', {
          ...logContext.get(),
          signature: signature?.substring(0, 20) + '...',
        })
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }

      // 解析 JSON
      body = JSON.parse(rawBody)
    } else {
      // 沒有設置 webhook secret，跳過驗證（開發環境）
      logger.debug(LogCategory.SECURITY, 'No webhook secret configured, skipping signature verification', logContext.get())
      body = await request.json()
    }

    const {
      call_id,
      from_number,
      to_number,
      timestamp,
      recording_url,
      transcription,
      event_type,
    } = body

    logger.info(LogCategory.BUSINESS, 'Voice webhook received', {
      ...logContext.get(),
      call_id,
      from_number,
      event_type,
    })

    // 初始化語音助手
    const voiceAssistant = initVoiceAssistantFromEnv()

    // 處理不同類型的事件
    let response: any

    switch (event_type) {
      case 'incoming_call':
        // 新的來電
        response = await handleIncomingCall(body, voiceAssistant, logContext)
        break

      case 'call_completed':
        // 通話結束，處理錄音
        response = await handleCallCompleted(body, voiceAssistant, logContext)
        break

      case 'transcription_ready':
        // 轉錄完成
        response = await handleTranscriptionReady(body, voiceAssistant, logContext)
        break

      default:
        logger.warn(LogCategory.API, 'Unknown webhook event type', {
          ...logContext.get(),
          event_type,
        })
        response = { status: 'unknown_event' }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    logger.error(LogCategory.API, 'Voice webhook error', error, logContext.get())
    return NextResponse.json(
      { error: '處理語音服務請求失敗' },
      { status: 500 }
    )
  }
}

/**
 * 處理新來電
 */
async function handleIncomingCall(
  callData: any,
  voiceAssistant: any,
  logContext: any
) {
  logger.info(LogCategory.BUSINESS, 'Processing incoming call', logContext.get())

  // 記錄來電
  // TODO: 檢查是否需要自動接聽（無人接聽超過 3 分鐘）

  return {
    status: 'received',
    action: 'record',
    message: '來電已記錄',
  }
}

/**
 * 處理通話結束
 */
async function handleCallCompleted(
  callData: any,
  voiceAssistant: any,
  logContext: any
) {
  const { call_id, from_number, to_number, timestamp, recording_url, duration } = callData

  logger.info(LogCategory.BUSINESS, 'Processing call completed', {
    ...logContext.get(),
    call_id,
    duration,
  })

  // 準備來電資料
  const incomingCall = {
    callId: call_id,
    fromNumber: from_number,
    toNumber: to_number,
    timestamp: new Date(timestamp),
    recordingUrl: recording_url,
  }

  // 處理來電（語音轉文字、AI 分析、執行動作）
  const result = await voiceAssistant.handleIncomingCall(incomingCall)

  logger.info(LogCategory.BUSINESS, 'Call processing completed', {
    ...logContext.get(),
    call_id,
    hasTranscript: !!result.transcript,
    actionsCount: result.actions.length,
  })

  return result
}

/**
 * 處理轉錄完成
 */
async function handleTranscriptionReady(
  callData: any,
  voiceAssistant: any,
  logContext: any
) {
  const { call_id, transcription, recording_url } = callData

  logger.info(LogCategory.BUSINESS, 'Transcription ready', {
    ...logContext.get(),
    call_id,
    hasTranscription: !!transcription,
  })

  // 如果有轉錄文字，重新處理
  if (transcription) {
    const incomingCall = {
      callId: call_id,
      fromNumber: callData.from_number,
      toNumber: callData.to_number,
      timestamp: new Date(callData.timestamp),
      recordingUrl: recording_url,
      transcription,
    }

    const result = await voiceAssistant.handleIncomingCall(incomingCall)
    return result
  }

  return { status: 'transcription_noted' }
}

// GET - Webhook 驗證端點
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    message: 'Voice webhook is ready',
  })
}
