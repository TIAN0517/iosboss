/**
 * AI 語音助手服務
 * 自動接聽電話、語音轉文字、AI 對話、業務整合、文字轉語音
 * 使用智譜 GLM-4V (STT) + TTS-1 (TTS) + BossJy-99 (AI 分析)
 */

import { BossJy99Assistant, getBossJy99Assistant } from './boss-jy-99-api'

// ========================================
// 台灣語音服務整合
// ========================================

interface VoiceServiceConfig {
  provider: 'eightwai' | 'zero800' | 'custom'
  webhookUrl: string
  apiKey: string
  maxCallDuration: number // 通話最長時間（秒）
  noAnswerTimeout: number // 無接聽超時（秒）
}

// ========================================
// 智譜 STT/TTS 配置
// ========================================

const GLM_STT_CONFIG = {
  baseUrl: process.env.GLM_STT_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions',
  model: process.env.GLM_STT_MODEL || 'glm-4v',
  apiKey: process.env.GLM_STT_API_KEY || '',
}

const GLM_TTS_CONFIG = {
  baseUrl: process.env.GLM_TTS_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/audio/speech',
  model: process.env.GLM_TTS_MODEL || 'tts-1',
  apiKey: process.env.GLM_TTS_API_KEY || '',
  voice: process.env.TTS_VOICE || 'zh-cn-female-standard',
  speed: parseFloat(process.env.TTS_SPEED || '1.0'),
  pitch: parseFloat(process.env.TTS_PITCH || '1.0'),
}

// ========================================
// 來電資料結構
// ========================================

export interface IncomingCall {
  callId: string
  fromNumber: string
  toNumber: string
  timestamp: Date
  recordingUrl?: string
  transcription?: string
}

// ========================================
// AI 語音助手核心類別
// ========================================

export class VoiceAssistantService {
  private config: VoiceServiceConfig
  private bossJy99: BossJy99Assistant

  constructor(config: VoiceServiceConfig) {
    this.config = config
    this.bossJy99 = getBossJy99Assistant()
  }

  /**
   * 處理來電 Webhook
   */
  async handleIncomingCall(callData: IncomingCall): Promise<{
    response: string
    actions: Array<{type: string, data: any}>
    transcript?: string
  }> {
    console.log('📞 收到來電:', callData)

    // 1. 語音轉文字（如果有錄音）
    let transcript = callData.transcription
    if (!transcript && callData.recordingUrl) {
      transcript = await this.transcribeAudio(callData.recordingUrl)
    }

    // 2. AI 分析客戶需求
    const aiResponse = await this.analyzeCustomerIntent(callData, transcript)

    // 3. 執行業務邏輯
    const actions = await this.executeActions(aiResponse.actions, callData)

    // 4. 生成語音回覆
    const voiceResponse = await this.generateVoiceResponse(aiResponse.message)

    // 5. 記錄來電
    await this.recordCall(callData, transcript, aiResponse, actions)

    return {
      response: voiceResponse,
      actions,
      transcript,
    }
  }

  /**
   * 語音轉文字 (STT) - 使用智譜 GLM-4V
   */
  private async transcribeAudio(audioUrl: string): Promise<string> {
    try {
      console.log('🎤 正在使用 GLM-4V 轉錄語音:', audioUrl)

      const response = await fetch(GLM_STT_CONFIG.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GLM_STT_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: GLM_STT_CONFIG.model,
          url: audioUrl,
          language: 'zh', // 中文
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('GLM STT error:', error)
        throw new Error('語音轉文字失敗')
      }

      const data = await response.json()
      const transcript = data.text || ''

      console.log('✅ 轉錄完成:', transcript)
      return transcript
    } catch (error) {
      console.error('STT error:', error)
      return '（轉錄失敗）'
    }
  }

  /**
   * AI 分析客戶需求
   */
  private async analyzeCustomerIntent(callData: IncomingCall, transcript?: string): Promise<{
    intent: string
    message: string
    actions: Array<{type: string, data: any}>
  }> {
    try {
      // 構建 AI 提示詞
      const prompt = this.buildAnalysisPrompt(callData, transcript)

      // 調用 BossJy-99 AI 分析
      const response = await this.bossJy99.chat(prompt)
      const action = this.bossJy99.parseAction(response)

      if (action) {
        return {
          intent: action.action,
          message: action.message,
          actions: [action]
        }
      }

      // 如果解析失敗，返回預設回應
      return {
        intent: 'inquiry',
        message: response || '您好，感謝來電九九瓦斯行。我已經記錄下您的需求，會盡快為您處理。',
        actions: [
          {type: 'record_call', data: {callId: callData.callId, transcript}}
        ]
      }
    } catch (error) {
      console.error('AI 分析失敗:', error)
      // 失敗時返回預設回應
      return {
        intent: 'inquiry',
        message: '您好，感謝來電九九瓦斯行。我已經記錄下您的需求，會盡快為您處理。',
        actions: [
          {type: 'record_call', data: {callId: callData.callId, transcript}}
        ]
      }
    }
  }

  /**
   * 構建 AI 分析提示詞
   */
  private buildAnalysisPrompt(callData: IncomingCall, transcript?: string): string {
    const customerPhone = callData.fromNumber
    const time = new Date(callData.timestamp).toLocaleString('zh-TW')

    return `你是九九瓦斯行的 AI 語音助手。

**來電資訊：**
- 電話號碼：${customerPhone}
- 來電時間：${time}
- 客戶說的話：${transcript || '(正在轉錄...)'}

**你的任務：**
1. 理解客戶的需求（訂瓦斯、查訂單、查庫存、投訴、其他）
2. 判斷需要執行什麼操作
3. 生成友善的語音回覆

**可執行的操作：**
- create_order: 創建瓦斯訂單
- check_order: 查詢訂單狀態
- check_inventory: 查詢庫存
- record_complaint: 記錄客戶投訴
- record_inquiry: 記錄一般諮詢
- transfer_human: 轉接人工客服

請以 JSON 格式回應：
\`\`\`json
{
  "intent": "操作類型",
  "message": "給客戶的友善回覆",
  "actions": [{"type": "操作類型", "data": {操作數據}}]
}
\`\`\`
`
  }

  /**
   * 執行業務動作
   */
  private async executeActions(actions: Array<{type: string, data: any}>, callData: IncomingCall): Promise<Array<{type: string, data: any}>> {
    const results: Array<{type: string, data: any}> = []

    // 獲取 API 基礎 URL（從環境變量或使用預設）
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:9999/api'

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_order': {
            // 呼叫 API 創建訂單
            const response = await fetch(`${apiBaseUrl}/orders`, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify(action.data),
            })
            if (response.ok) {
              const order = await response.json()
              results.push({type: 'order_created', data: order})
            } else {
              results.push({type: 'order_failed', data: {error: '訂單創建失敗'}})
            }
            break
          }

          case 'check_order': {
            // 呼叫 API 查詢訂單
            const customerId = action.data.customerId
            const response = await fetch(`${apiBaseUrl}/orders?customerId=${customerId}`)
            if (response.ok) {
              const orders = await response.json()
              results.push({type: 'order_info', data: orders})
            } else {
              results.push({type: 'order_query_failed', data: {error: '查詢訂單失敗'}})
            }
            break
          }

          case 'check_inventory': {
            // 呼叫 API 查詢庫存
            const response = await fetch(`${apiBaseUrl}/inventory`)
            if (response.ok) {
              const inventory = await response.json()
              results.push({type: 'inventory_info', data: inventory})
            } else {
              results.push({type: 'inventory_query_failed', data: {error: '查詢庫存失敗'}})
            }
            break
          }

          case 'record_complaint':
          case 'record_inquiry':
            results.push({type: 'call_recorded', data: action.data})
            break

          case 'transfer_human':
            results.push({type: 'transfer_requested', data: action.data})
            break

          default:
            console.warn('未知操作類型:', action.type)
        }
      } catch (error) {
        console.error('執行操作失敗:', action.type, error)
        results.push({type: 'action_failed', data: {action: action.type, error: String(error)}})
      }
    }

    return results
  }

  /**
   * 生成語音回覆 (TTS) - 使用智譜 TTS-1
   */
  private async generateVoiceResponse(text: string): Promise<string> {
    try {
      console.log('🔊 正在使用 TTS-1 生成語音:', text)

      const response = await fetch(GLM_TTS_CONFIG.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GLM_TTS_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: GLM_TTS_CONFIG.model,
          text,
          voice: GLM_TTS_CONFIG.voice,
          speed: GLM_TTS_CONFIG.speed,
          pitch: GLM_TTS_CONFIG.pitch,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('GLM TTS error:', error)
        return text // 失敗時返回原文字
      }

      const data = await response.json()

      // 智譜 TTS 可能返回音頻 URL 或 base64 數據
      if (data.audio_url) {
        console.log('✅ 語音生成完成:', data.audio_url)
        return data.audio_url
      } else if (data.audio) {
        console.log('✅ 語音生成完成 (base64)')
        return data.audio
      } else {
        return text // 沒有音頻時返回原文字
      }
    } catch (error) {
      console.error('TTS error:', error)
      return text // 失敗時返回原文字
    }
  }

  /**
   * 記錄來電
   */
  private async recordCall(
    callData: IncomingCall,
    transcript: string | undefined,
    aiResponse: any,
    actions: Array<{type: string, data: any}>
  ): Promise<void> {
    // 獲取 API 基礎 URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://localhost:9999/api'

    try {
      // 準備來電記錄數據
      const callRecord = {
        callId: callData.callId,
        phone: callData.fromNumber,
        toNumber: callData.toNumber,
        timestamp: new Date(callData.timestamp).toISOString(),
        recordingUrl: callData.recordingUrl,
        transcript: transcript || '',
        intent: aiResponse.intent || 'unknown',
        message: aiResponse.message || '',
        actions: JSON.stringify(actions),
      }

      // 呼叫 API 記錄來電
      const response = await fetch(`${apiBaseUrl}/calls`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(callRecord),
      })

      if (response.ok) {
        console.log('📝 來電記錄已保存')
      } else {
        console.warn('⚠️ 來電記錄保存失敗，僅記錄到日誌')
      }
    } catch (error) {
      console.error('記錄來電失敗:', error)
    }

    // 同時記錄到日誌
    console.log('📝 記錄來電:', {
      callId: callData.callId,
      phone: callData.fromNumber,
      transcript,
      aiResponse,
      actions,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * 生成語音服務 Webhook 回應
   */
  generateWebhookResponse(result: {
    response: string
    actions: Array<{type: string, data: any}>
  }): any {
    return {
      action: 'play',
      text: result.response,
      // 根據語音服務供應商調整格式
    }
  }
}

// ========================================
// 導出單例
// ========================================

let voiceAssistantInstance: VoiceAssistantService | null = null

export function getVoiceAssistant(config?: VoiceServiceConfig): VoiceAssistantService {
  if (!voiceAssistantInstance && config) {
    voiceAssistantInstance = new VoiceAssistantService(config)
  }
  return voiceAssistantInstance!
}

/**
 * 初始化語音助手（從環境變量）
 */
export function initVoiceAssistantFromEnv(): VoiceAssistantService {
  const config: VoiceServiceConfig = {
    provider: (process.env.VOICE_PROVIDER as any) || 'eightwai',
    webhookUrl: process.env.VOICE_WEBHOOK_URL || '',
    apiKey: process.env.VOICE_API_KEY || '',
    maxCallDuration: parseInt(process.env.VOICE_MAX_DURATION || '300'),
    noAnswerTimeout: parseInt(process.env.VOICE_NO_ANSWER_TIMEOUT || '180'),
  }

  return getVoiceAssistant(config)
}
