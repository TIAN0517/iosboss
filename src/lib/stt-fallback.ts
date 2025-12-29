/**
 * GLM-4V STT 備選服務
 * 當瀏覽器原生識別失敗或置信度低時使用
 *
 * 主要功能：
 * 1. 使用 GLM-4V API 進行語音識別
 * 2. 音頻 Blob 處理
 * 3. 自動降級策略
 */

/**
 * STT 識別結果接口
 */
export interface STTResult {
  text: string           // 識別的文字
  confidence: number     // 置信度 (0-1)
  provider: 'browser' | 'glm-4v'  // 提供商
  duration: number       // 處理時間（毫秒）
}

/**
 * GLM-4V API 配置
 */
interface GLMSTTConfig {
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * 獲取 GLM API Key
 */
function getGLMApiKey(): string {
  // 優先順序：
  // 1. localStorage 中的 GLM_API_KEY
  // 2. 環境變量
  // 3. 返回空字符串（表示無 key）
  return (
    localStorage.getItem('GLM_API_KEY') ||
    process.env.GLM_STT_API_KEY ||
    process.env.GLM_API_KEY ||
    ''
  )
}

/**
 * 使用 GLM-4V 進行語音識別
 * @param audioBlob 音頻 Blob 數據
 * @param apiKey 可選的 API Key
 * @returns STT 識別結果
 */
export async function transcribeWithGLM4V(
  audioBlob: Blob,
  apiKey?: string
): Promise<STTResult> {
  const startTime = Date.now()

  // 使用提供的 key 或自動獲取
  const glmApiKey = apiKey || getGLMApiKey()

  if (!glmApiKey) {
    throw new Error('需要 GLM API Key。請在設置中添加 API Key 或使用 localStorage.setItem("GLM_API_KEY", "your-key")')
  }

  // 檢查音頻格式
  const supportedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg']
  if (!supportedTypes.includes(audioBlob.type)) {
    // 如果格式不支援，嘗試轉換
    console.warn(`不支援的音頻格式: ${audioBlob.type}，嘗試使用 webm`)
  }

  // 準備 FormData
  const formData = new FormData()
  const fileExtension = audioBlob.type.split('/')[1] || 'webm'
  formData.append('file', audioBlob, `audio.${fileExtension}`)
  formData.append('model', 'glm-4v')

  // 添加語言參數（支持中英文混合）
  formData.append('language', 'zh')  // 'zh' 表示中文，GLM-4V 支持自動檢測

  try {
    const baseUrl = 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions'

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${glmApiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('GLM STT API error:', errorData)

      if (response.status === 401) {
        throw new Error('GLM API Key 無效或已過期')
      } else if (response.status === 429) {
        throw new Error('GLM API 請求頻率過高，請稍後再試')
      } else {
        throw new Error(`GLM STT 請求失敗: ${response.status} ${response.statusText}`)
      }
    }

    const data = await response.json()

    // GLM-4V 返回格式：{ text: string, task: string, ... }
    const transcribedText = data.text || ''

    return {
      text: transcribedText,
      confidence: 0.9, // GLM-4V 通常很準確，給予較高置信度
      provider: 'glm-4v',
      duration: Date.now() - startTime,
    }
  } catch (error) {
    console.error('GLM-4V STT error:', error)
    throw error
  }
}

/**
 * 從麥克風錄製音頻到 Blob
 * @param maxDuration 最大錄製時長（毫秒）
 * @returns Promise<Blob>
 */
export async function recordAudioBlob(
  maxDuration: number = 10000
): Promise<{ blob: Blob; stream: MediaStream }> {
  // 請求麥克風權限
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000, // 16kHz 對於語音識別足夠
    }
  })

  // 檢查支援的 MIME 類型
  let mimeType = 'audio/webm'
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/wav',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      mimeType = type
      break
    }
  }

  const mediaRecorder = new MediaRecorder(stream, { mimeType })
  const chunks: BlobPart[] = []

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      resolve({ blob, stream })
    }

    mediaRecorder.onerror = (e) => {
      reject(new Error(`MediaRecorder error: ${e}`))
    }

    mediaRecorder.start()

    // 自動停止錄音
    setTimeout(() => {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    }, maxDuration)
  })
}

/**
 * 停止麥克風流並釋放資源
 * @param stream MediaStream 對象
 */
export function stopMediaStream(stream: MediaStream): void {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop()
    })
  }
}

/**
 * 音頻 Blob 轉換為 WAV 格式（用於瀏覽器不支援的情況）
 * @param audioBlob 原始音頻 Blob
 * @returns WAV 格式的 Blob
 */
export async function convertToWav(audioBlob: Blob): Promise<Blob> {
  // 讀取音頻數據
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioContext = new AudioContext({ sampleRate: 16000 })

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    // 轉換為 WAV
    const wavBuffer = audioBufferToWav(audioBuffer)
    return new Blob([wavBuffer], { type: 'audio/wav' })
  } finally {
    await audioContext.close()
  }
}

/**
 * AudioBuffer 轉換為 WAV 格式（內部函數）
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16

  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  const dataLength = buffer.length * blockAlign
  const bufferLength = 44 + dataLength

  const arrayBuffer = new ArrayBuffer(bufferLength)
  const view = new DataView(arrayBuffer)

  // WAV 文件頭
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)

  // 寫入音頻數據
  const channels: Float32Array[] = []
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return arrayBuffer
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * 檢查 GLM STT 是否可用
 * @returns true 如果有有效的 API Key
 */
export function isGLMSTTAvailable(): boolean {
  const apiKey = getGLMApiKey()
  return apiKey.length > 0
}

/**
 * 獲取 GLM STT 使用統計
 */
export function getGLMSTTStats(): {
  totalRequests: number
  successful: number
  failed: number
  averageDuration: number
} {
  const stats = localStorage.getItem('glm_stt_stats')
  if (stats) {
    return JSON.parse(stats)
  }
  return {
    totalRequests: 0,
    successful: 0,
    failed: 0,
    averageDuration: 0,
  }
}

/**
 * 保存 GLM STT 統計（內部使用）
 */
export function saveGLMSTTStats(success: boolean, duration: number): void {
  const stats = getGLMSTTStats()
  stats.totalRequests++
  if (success) {
    stats.successful++
  } else {
    stats.failed++
  }
  // 更新平均處理時間
  stats.averageDuration =
    (stats.averageDuration * (stats.totalRequests - 1) + duration) / stats.totalRequests

  localStorage.setItem('glm_stt_stats', JSON.stringify(stats))
}

/**
 * 重置 GLM STT 統計
 */
export function resetGLMSTTStats(): void {
  localStorage.removeItem('glm_stt_stats')
}

// 導出類型
export type { STTResult, GLMSTTConfig }
