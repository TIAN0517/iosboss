/**
 * Phase 2: 实时语音 WebSocket 服务
 *
 * 功能：
 * 1. 浏览器连接到此 WS 服务器
 * 2. 服务端作为 Proxy 连接到 Deepgram WS
 * 3. 双向转发音频和识别结果
 * 4. 收到 final 结果后调用 AI -> TTS -> 返回音频
 *
 * 环境变量：
 * - VOICE_REALTIME_PORT: 监听端口（默认 3006）
 * - DG_API_KEY: Deepgram API Key
 * - DG_MODEL, DG_LANGUAGE: Deepgram 配置
 * - AI_INTERNAL_ENDPOINT: AI 接口地址
 * - AZ_SPEECH_KEY, AZ_SPEECH_REGION: Azure TTS 配置
 */

import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import fetch from 'node-fetch'

const PORT = parseInt(process.env.VOICE_REALTIME_PORT || '3006')
const DG_API_KEY = process.env.DG_API_KEY || ''
const DG_MODEL = process.env.DG_MODEL || 'nova-3'
const DG_LANGUAGE = process.env.DG_LANGUAGE || 'zh-CN'

// AI 端點配置（容器內使用服務名）
// AI_INTERNAL_ENDPOINT 可以是完整 URL (http://jyt-gas-app:9999/api/ai/chat)
// 或者是相對路徑 (/api/ai/chat)，需要配合 APP_URL 使用
const AI_INTERNAL_ENDPOINT = process.env.AI_INTERNAL_ENDPOINT || '/api/ai/chat'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://jyt-gas-app:9999'

/**
 * 獲取 AI 端點完整 URL
 */
function getAIEndpoint(): string {
  if (AI_INTERNAL_ENDPOINT.startsWith('http://') || AI_INTERNAL_ENDPOINT.startsWith('https://')) {
    return AI_INTERNAL_ENDPOINT
  }
  return `${APP_URL}${AI_INTERNAL_ENDPOINT}`
}

// Azure TTS 配置
const AZ_SPEECH_KEY = process.env.AZ_SPEECH_KEY || ''
const AZ_SPEECH_REGION = process.env.AZ_SPEECH_REGION || 'southeastasia'
const AZ_TTS_VOICE = process.env.AZ_TTS_VOICE || 'zh-CN-XiaoxiaoNeural'
const AZ_TTS_STYLE = process.env.AZ_TTS_STYLE || 'chat'
const AZ_TTS_RATE = process.env.AZ_TTS_RATE || '-5%'

// 限制配置
const MAX_CONNECTION_DURATION = 5 * 60 * 1000 // 5 分钟
const MAX_DATA_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_CLIENTS = 100

// 统计
let activeConnections = 0
let totalConnections = 0

/**
 * Deepgram WebSocket URL
 */
function getDeepgramWSUrl() {
  const params = new URLSearchParams({
    model: DG_MODEL,
    language: DG_LANGUAGE,
    smart_format: 'true',
    interim_results: 'true',
    punctuate: 'true',
    vad_events: 'true',
    endpointing: '300',
  })

  return `wss://api.deepgram.com/v1/listen?${params}`
}

/**
 * 客户端连接状态
 */
interface ClientConnection {
  ws: WebSocket
  deepgram: WebSocket | null
  connectTime: number
  dataReceived: number
  transcriptBuffer: string
  timeout: NodeJS.Timeout | null
}

const clients = new Map<WebSocket, ClientConnection>()

/**
 * 清理客户端连接
 */
function cleanupClient(clientWs: WebSocket) {
  const client = clients.get(clientWs)
  if (!client) return

  // 清理超时
  if (client.timeout) {
    clearTimeout(client.timeout)
  }

  // 关闭 Deepgram 连接
  if (client.deepgram) {
    try {
      client.deepgram.close()
    } catch {}
  }

  // 关闭客户端连接
  try {
    clientWs.close()
  } catch {}

  clients.delete(clientWs)
  activeConnections--
  console.log(`[Voice WS] Client disconnected. Active: ${activeConnections}`)
}

/**
 * 设置超时清理
 */
function setTimeoutCleanup(clientWs: WebSocket) {
  const client = clients.get(clientWs)
  if (!client) return

  if (client.timeout) {
    clearTimeout(client.timeout)
  }

  client.timeout = setTimeout(() => {
    console.log(`[Voice WS] Connection timeout (${MAX_CONNECTION_DURATION}ms)`)
    cleanupClient(clientWs)
  }, MAX_CONNECTION_DURATION)
}

/**
 * 调用 AI 获取回复
 */
async function callAI(text: string): Promise<string> {
  const aiEndpoint = getAIEndpoint()
  const response = await fetch(aiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: text,
      conversationHistory: [],
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`)
  }

  const data = await response.json() as any
  return data.content || data.text || '抱歉，我暂时无法回复。'
}

/**
 * 调用 Azure TTS
 */
async function callAzureTTS(text: string): Promise<string | null> {
  if (!AZ_SPEECH_KEY) return null

  try {
    const cleanText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
        xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
      <voice name="${AZ_TTS_VOICE}">
        <mstts:express-as style="${AZ_TTS_STYLE}">
          <prosody rate="${AZ_TTS_RATE}">
            ${cleanText}
          </prosody>
        </mstts:express-as>
      </voice>
    </speak>`

    const response = await fetch(
      `https://${AZ_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZ_SPEECH_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        },
        body: ssml,
      }
    )

    if (!response.ok) {
      console.warn('[Voice WS] TTS failed:', response.status)
      return null
    }

    const buffer = await response.buffer()
    return buffer.toString('base64')
  } catch (error) {
    console.warn('[Voice WS] TTS error:', error)
    return null
  }
}

/**
 * 启动 WebSocket 服务器
 */
function startServer() {
  const httpServer = createServer()
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/voice',
  })

  wss.on('connection', (clientWs, req) => {
    // 检查连接数限制
    if (activeConnections >= MAX_CLIENTS) {
      console.log('[Voice WS] Max clients reached, rejecting connection')
      clientWs.close(1013, 'Server overloaded')
      return
    }

    activeConnections++
    totalConnections++
    const clientIp = req.socket.remoteAddress

    console.log(`[Voice WS] Client connected: ${clientIp}. Active: ${activeConnections}/${MAX_CLIENTS}`)

    // 创建客户端状态
    const client: ClientConnection = {
      ws: clientWs,
      deepgram: null,
      connectTime: Date.now(),
      dataReceived: 0,
      transcriptBuffer: '',
      timeout: null,
    }

    clients.set(clientWs, client)
    setTimeoutCleanup(clientWs)

    // 连接到 Deepgram
    try {
      const dgUrl = getDeepgramWSUrl()
      console.log(`[Voice WS] Connecting to Deepgram...`)

      const deepgramWs = new WebSocket(dgUrl, {
        headers: {
          'Authorization': `Token ${DG_API_KEY}`,
        },
      })

      client.deepgram = deepgramWs

      // Deepgram 打开
      deepgramWs.on('open', () => {
        console.log('[Voice WS] Deepgram connected')
        client.ws.send(JSON.stringify({ type: 'connected', message: 'Connected to Deepgram' }))
      })

      // Deepgram 消息 -> 转发给客户端
      deepgramWs.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString())

          // 转发 interim 结果
          if (message.channel?.alternatives?.[0]) {
            const alt = message.channel.alternatives[0]
            const isFinal = message.is_final

            if (isFinal) {
              // Final 结果
              client.transcriptBuffer += alt.transcript || ''

              client.ws.send(JSON.stringify({
                type: 'final',
                text: alt.transcript,
                full_text: client.transcriptBuffer,
              }))

              // 调用 AI -> TTS
              try {
                const aiText = await callAI(client.transcriptBuffer)
                client.ws.send(JSON.stringify({
                  type: 'ai_text',
                  text: aiText,
                }))

                // 生成 TTS
                const audioBase64 = await callAzureTTS(aiText)
                if (audioBase64) {
                  client.ws.send(JSON.stringify({
                    type: 'ai_audio',
                    mime: 'audio/mpeg',
                    base64: audioBase64,
                  }))
                }

                // 清空 buffer
                client.transcriptBuffer = ''
              } catch (aiError) {
                console.error('[Voice WS] AI/TTS error:', aiError)
                client.ws.send(JSON.stringify({
                  type: 'error',
                  message: 'AI 或 TTS 处理失败',
                }))
              }
            } else {
              // Interim 结果
              client.ws.send(JSON.stringify({
                type: 'interim',
                text: alt.transcript,
              }))
            }
          }
        } catch (error) {
          console.error('[Voice WS] Deepgram message error:', error)
        }
      })

      // Deepgram 错误
      deepgramWs.on('error', (error) => {
        console.error('[Voice WS] Deepgram error:', error)
        client.ws.send(JSON.stringify({
          type: 'error',
          message: 'Deepgram connection error',
        }))
      })

      // Deepgram 关闭
      deepgramWs.on('close', () => {
        console.log('[Voice WS] Deepgram closed')
        cleanupClient(clientWs)
      })

    } catch (error) {
      console.error('[Voice WS] Failed to connect to Deepgram:', error)
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to connect to Deepgram',
      }))
      cleanupClient(clientWs)
      return
    }

    // 客户端消息 -> 转发给 Deepgram
    clientWs.on('message', (data: Buffer) => {
      // 检查数据大小限制
      client.dataReceived += data.length
      if (client.dataReceived > MAX_DATA_SIZE) {
        console.log(`[Voice WS] Max data size exceeded (${MAX_DATA_SIZE} bytes)`)
        cleanupClient(clientWs)
        return
      }

      // 判断消息类型
      try {
        const message = JSON.parse(data.toString())

        if (message.type === 'audio' && message.data) {
          // Base64 音频 -> 解码 -> 转发给 Deepgram
          const audioBuffer = Buffer.from(message.data, 'base64')
          if (client.deepgram?.readyState === WebSocket.OPEN) {
            client.deepgram.send(audioBuffer)
          }
        } else if (message.type === 'ping') {
          // 心跳
          client.ws.send(JSON.stringify({ type: 'pong' }))
        }
      } catch {
        // 原始二进制音频 -> 直接转发
        if (client.deepgram?.readyState === WebSocket.OPEN) {
          client.deepgram.send(data)
        }
      }

      // 重置超时
      setTimeoutCleanup(clientWs)
    })

    // 客户端关闭
    clientWs.on('close', () => {
      console.log('[Voice WS] Client closed')
      cleanupClient(clientWs)
    })

    // 客户端错误
    clientWs.on('error', (error) => {
      console.error('[Voice WS] Client error:', error)
      cleanupClient(clientWs)
    })
  })

  // 定期清理过期连接
  setInterval(() => {
    const now = Date.now()
    for (const [ws, client] of clients.entries()) {
      if (now - client.connectTime > MAX_CONNECTION_DURATION) {
        console.log('[Voice WS] Cleaning up expired connection')
        cleanupClient(ws)
      }
    }
  }, 60000)

  // 启动服务器
  httpServer.listen(PORT, () => {
    console.log(`[Voice WS] Real-time voice service listening on port ${PORT}`)
    console.log(`[Voice WS] WebSocket path: /voice`)
    console.log(`[Voice WS] Connect to: ws://localhost:${PORT}/voice`)
    console.log(`[Voice WS] DG API Key: ${DG_API_KEY ? 'configured' : 'NOT CONFIGURED'}`)
    console.log(`[Voice WS] Azure TTS: ${AZ_SPEECH_KEY ? 'configured' : 'NOT CONFIGURED'}`)
    console.log(`[Voice WS] AI Endpoint: ${getAIEndpoint()}`)
  })
}

// 启动
if (!DG_API_KEY) {
  console.error('[Voice WS] ERROR: DG_API_KEY not configured!')
  process.exit(1)
}

startServer()

// 优雅退出
process.on('SIGTERM', () => {
  console.log('[Voice WS] SIGTERM received, closing connections...')
  for (const [ws] of clients.entries()) {
    cleanupClient(ws)
  }
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[Voice WS] SIGINT received, closing connections...')
  for (const [ws] of clients.entries()) {
    cleanupClient(ws)
  }
  process.exit(0)
})
