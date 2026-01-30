/**
 * Phase 1: 文字转语音 API
 * POST /api/voice/tts
 *
 * 特性：
 * - Edge TTS (免費微軟語音，自然度⭐⭐⭐⭐⭐)
 * - 備用：Azure TTS (需要 API Key)
 * - 緩存：sha1(text+voice+rate+pitch)
 * - 返回：audio/mpeg
 */

import { NextRequest, NextResponse } from 'next/server'
import { textToSpeech, EDGE_VOICES, DEFAULT_VOICE } from '@/lib/edge-tts'

// Azure 備用配置
const AZ_SPEECH_KEY = process.env.AZ_SPEECH_KEY || ''
const AZ_SPEECH_REGION = process.env.AZ_SPEECH_REGION || 'southeastasia'
const AZ_TTS_VOICE = process.env.AZ_TTS_VOICE || 'zh-CN-XiaoxiaoNeural'

const CACHE_TTL_HOURS = 24

/**
 * POST /api/voice/tts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = body.text || ''

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'text 不能為空' }, { status: 400 })
    }

    // 限制文本長度
    if (text.length > 1000) {
      return NextResponse.json(
        { error: 'text 超過最大長度 1000 字元' },
        { status: 400 }
      )
    }

    // 參數
    const voice = body.voice || DEFAULT_VOICE
    const rate = body.rate || '+0%'
    const pitch = body.pitch || '+0Hz'

    // 優先使用 Edge TTS
    try {
      console.log('[TTS] Using Edge TTS:', voice)
      const audioBuffer = await textToSpeech(text, voice, rate, pitch)

      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-TTS-Provider': 'Edge',
          'X-TTS-Voice': voice,
          'Cache-Control': `public, max-age=${CACHE_TTL_HOURS * 3600}`,
        },
      })
    } catch (edgeError) {
      console.error('[TTS] Edge TTS failed:', edgeError)
    }

    // 備用：Azure TTS (如果有配置)
    if (AZ_SPEECH_KEY) {
      return await azureTTS(text, voice, rate, pitch)
    }

    // 兩個都失敗
    return NextResponse.json(
      { error: '語音合成失敗，請稍後重試' },
      { status: 500 }
    )

  } catch (error: any) {
    console.error('[TTS] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * Azure TTS 備用
 */
async function azureTTS(text: string, voice: string, rate: string, pitch: string): Promise<NextResponse> {
  const url = `https://${AZ_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`

  const cleanText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW">
    <voice name="${voice}">
      <prosody rate="${rate}" pitch="${pitch}">${cleanText}</prosody>
    </voice>
  </speak>`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZ_SPEECH_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    },
    body: ssml,
  })

  if (!response.ok) {
    throw new Error(`Azure TTS 錯誤: ${response.status}`)
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer())

  return new NextResponse(audioBuffer, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'X-TTS-Provider': 'Azure',
      'X-TTS-Voice': voice,
    },
  })
}

/**
 * GET /api/voice/tts
 * 返回配置信息
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/voice/tts',
    method: 'POST',
    contentType: 'audio/mpeg',
    providers: {
      primary: {
        name: 'Edge TTS',
        voice: DEFAULT_VOICE,
        voices: EDGE_VOICES,
      },
      fallback: {
        name: 'Azure Speech',
        voice: AZ_TTS_VOICE,
        requiresKey: !AZ_SPEECH_KEY,
      },
    },
    params: {
      text: '要轉換的文字 (必填，最大 1000 字元)',
      voice: '語音，可選值：' + Object.keys(EDGE_VOICES).join(', '),
      rate: '語速，例如：+0% (預設), -10%, +20%',
      pitch: '音調，例如：+0% (預設), -5%, +10%',
    },
  })
}
