/**
 * 实时语音 WebSocket API
 *
 * 功能：
 * 1. 浏览器通过 WebSocket 发送音频数据
 * 2. 服务端转发到 Deepgram 进行实时 ASR
 * 3. 收到最终结果后调用 AI 获取回复
 * 4. 使用 Azure TTS 生成语音回复
 * 5. 返回音频数据给浏览器
 *
 * 消息格式：
 * 客户端 -> 服务端: { type: "audio", data: "<base64 audio>" }
 * 服务端 -> 客户端: { type: "interim", text: "..." }
 *                     { type: "final", text: "..." }
 *                     { type: "ai_text", text: "..." }
 *                     { type: "ai_audio", data: "<base64 mp3>" }
 *                     { type: "error", message: "..." }
 */

import { NextRequest } from 'next/server'
import { Server } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { createServer } from 'http'
import { DEEPGRAM_CONFIG, AZURE_CONFIG } from '@/lib/voice-service'

// WebSocket 升级处理
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Deepgram WebSocket URL
function getDeepgramWSUrl() {
  const params = new URLSearchParams({
    model: DEEPGRAM_CONFIG.model,
    language: DEEPGRAM_CONFIG.language,
    smart_format: DEEPGRAM_CONFIG.smartFormat.toString(),
    interim_results: 'true',
    punctuate: 'true',
    vad_events: 'true',
    endpointing: '300',
  })

  return `wss://api.deepgram.com/v1/listen?${params}`
}

/**
 * 实时语音 API (使用 HTTP 升级 WebSocket)
 *
 * 由于 Next.js App Router 不直接支持 WebSocket，
 * 我们通过以下方式实现：
 * 1. 接收升级请求
 * 2. 创建 WebSocket 服务器
 * 3. 桥接客户端和 Deepgram
 */

export async function GET(request: NextRequest) {
  // Next.js App Router 不直接支持 WebSocket
  // 这里返回配置信息，实际 WS 需要单独的服务器
  const isAvailable = {
    deepgram: !!DEEPGRAM_CONFIG.apiKey,
    azure: !!AZURE_CONFIG.apiKey,
  }

  return new Response(
    JSON.stringify({
      status: 'ready',
      message: 'Realtime voice service',
      websocket: 'Use ws://localhost:9999/api/voice/ws for WebSocket connection',
      services: {
        deepgram: {
          available: isAvailable.deepgram,
          model: DEEPGRAM_CONFIG.model,
          language: DEEPGRAM_CONFIG.language,
        },
        azure: {
          available: isAvailable.azure,
          voice: AZURE_CONFIG.voice,
          region: AZURE_CONFIG.region,
        },
      },
      client_example: {
        connect_to: 'ws://localhost:9999/api/voice/ws',
        send_format: { type: 'audio', data: '<base64 audio data>' },
        receive_format: [
          { type: 'interim', text: 'partial transcript...' },
          { type: 'final', text: 'final transcript' },
          { type: 'ai_text', text: 'AI response' },
          { type: 'ai_audio', data: 'base64 mp3' },
        ],
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    }
  )
}

/**
 * POST /api/voice/realtime
 *
 * 预录音处理（非实时）
 * 用于处理完整的音频文件
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const stream = formData.get('stream') === 'true'

    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: 'Missing audio file' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 动态导入语音服务
    const {
      transcribeWithDeepgram,
      synthesizeWithAzure,
    } = await import('@/lib/voice-service')

    // 1. ASR: 音频转文字
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const mimeType = audioFile.type || 'audio/mpeg'

    const asrResult = await transcribeWithDeepgram(audioBuffer, mimeType)

    if (!asrResult.text || asrResult.text.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: '无法识别语音内容',
          transcript: '',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. AI: 处理文字
    const aiResponse = await callAI(asrResult.text)

    // 3. TTS: 生成语音（如果需要）
    let audioBase64: string | undefined
    if (AZURE_CONFIG.apiKey) {
      try {
        const ttsResult = await synthesizeWithAzure(aiResponse.text)
        audioBase64 = ttsResult.audioBuffer.toString('base64')
      } catch (ttsError) {
        console.warn('[Voice] TTS failed:', ttsError)
      }
    }

    return new Response(
      JSON.stringify({
        transcript: asrResult.text,
        confidence: asrResult.confidence,
        ai_response: aiResponse.text,
        audio: audioBase64 ? {
          data: audioBase64,
          format: 'mp3',
          mime: 'audio/mpeg',
        } : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[Voice] Realtime POST error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || '语音处理失败',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * 调用 AI 获取回复
 */
async function callAI(text: string): Promise<{ text: string }> {
  // 调用内部 AI API
  const aiEndpoint = process.env.AI_ENDPOINT_INTERNAL || '/api/ai/chat'

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}${aiEndpoint}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        conversationHistory: [],
        stream: false,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`)
  }

  const data = await response.json()
  return {
    text: data.content || data.text || '抱歉，我暂时无法回复。',
  }
}
