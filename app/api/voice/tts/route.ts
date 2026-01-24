/**
 * Phase 1: 文字转语音 API
 * POST /api/voice/tts
 *
 * 特性：
 * - Azure TTS with mstts:express-as style="chat"（真人聊天腔）
 * - 自动降级（不支持 style 时去掉 express-as）
 * - 缓存：sha1(text+voice+style+format+rate+pitch)
 * - 返回：audio/mpeg（直接返回 bytes，不是 JSON）
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// ========================================
// 环境变量
// ========================================

const AZ_SPEECH_KEY = process.env.AZ_SPEECH_KEY || ''
const AZ_SPEECH_KEYS = process.env.AZ_SPEECH_KEYS || ''
const AZ_SPEECH_REGION = process.env.AZ_SPEECH_REGION || 'southeastasia'
const AZ_TTS_VOICE = process.env.AZ_TTS_VOICE || 'zh-CN-XiaoxiaoNeural'
const AZ_TTS_STYLE = process.env.AZ_TTS_STYLE || 'chat'
const AZ_TTS_STYLE_DEGREE = parseFloat(process.env.AZ_TTS_STYLE_DEGREE || '1.15')
const AZ_TTS_RATE = process.env.AZ_TTS_RATE || '-5%'
const AZ_TTS_PITCH = process.env.AZ_TTS_PITCH || '+0%'
const AZ_TTS_FORMAT = process.env.AZ_TTS_FORMAT || 'audio-16khz-128kbitrate-mono-mp3'

// 缓存配置
const AUDIO_CACHE_DIR = '/tmp/tts-cache'
const MAX_CACHE_SIZE = 100
const CACHE_TTL_HOURS = 24

// 当前 Key 轮替索引
let azureKeyIndex = 0

/**
 * 获取下一个 Azure Key（轮替）
 */
function getNextAzureKey(): string {
  const keys = (AZ_SPEECH_KEYS || AZ_SPEECH_KEY).split(',').filter(k => k.trim())
  if (keys.length === 0) return ''
  const key = keys[azureKeyIndex]
  azureKeyIndex = (azureKeyIndex + 1) % keys.length
  return key
}

/**
 * 生成缓存 key
 */
function generateCacheKey(
  text: string,
  voice: string,
  style: string,
  styleDegree: number,
  rate: string,
  pitch: string,
  format: string
): string {
  const data = `${text}|${voice}|${style}|${styleDegree}|${rate}|${pitch}|${format}`
  return crypto.createHash('sha1').update(data).digest('hex')
}

/**
 * 获取缓存文件路径
 */
function getCachePath(cacheKey: string): string {
  return `${AUDIO_CACHE_DIR}/tts_${cacheKey}.mp3`
}

/**
 * 构建 SSML（带 mstts:express-as style="chat"）
 */
function buildSSML(
  text: string,
  voice: string,
  style: string,
  styleDegree: number,
  rate: string,
  pitch: string,
  useExpressAs = true
): string {
  // 清理文本中的 SSML 特殊字符
  const cleanText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  // 如果支持 express-as
  if (useExpressAs) {
    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
        xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN">
    <voice name="${voice}">
      <mstts:express-as style="${style}" styledegree="${styleDegree}">
        <prosody rate="${rate}" pitch="${pitch}">
          ${cleanText}
        </prosody>
      </mstts:express-as>
    </voice>
  </speak>`
  }

  // 降级版本（不支持 express-as）
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="${voice}">
    <prosody rate="${rate}" pitch="${pitch}">
      ${cleanText}
    </prosody>
  </voice>
</speak>`
}

/**
 * 清理过期缓存
 */
async function cleanupOldCache(): Promise<void> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const files = await fs.readdir(AUDIO_CACHE_DIR)
    const now = Date.now()
    const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000

    let deletedCount = 0

    for (const file of files) {
      if (!file.startsWith('tts_') || !file.endsWith('.mp3')) continue

      const filePath = path.join(AUDIO_CACHE_DIR, file)
      try {
        const stats = await fs.stat(filePath)
        const age = now - stats.mtimeMs

        if (age > maxAge) {
          await fs.unlink(filePath)
          deletedCount++
        }
      } catch {}
    }

    if (deletedCount > 0) {
      console.log(`[TTS] Cleaned ${deletedCount} old cache files`)
    }
  } catch (e) {
    // 缓存目录可能不存在，忽略
  }
}

/**
 * 限制缓存大小
 */
async function limitCacheSize(): Promise<void> {
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const files = await fs.readdir(AUDIO_CACHE_DIR)
    const mp3Files = files
      .filter(f => f.startsWith('tts_') && f.endsWith('.mp3'))
      .map(f => ({
        name: f,
        path: path.join(AUDIO_CACHE_DIR, f),
      }))

    if (mp3Files.length <= MAX_CACHE_SIZE) return

    // 按修改时间排序，删除最旧的
    const fileStats = await Promise.all(
      mp3Files.map(async f => ({
        ...f,
        mtime: (await fs.stat(f.path)).mtimeMs,
      }))
    )

    fileStats.sort((a, b) => a.mtime - b.mtime)

    // 删除超出数量限制的文件
    const toDelete = fileStats.slice(0, fileStats.length - MAX_CACHE_SIZE)
    for (const file of toDelete) {
      await fs.unlink(file.path).catch(() => {})
    }

    console.log(`[TTS] Deleted ${toDelete.length} cache files (size limit)`)
  } catch {}
}

/**
 * POST /api/voice/tts
 */
export async function POST(request: NextRequest) {
  const apiKey = getNextAzureKey()

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Azure Speech Key 未配置' },
      { status: 500 }
    )
  }

  try {
    // 解析请求
    const body = await request.json()
    const text = body.text || ''

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'text 不能为空' },
        { status: 400 }
      )
    }

    // 参数
    const voice = body.voice || AZ_TTS_VOICE
    const style = body.style || AZ_TTS_STYLE
    const styleDegree = body.styleDegree ?? AZ_TTS_STYLE_DEGREE
    const rate = body.rate || AZ_TTS_RATE
    const pitch = body.pitch || AZ_TTS_PITCH
    const format = body.format || AZ_TTS_FORMAT

    // 限制文本长度
    if (text.length > 1000) {
      return NextResponse.json(
        { error: 'text 超过最大长度 1000 字符' },
        { status: 400 }
      )
    }

    // 生成缓存 key
    const cacheKey = generateCacheKey(text, voice, style, styleDegree, rate, pitch, format)
    const cachePath = getCachePath(cacheKey)

    // 检查缓存
    try {
      const fs = await import('fs/promises')
      await fs.mkdir(AUDIO_CACHE_DIR, { recursive: true })

      const stats = await fs.stat(cachePath)
      const age = Date.now() - stats.mtimeMs
      const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000

      if (age < maxAge) {
        console.log('[TTS] Cache hit:', cacheKey.slice(0, 8))
        const cachedBuffer = await fs.readFile(cachePath)

        return new NextResponse(cachedBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'X-Cache': 'HIT',
            'Cache-Control': `public, max-age=${CACHE_TTL_HOURS * 3600}`,
          },
        })
      }
    } catch {
      // 缓存未命中，继续
    }

    // 构建 SSML
    const ssml = buildSSML(text, voice, style, styleDegree, rate, pitch, true)

    // 调用 Azure TTS
    const url = `https://${AZ_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': format,
      },
      body: ssml,
    })

    // 如果 style 不支持，自动降级
    if (!response.ok) {
      const errorText = await response.text()

      // 检查是否是 style 不支持
      if (errorText.includes('style') || errorText.includes('express-as')) {
        console.log('[TTS] Style not supported, falling back...')
        const fallbackSSML = buildSSML(text, voice, style, styleDegree, rate, pitch, false)

        const fallbackResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': format,
          },
          body: fallbackSSML,
        })

        if (!fallbackResponse.ok) {
          throw new Error(`Azure TTS 错误: ${fallbackResponse.status}`)
        }

        const audioBuffer = Buffer.from(await fallbackResponse.arrayBuffer())

        // 保存缓存
        try {
          const fs = await import('fs/promises')
          await fs.writeFile(cachePath, audioBuffer)
          await cleanupOldCache()
          await limitCacheSize()
        } catch {}

        return new NextResponse(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'X-Cache': 'MISS',
            'X-Fallback': 'style',
          },
        })
      }

      throw new Error(`Azure TTS 错误: ${response.status} ${errorText}`)
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())

    // 保存缓存
    try {
      const fs = await import('fs/promises')
      await fs.writeFile(cachePath, audioBuffer)
      await cleanupOldCache()
      await limitCacheSize()
    } catch {}

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Cache': 'MISS',
        'Cache-Control': `public, max-age=${CACHE_TTL_HOURS * 3600}`,
      },
    })

  } catch (error: any) {
    console.error('[TTS] Error:', error.message)

    // 失败时返回空音频 + JSON 提示
    return new NextResponse(
      JSON.stringify({ error: error.message, text: request.body?.text || '' }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Fallback': '1',
        },
      }
    )
  }
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
    provider: {
      name: 'Azure Speech',
      region: AZ_SPEECH_REGION,
      voice: AZ_TTS_VOICE,
      style: AZ_TTS_STYLE,
      styleDegree: AZ_TTS_STYLE_DEGREE,
      rate: AZ_TTS_RATE,
      pitch: AZ_TTS_PITCH,
    },
    cache: {
      dir: AUDIO_CACHE_DIR,
      maxSize: MAX_CACHE_SIZE,
      ttl: `${CACHE_TTL_HOURS}h`,
    },
    features: {
      expressAs: true,
      autoFallback: true,
      maxTextLength: 1000,
    },
  })
}
