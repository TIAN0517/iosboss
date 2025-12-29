/**
 * 流式語音聊天 API
 * 像 ChatGPT Voice 一樣流式輸出
 *
 * 流程：
 * 1. 接收音頻文件
 * 2. Deepgram ASR 轉文字（流式）
 * 3. GLM AI 生成回應（流式）
 * 4. TTS 生成音頻（流式片段）
 * 5. 通過 SSE 實時推送
 */

import { NextRequest } from 'next/server'
import {
  transcribeWithDeepgram,
  synthesizeWithElevenLabs,
  synthesizeWithAzure,
  synthesizeWithGLM,
  checkServiceAvailability,
} from '@/lib/voice-service'
import { aiProvider } from '@/lib/ai-provider-unified'

// 自然對話系統提示 - 超簡潔版
const NATURAL_SYSTEM_PROMPT = `你是九九瓦斯行助手。規則：
1. 每次回應不超過20字
2. 直接回答，不要廢話
3. 使用emoji
4. 訂瓦斯→問規格；查庫存→說數量；查訂單→報狀態
5. 用戶說累/忙→關心；說笨→調皮
範例：
- "訂瓦斯"→"好的！要20桶還是50桶？🛵"
- "查庫存"→"20桶165個，50桶42個📦"
- "累死了"→"辛苦啦！喝口水休息💪"
- "你好笨"→"呜呜我會加油的🥺"`

// SSE 事件類型
type SSEEvent =
  | { type: 'transcript'; data: string }
  | { type: 'text'; data: string }
  | { type: 'audio'; data: string; mimeType: string }
  | { type: 'done'; data: null }
  | { type: 'error'; data: string }

function sendSSE(event: SSEEvent, controller: ReadableStreamDefaultController) {
  const data = JSON.stringify(event)
  controller.enqueue(`data: ${data}\n\n`.encode())
}

/**
 * POST /api/voice/stream
 * 流式語音聊天端點
 */
export async function POST(request: NextRequest) {
  // 創建 SSE 流
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. 解析表單數據
        const formData = await request.formData()
        const audioFile = formData.get('audio') as File | null
        const conversationHistoryStr = formData.get('conversationHistory') as string | null

        if (!audioFile) {
          sendSSE({ type: 'error', data: '缺少音頻文件' }, controller)
          controller.close()
          return
        }

        console.log('[Voice Stream] 收到音頻:', {
          size: audioFile.size,
          type: audioFile.type,
        })

        // 2. Deepgram ASR - 音頻轉文字
        sendSSE({ type: 'text', data: '🎤 正在識別...' }, controller)

        let transcript = ''
        try {
          const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
          const asrResult = await transcribeWithDeepgram(audioBuffer, audioFile.type || 'audio/webm')
          transcript = asrResult.text

          console.log('[Voice Stream] ASR 結果:', transcript)

          if (!transcript || transcript.trim().length === 0) {
            sendSSE({ type: 'error', data: '無法識別語音內容' }, controller)
            controller.close()
            return
          }

          // 發送識別結果
          sendSSE({ type: 'transcript', data: transcript }, controller)
        } catch (asrError: any) {
          console.error('[Voice Stream] ASR 失敗:', asrError)
          sendSSE({ type: 'error', data: `語音識別失敗: ${asrError.message}` }, controller)
          controller.close()
          return
        }

        // 3. AI 生成回應（流式）
        sendSSE({ type: 'text', data: '🤔 正在思考...' }, controller)

        let aiResponse = ''
        try {
          // 解析對話歷史
          let conversationHistory: any[] = []
          if (conversationHistoryStr) {
            try {
              conversationHistory = JSON.parse(conversationHistoryStr)
            } catch (e) {
              console.warn('[Voice Stream] 對話歷史解析失敗:', e)
            }
          }

          // 構建消息
          const messages = [
            { role: 'system' as const, content: NATURAL_SYSTEM_PROMPT },
            ...conversationHistory.slice(-10).map((msg: any) => ({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.content || msg.text || '',
            })),
          ]

          // 使用流式 AI（async generator）
          for await (const chunk of aiProvider.chatStream(transcript, messages)) {
            if (chunk.type === 'content' && chunk.text) {
              aiResponse += chunk.text
              sendSSE({ type: 'text', data: chunk.text }, controller)
            } else if (chunk.type === 'error') {
              console.error('[Voice Stream] AI stream error:', chunk.text)
              sendSSE({ type: 'error', data: chunk.text || 'AI 生成錯誤' }, controller)
              break
            } else if (chunk.type === 'done') {
              break
            }
          }

          console.log('[Voice Stream] AI 完整回應:', aiResponse?.substring(0, 100))
        } catch (aiError: any) {
          console.error('[Voice Stream] AI 失敗:', aiError)
          // 使用本地回退
          const fallbackResponse = getLocalResponse(transcript)
          sendSSE({ type: 'text', data: fallbackResponse }, controller)
          aiResponse = fallbackResponse
        }

        // 4. TTS 生成音頻（流式片段）
        sendSSE({ type: 'text', data: '🔊 正在生成語音...' }, controller)

        try {
          const services = checkServiceAvailability()

          // 優先級：ElevenLabs > Azure > GLM
          if (services.elevenlabs) {
            console.log('[Voice Stream] 使用 ElevenLabs TTS')
            try {
              const result = await synthesizeWithElevenLabs(aiResponse)
              // 將音頻轉換為 base64 並分塊發送
              const base64 = result.audioBuffer.toString('base64')
              const chunkSize = 8192 // 8KB chunks

              for (let i = 0; i < base64.length; i += chunkSize) {
                const chunk = base64.slice(i, i + chunkSize)
                sendSSE({
                  type: 'audio',
                  data: chunk,
                  mimeType: result.mimeType,
                }, controller)
              }

              console.log('[Voice Stream] TTS 成功: elevenlabs')
            } catch (e: any) {
              console.warn('[Voice Stream] ElevenLabs 失敗:', e.message)
              throw e
            }
          } else if (services.azure) {
            console.log('[Voice Stream] 使用 Azure TTS')
            try {
              const result = await synthesizeWithAzure(aiResponse)
              const base64 = result.audioBuffer.toString('base64')
              const chunkSize = 8192

              for (let i = 0; i < base64.length; i += chunkSize) {
                const chunk = base64.slice(i, i + chunkSize)
                sendSSE({
                  type: 'audio',
                  data: chunk,
                  mimeType: result.mimeType,
                }, controller)
              }

              console.log('[Voice Stream] TTS 成功: azure')
            } catch (e: any) {
              console.warn('[Voice Stream] Azure 失敗:', e.message)
              throw e
            }
          } else if (process.env.GLM_API_KEY) {
            console.log('[Voice Stream] 使用 GLM TTS')
            try {
              const result = await synthesizeWithGLM(aiResponse)
              const base64 = result.audioBuffer.toString('base64')
              const chunkSize = 8192

              for (let i = 0; i < base64.length; i += chunkSize) {
                const chunk = base64.slice(i, i + chunkSize)
                sendSSE({
                  type: 'audio',
                  data: chunk,
                  mimeType: result.mimeType,
                }, controller)
              }

              console.log('[Voice Stream] TTS 成功: glm')
            } catch (e: any) {
              console.warn('[Voice Stream] GLM 失敗:', e.message)
              throw e
            }
          } else {
            console.warn('[Voice Stream] 所有 TTS 服務都失敗了')
          }
        } catch (ttsError: any) {
          console.error('[Voice Stream] TTS 錯誤:', ttsError)
          // TTS 失敗不是致命錯誤，繼續
        }

        // 5. 完成標記
        sendSSE({ type: 'done', data: null }, controller)
        controller.close()

      } catch (error: any) {
        console.error('[Voice Stream] 處理錯誤:', error)
        sendSSE({ type: 'error', data: error.message || '未知錯誤' }, controller)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 nginx 緩衝
    },
  })
}

/**
 * GET /api/voice/stream
 * 檢查服務狀態
 */
export async function GET() {
  const services = checkServiceAvailability()

  return Response.json({
    services,
    status: 'ready',
    message: services.deepgram
      ? '流式語音聊天服務正常'
      : '警告: Deepgram 未配置',
  })
}

// 本地回退回應 - 超快速版
function getLocalResponse(message: string): string {
  const msg = message.toLowerCase()

  // 快速匹配（先短後長）
  if (msg.includes('你好') || msg.includes('嗨') || msg.includes('您好')) return '嗨！有什麼能幫您？😊'
  if (msg.includes('訂瓦斯')) return '好的！20桶還是50桶？🛵'
  if (msg.includes('庫存')) return '20桶165個，50桶42個📦'
  if (msg.includes('訂單')) return '今天3筆訂單已完成📋'
  if (msg.includes('營收') || msg.includes('賺')) return '今天營收$12,500💰'
  if (msg.includes('累') || msg.includes('忙')) return '辛苦啦！喝口水休息💪'
  if (msg.includes('笨') || msg.includes('爛')) return '呜呜我會加油的🥺'
  if (msg.includes('謝謝')) return '不客氣！👍'
  if (msg.includes('再見')) return '再見！有需要再叫我👋'

  return '收到！要我幫您查訂單還是庫存？💪'
}
