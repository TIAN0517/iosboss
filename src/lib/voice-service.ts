/**
 * 统一语音服务
 * 整合 Deepgram ASR + Azure TTS
 * 支持预录音和实时语音识别
 */

import crypto from 'crypto'

// ========================================
// 环境变量读取
// ========================================

export const DEEPGRAM_CONFIG = {
  apiKey: process.env.DG_API_KEY || '',
  model: process.env.DG_MODEL || 'general',
  language: process.env.DG_LANGUAGE || 'en-US',
  smartFormat: process.env.DG_SMART_FORMAT === 'true',
  baseUrl: 'https://api.deepgram.com',
}

export const AZURE_CONFIG = {
  apiKey: process.env.AZ_SPEECH_KEY || '',
  region: process.env.AZ_SPEECH_REGION || 'southeastasia',
  voice: process.env.AZ_TTS_VOICE || 'zh-CN-XiaoxiaoNeural',
  format: process.env.AZ_TTS_FORMAT || 'audio-16khz-128kbitrate-mono-mp3',
  rate: process.env.AZ_TTS_RATE || '1.0',
  pitch: process.env.AZ_TTS_PITCH || '0%',
}

// 多 API Key 轮替配置
const ELEVENLABS_CONFIG = {
  apiKeys: (process.env.ELEVENLABS_API_KEYS || process.env.ELEVENLABS_API_KEY || '').split(',').filter(k => k.trim()),
  voice: process.env.ELEVENLABS_VOICE || 'XBnrpkQkHdVjPEZ0eiP',
  model: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
  similarity: parseFloat(process.env.ELEVENLABS_SIMILARITY || '0.75'),
  stability: parseFloat(process.env.ELEVENLABS_STABILITY || '0.5'),
}

// 当前轮替索引
let elevenLabsKeyIndex = 0
let azureKeyIndex = 0

/**
 * 获取下一个 ElevenLabs API Key（带轮替）
 */
function getNextElevenLabsKey(): string {
  const keys = ELEVENLABS_CONFIG.apiKeys
  if (keys.length === 0) return ''
  const key = keys[elevenLabsKeyIndex]
  elevenLabsKeyIndex = (elevenLabsKeyIndex + 1) % keys.length
  return key
}

/**
 * 获取下一个 Azure API Key（带轮替）
 */
function getNextAzureKey(): string {
  const keys = (process.env.AZ_SPEECH_KEYS || process.env.AZ_SPEECH_KEY || '').split(',').filter(k => k.trim())
  if (keys.length === 0) return AZURE_CONFIG.apiKey
  const key = keys[azureKeyIndex]
  azureKeyIndex = (azureKeyIndex + 1) % keys.length
  return key
}

// 音频缓存目录
const AUDIO_CACHE_DIR = '/tmp/tts-cache'
const MAX_CACHE_SIZE = 100
const CACHE_TTL_HOURS = 24

// ========================================
// 类型定义
// ========================================

export interface ASRResult {
  text: string
  confidence: number
  isFinal: boolean
  words?: Array<{
    word: string
    start: number
    end: number
    confidence: number
  }>
}

export interface TTSResult {
  audioBuffer: Buffer
  contentType: string
  fromCache: boolean
  hash: string
}

export interface TTSOptions {
  voice?: string
  rate?: string
  pitch?: string
  format?: string
}

// ========================================
// Deepgram ASR 服务
// ========================================

/**
 * Deepgram 预录音 ASR
 * @param audioBuffer 音频数据
 * @param mimeType MIME 类型
 * @returns ASR 识别结果
 */
export async function transcribeWithDeepgram(
  audioBuffer: Buffer,
  mimeType: string = 'audio/mp3'
): Promise<ASRResult> {
  const apiKey = DEEPGRAM_CONFIG.apiKey

  if (!apiKey) {
    throw new Error('Deepgram API Key 未配置，请设置 DG_API_KEY')
  }

  // 构建请求 URL
  const params = new URLSearchParams({
    model: DEEPGRAM_CONFIG.model,
    language: DEEPGRAM_CONFIG.language,
    smart_format: DEEPGRAM_CONFIG.smartFormat.toString(),
    punctuate: 'true',
    profanity_filter: 'true',
  })

  const url = `${DEEPGRAM_CONFIG.baseUrl}/v1/listen?${params}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': mimeType,
      },
      body: audioBuffer,
      // @ts-ignore - Node.js fetch 类型定义可能不完整
      duplex: 'half',
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Deepgram] API error:', error)
      throw new Error(`Deepgram API 错误: ${response.status} ${error}`)
    }

    const data = await response.json()

    // 提取最终结果
    const result = data.results?.channels?.[0]
    const alternatives = result?.alternatives || []
    const best = alternatives[0]

    if (!best) {
      throw new Error('Deepgram 返回空结果')
    }

    return {
      text: best.transcript || '',
      confidence: best.confidence || 0,
      isFinal: true,
      words: best.words || [],
    }
  } catch (error) {
    console.error('[Deepgram] Transcribe error:', error)
    throw error
  }
}

/**
 * Deepgram 实时 ASR（通过 URL）
 * @param audioUrl 音频文件 URL
 * @returns ASR 识别结果
 */
export async function transcribeUrlWithDeepgram(
  audioUrl: string
): Promise<ASRResult> {
  const apiKey = DEEPGRAM_CONFIG.apiKey

  if (!apiKey) {
    throw new Error('Deepgram API Key 未配置')
  }

  const params = new URLSearchParams({
    model: DEEPGRAM_CONFIG.model,
    language: DEEPGRAM_CONFIG.language,
    smart_format: DEEPGRAM_CONFIG.smartFormat.toString(),
    punctuate: 'true',
  })

  const url = `${DEEPGRAM_CONFIG.baseUrl}/v1/listen?${params}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: audioUrl }),
    })

    if (!response.ok) {
      throw new Error(`Deepgram API 错误: ${response.status}`)
    }

    const data = await response.json()
    const result = data.results?.channels?.[0]
    const best = result?.alternatives?.[0]

    return {
      text: best?.transcript || '',
      confidence: best?.confidence || 0,
      isFinal: true,
    }
  } catch (error) {
    console.error('[Deepgram] URL transcribe error:', error)
    throw error
  }
}

/**
 * 从 LINE 下载音频并使用 Deepgram 转录
 * @param audioUrl LINE 音频 URL
 * @param lineAccessToken LINE Access Token
 */
export async function transcribeLineAudioWithDeepgram(
  audioUrl: string,
  lineAccessToken?: string
): Promise<ASRResult> {
  try {
    // 下载音频
    const audioResponse = await fetch(audioUrl, {
      headers: lineAccessToken ? {
        'Authorization': `Bearer ${lineAccessToken}`,
      } : undefined,
    })

    if (!audioResponse.ok) {
      throw new Error(`下载音频失败: ${audioResponse.status}`)
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())
    const contentType = audioResponse.headers.get('content-type') || 'audio/mp3'

    // 使用 Deepgram 转录
    return await transcribeWithDeepgram(audioBuffer, contentType)
  } catch (error) {
    console.error('[Deepgram] LINE audio transcribe error:', error)
    throw error
  }
}

// ========================================
// Azure TTS 服务（带缓存）
// ========================================

/**
 * 生成文本的 SHA1 哈希
 */
function generateTextHash(text: string): string {
  return crypto.createHash('sha1').update(text).digest('hex')
}

/**
 * 构建 Azure TTS SSML
 */
function buildSSML(text: string, options: TTSOptions = {}): string {
  const voice = options.voice || AZURE_CONFIG.voice
  const rate = options.rate || AZURE_CONFIG.rate
  const pitch = options.pitch || AZURE_CONFIG.pitch

  // 清理文本中的 SSML 特殊字符
  const cleanText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="${voice}">
    <prosody rate="${rate}" pitch="${pitch}">
      ${cleanText}
    </prosody>
  </voice>
</speak>`
}

/**
 * 生成 TTS 音频缓存文件名
 */
function getCacheFilePath(textHash: string): string {
  return `${AUDIO_CACHE_DIR}/tts_${textHash}.mp3`
}

/**
 * 使用 Azure TTS 生成语音（带缓存）
 * @param text 要转换的文本
 * @param options TTS 选项
 * @returns 音频 Buffer
 */
export async function synthesizeWithAzure(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const apiKey = getNextAzureKey()

  if (!apiKey) {
    throw new Error('Azure Speech Key 未配置，请设置 AZ_SPEECH_KEYS 或 AZ_SPEECH_KEY')
  }

  // 限制文本长度（Azure 限制）
  const maxLength = 1000
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...'
  }

  // 生成哈希用于缓存
  const textHash = generateTextHash(text + JSON.stringify(options))
  const cachePath = getCacheFilePath(textHash)

  // 检查缓存（仅服务端）
  if (typeof window === 'undefined') {
    const fs = await import('fs/promises')
    const path = await import('path')

    try {
      // 确保缓存目录存在
      await fs.mkdir(AUDIO_CACHE_DIR, { recursive: true })

      // 检查缓存文件是否存在且未过期
      const stats = await fs.stat(cachePath)
      const age = Date.now() - stats.mtimeMs
      const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000

      if (age < maxAge) {
        console.log('[Azure TTS] Cache hit:', textHash)
        const cachedBuffer = await fs.readFile(cachePath)
        return {
          audioBuffer: cachedBuffer,
          contentType: 'audio/mpeg',
          fromCache: true,
          hash: textHash,
        }
      }
    } catch (e) {
      // 缓存不存在或读取失败，继续生成
      console.log('[Azure TTS] Cache miss:', textHash)
    }
  }

  // 构建 SSML
  const ssml = buildSSML(text, options)
  const region = AZURE_CONFIG.region
  const format = options.format || AZURE_CONFIG.format

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': format,
      },
      body: ssml,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[Azure TTS] API error:', error)
      throw new Error(`Azure TTS 错误: ${response.status} ${error}`)
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())

    // 保存到缓存（仅服务端）
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs/promises')
        await fs.writeFile(cachePath, audioBuffer)

        // 清理旧缓存
        await cleanupOldCache()
      } catch (e) {
        console.warn('[Azure TTS] Failed to save cache:', e)
      }
    }

    return {
      audioBuffer,
      contentType: 'audio/mpeg',
      fromCache: false,
      hash: textHash,
    }
  } catch (error) {
    console.error('[Azure TTS] Synthesize error:', error)
    throw error
  }
}

/**
 * 清理过期的 TTS 缓存
 */
async function cleanupOldCache(): Promise<void> {
  if (typeof window !== 'undefined') return

  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const files = await fs.readdir(AUDIO_CACHE_DIR)
    const now = Date.now()
    const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000
    const deletedCount = { deleted: 0 }

    for (const file of files) {
      if (!file.startsWith('tts_') || !file.endsWith('.mp3')) continue

      const filePath = path.join(AUDIO_CACHE_DIR, file)
      try {
        const stats = await fs.stat(filePath)
        const age = now - stats.mtimeMs

        if (age > maxAge) {
          await fs.unlink(filePath)
          deletedCount.deleted++
        }
      } catch (e) {
        // 文件可能已被删除，忽略
      }
    }

    if (deletedCount.deleted > 0) {
      console.log(`[Azure TTS] Cleaned up ${deletedCount.deleted} old cache files`)
    }
  } catch (e) {
    console.warn('[Azure TTS] Cleanup failed:', e)
  }
}

/**
 * 清理所有 TTS 缓存
 */
export async function clearTTSCache(): Promise<void> {
  if (typeof window !== 'undefined') return

  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const files = await fs.readdir(AUDIO_CACHE_DIR)
    let deletedCount = 0

    for (const file of files) {
      if (file.startsWith('tts_') && file.endsWith('.mp3')) {
        const filePath = path.join(AUDIO_CACHE_DIR, file)
        await fs.unlink(filePath).catch(() => {})
        deletedCount++
      }
    }

    console.log(`[TTS] Cleared ${deletedCount} cache files`)
  } catch (e) {
    console.warn('[TTS] Clear cache failed:', e)
  }
}

// ========================================
// ElevenLabs TTS 服务（带缓存）
// ========================================

/**
 * 使用 ElevenLabs TTS 生成语音（带缓存）
 * @param text 要转换的文本
 * @param options TTS 选项
 * @returns 音频 Buffer
 */
export async function synthesizeWithElevenLabs(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const apiKey = getNextElevenLabsKey()

  if (!apiKey) {
    throw new Error('ElevenLabs API Key 未配置，请设置 ELEVENLABS_API_KEYS 或 ELEVENLABS_API_KEY')
  }

  // 限制文本长度（ElevenLabs 限制）
  const maxLength = 5000
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...'
  }

  // 生成哈希用于缓存
  const textHash = generateTextHash(text + 'elevenlabs' + JSON.stringify(options))
  const cachePath = getCacheFilePath(textHash)

  // 检查缓存（仅服务端）
  if (typeof window === 'undefined') {
    const fs = await import('fs/promises')

    try {
      await fs.mkdir(AUDIO_CACHE_DIR, { recursive: true })

      const stats = await fs.stat(cachePath)
      const age = Date.now() - stats.mtimeMs
      const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000

      if (age < maxAge) {
        console.log('[ElevenLabs] Cache hit:', textHash)
        const cachedBuffer = await fs.readFile(cachePath)
        return {
          audioBuffer: cachedBuffer,
          contentType: 'audio/mpeg',
          fromCache: true,
          hash: textHash,
        }
      }
    } catch (e) {
      console.log('[ElevenLabs] Cache miss:', textHash)
    }
  }

  const voice = options.voice || ELEVENLABS_CONFIG.voice
  const model = options.model || ELEVENLABS_CONFIG.model

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: ELEVENLABS_CONFIG.stability,
          similarity_boost: ELEVENLABS_CONFIG.similarity,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[ElevenLabs] API error:', error)
      throw new Error(`ElevenLabs TTS 错误: ${response.status} ${error}`)
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())

    // 保存到缓存（仅服务端）
    if (typeof window === 'undefined') {
      try {
        const fs = await import('fs/promises')
        await fs.writeFile(cachePath, audioBuffer)
        await cleanupOldCache()
      } catch (e) {
        console.warn('[ElevenLabs] Failed to save cache:', e)
      }
    }

    return {
      audioBuffer,
      contentType: 'audio/mpeg',
      fromCache: false,
      hash: textHash,
    }
  } catch (error) {
    console.error('[ElevenLabs] Synthesize error:', error)
    throw error
  }
}

/**
 * 使用智譜 GLM TTS API 生成语音（服務端版）
 * @param text 要转换的文本
 * @param options TTS 选项
 * @returns 音频 Buffer
 */
export async function synthesizeWithGLM(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  // 獲取 GLM API Key（支持多 Key 輪替）
  const apiKey = process.env.GLM_API_KEY || process.env.GLM_API_KEYS?.split(',')[0]

  if (!apiKey) {
    throw new Error('GLM API Key 未配置，請設置 GLM_API_KEY')
  }

  console.log('[GLM TTS] 開始生成語音:', text.substring(0, 50))

  // 限制文本長度
  const maxLength = 500
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...'
  }

  try {
    // 智譜 TTS API 端點
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: options.voice || 'tongtong',
        speed: options.speed || 1.0,
      }),
      // 60 秒超時
      signal: AbortSignal.timeout(60000),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[GLM TTS] API error:', errorData)

      if (response.status === 401) {
        throw new Error('GLM API Key 無效或已過期')
      } else if (response.status === 429) {
        throw new Error('GLM API 請求頻率過高，請稍後再試')
      } else {
        throw new Error(`GLM TTS 請求失敗: ${response.status} ${errorData.error || ''}`)
      }
    }

    // 獲取音頻 Buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer())

    console.log('[GLM TTS] 成功生成音頻:', {
      size: audioBuffer.length,
      textLength: text.length,
    })

    return {
      audioBuffer,
      mimeType: 'audio/mpeg',
      fromCache: false,
    }
  } catch (error) {
    console.error('[GLM TTS] 錯誤:', error)
    throw error
  }
}

// ========================================
// 统一语音处理函数
// ========================================

/**
 * 处理用户语音输入
 * 统一函数：支持 Deepgram ASR + AI + 多 TTS 提供商（带自动降级）
 * @param audioBuffer 音频数据
 * @param mimeType MIME 类型
 * @param aiHandler AI 处理函数
 * @param options TTS 选项
 * @returns { transcript, responseText, responseAudio }
 */
export async function handleVoiceInput(
  audioBuffer: Buffer,
  mimeType: string,
  aiHandler: (text: string) => Promise<string>,
  options?: TTSOptions
): Promise<{
  transcript: string
  responseText: string
  responseAudio?: TTSResult
  ttsProvider?: string
}> {
  // 1. ASR: 音频转文字
  const asrResult = await transcribeWithDeepgram(audioBuffer, mimeType)

  if (!asrResult.text || asrResult.text.trim().length === 0) {
    throw new Error('无法识别语音内容')
  }

  // 2. AI: 处理文字，获取回复
  const responseText = await aiHandler(asrResult.text)

  // 3. TTS: 生成回复语音（支持多提供商自动降级）
  let responseAudio: TTSResult | undefined
  let ttsProvider = 'unknown'

  // 优先级：ElevenLabs > Azure > GLM
  if (ELEVENLABS_CONFIG.apiKey) {
    try {
      console.log('[TTS] Using ElevenLabs')
      responseAudio = await synthesizeWithElevenLabs(responseText, options)
      ttsProvider = 'elevenlabs'
    } catch (e) {
      console.warn('[TTS] ElevenLabs failed, trying Azure:', e)
    }
  }

  if (!responseAudio && AZURE_CONFIG.apiKey) {
    try {
      console.log('[TTS] Using Azure')
      responseAudio = await synthesizeWithAzure(responseText, options)
      ttsProvider = 'azure'
    } catch (e) {
      console.warn('[TTS] Azure failed, trying GLM:', e)
    }
  }

  if (!responseAudio && process.env.GLM_API_KEY) {
    try {
      console.log('[TTS] Using GLM')
      // 使用 GLM TTS 作为最后备选
      const { getNaturalTTS } = await import('./natural-tts')
      const tts = getNaturalTTS({ provider: 'glm' })
      await tts.speak(responseText)
      ttsProvider = 'glm'
      // GLM TTS 是浏览器端播放，不返回音频 buffer
    } catch (e) {
      console.warn('[TTS] All providers failed')
    }
  }

  return {
    transcript: asrResult.text,
    responseText,
    responseAudio,
    ttsProvider,
  }
}

/**
 * 检查服务可用性
 */
export function checkServiceAvailability(): {
  deepgram: boolean
  azure: boolean
  elevenlabs: boolean
  glm: boolean
} {
  return {
    deepgram: !!DEEPGRAM_CONFIG.apiKey,
    azure: !!(process.env.AZ_SPEECH_KEYS || process.env.AZ_SPEECH_KEY),
    elevenlabs: ELEVENLABS_CONFIG.apiKeys.length > 0,
    glm: !!(process.env.GLM_API_KEY || process.env.GLM_API_KEYS),
  }
}

/**
 * 获取服务配置信息
 */
export function getServiceConfig() {
  const azureKeys = (process.env.AZ_SPEECH_KEYS || process.env.AZ_SPEECH_KEY || '').split(',').filter(k => k.trim())
  const elevenLabsKeys = ELEVENLABS_CONFIG.apiKeys

  return {
    deepgram: {
      hasKey: !!DEEPGRAM_CONFIG.apiKey,
      model: DEEPGRAM_CONFIG.model,
      language: DEEPGRAM_CONFIG.language,
      // 注意：不要输出完整 API Key
      keyPreview: DEEPGRAM_CONFIG.apiKey
        ? `${DEEPGRAM_CONFIG.apiKey.slice(0, 8)}...`
        : '未配置',
    },
    azure: {
      hasKey: azureKeys.length > 0,
      keysCount: azureKeys.length,
      rotationEnabled: azureKeys.length > 1,
      currentIndex: azureKeyIndex,
      region: AZURE_CONFIG.region,
      voice: AZURE_CONFIG.voice,
      keyPreview: azureKeys.length > 0
        ? `${azureKeys[0].slice(0, 8)}...`
        : '未配置',
    },
    elevenlabs: {
      hasKey: elevenLabsKeys.length > 0,
      keysCount: elevenLabsKeys.length,
      rotationEnabled: elevenLabsKeys.length > 1,
      currentIndex: elevenLabsKeyIndex,
      voice: ELEVENLABS_CONFIG.voice,
      model: ELEVENLABS_CONFIG.model,
      keyPreview: elevenLabsKeys.length > 0
        ? `${elevenLabsKeys[0].slice(0, 8)}...`
        : '未配置',
    },
  }
}
