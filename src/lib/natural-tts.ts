/**
 * 自然語音合成 (Natural Text-to-Speech)
 * 使用端到端語音模式，讓 AI 助手說話更自然人性化
 * 優化模仿豆包的語音風格：親切、自然、富有情感
 */

export type TTSProvider = 'browser' | 'openai' | 'elevenlabs' | 'azure' | 'glm'

/**
 * 智譜 TTS 可用聲音 (GLM API 官方系統音色)
 * 官方文檔: https://docs.bigmodel.cn/api-reference/模型-api/文本转语音
 */
export const GLM_TTS_VOICES = {
  'tongtong': '彤彤 (默認音色 - 年輕女性)',
  'chuichui': '錘錘 (男性)',
  'xiaochen': '小陳 (男性)',
  'jam': '動動動物圈 (可愛風)',
} as const

export type GLMTTSVoice = keyof typeof GLM_TTS_VOICES

export interface NaturalVoiceConfig {
  provider: TTSProvider
  apiKey?: string
  voice?: string
  rate?: number
  pitch?: number
  // 自然語音參數
  useProsody?: boolean  // 使用語調變化
  useBreathing?: boolean // 添加呼吸停頓
  useEmotion?: boolean   // 情感化語音
  // 豆包風格參數
  douBaoStyle?: boolean  // 啟用豆包風格（更親切自然）
}

export interface TTSSegment {
  text: string
  pause?: number  // 停頓毫秒數
  emotion?: 'neutral' | 'happy' | 'concerned' | 'excited' | 'gentle'
  speed?: number
  emphasis?: number[]  // 需要強調的字符索引
}

/**
 * 自然語音合成器
 */
export class NaturalTTS {
  private config: NaturalVoiceConfig
  private audioContext: AudioContext | null = null
  private isPlaying = false
  private currentQueue: TTSSegment[] = []

  constructor(config: NaturalVoiceConfig) {
    this.config = config
  }

  /**
   * 初始化音頻上下文
   */
  private initAudioContext() {
    if (typeof window === 'undefined') return
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  /**
   * 豆包風格文本預處理 - 更自然的表達方式
   */
  private preprocessTextDouBaoStyle(text: string): string {
    // 添加自然語氣詞
    let processed = text
      .replace(/好的/g, '好的呢')
      .replace(/沒問題/g, '沒問題喔')
      .replace(/知道了/g, '知道啦')
      .replace(/請/g, '麻煩')
      .replace(/謝謝/g, '謝謝您')
      .replace(/對不起/g, '不好意思')

    // 添加友善的結尾語氣詞（如果還沒有）
    if (!processed.match(/[喔呢吧呀啦]$/)) {
      if (processed.includes('幫助') || processed.includes('協助')) {
        processed += '喔'
      } else if (processed.includes('確認') || processed.includes('知道')) {
        processed += '呢'
      } else if (processed.match(/[\。\?]$/)) {
        processed = processed.replace(/[\。\?]$/, '～')
      }
    }

    return processed
  }

  /**
   * 智能分段 - 豆包風格（更細緻的分段，模擬自然呼吸）
   */
  private smartSegment(text: string): TTSSegment[] {
    // 清理文本
    let cleanText = text
      .replace(/```json\s*([\s\S]*?)\s*```/g, '') // 移除代碼塊
      .replace(/```\s*([\s\S]*?)\s*```/g, '') // 移除其他代碼塊
      .replace(/\*\*/g, '') // 移除粗體標記
      .replace(/#{1,6}\s/g, '') // 移除標題
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除 markdown 連結
      .trim()

    // 如果啟用豆包風格，進行文本預處理
    if (this.config.douBaoStyle) {
      cleanText = this.preprocessTextDouBaoStyle(cleanText)
    }

    const segments: TTSSegment[] = []

    // 按更細緻的標點符號分段（包括逗號、頓號）
    // 使用正則表達式匹配所有標點符號，但保留連貫性
    const sentenceGroups = cleanText.split(/([。！？；\n]+)/)
    const segmentsList: string[] = []

    for (let i = 0; i < sentenceGroups.length; i++) {
      const part = sentenceGroups[i]
      const isMajorBreak = sentenceGroups[i + 1]?.match(/[。！？；\n]/)

      if (part.trim()) {
        // 對於較長的句子，按逗號進行二次分割
        if (part.length > 15 && part.includes('，')) {
          const subParts = part.split(/(，)/)
          let tempSentence = ''

          for (let j = 0; j < subParts.length; j++) {
            const subPart = subParts[j]
            tempSentence += subPart

            if (subPart === '，' || j === subParts.length - 1) {
              if (tempSentence.trim()) {
                segmentsList.push(tempSentence.trim())
              }
              tempSentence = ''
            }
          }
        } else {
          segmentsList.push(part.trim())
        }
      }

      if (isMajorBreak) {
        i++ // 跳過標點符號本身
      }
    }

    // 將分段轉換為帶語音參數的段落
    for (const segmentText of segmentsList) {
      if (!segmentText) continue

      // 檢測停頓長度
      let pause = 200
      const endsWithComma = segmentText.endsWith('，') || segmentText.endsWith('、')
      const endsWithPeriod = segmentText.endsWith('。') || segmentText.endsWith('！') || segmentText.endsWith('？')
      const endsWithMajor = segmentText.endsWith('；') || segmentText.endsWith('\n')

      if (endsWithComma) pause = 300
      else if (endsWithPeriod) pause = 500
      else if (endsWithMajor) pause = 700

      // 豆包風格：更自然的停頓
      if (this.config.douBaoStyle) {
        if (endsWithComma) pause = 350
        else if (endsWithPeriod) pause = 600
        else if (endsWithMajor) pause = 800
      }

      segments.push({
        text: segmentText.replace(/[，。！？；、\n]/g, ''), // 移除標點用於語音
        pause,
        emotion: this.detectEmotion(segmentText),
        speed: this.detectSpeed(segmentText),
        emphasis: this.detectEmphasis(segmentText),
      })
    }

    return segments.filter(s => s.text.length > 0)
  }

  /**
   * 檢測情感 - 豆包風格（更細緻的情感分類）
   */
  private detectEmotion(text: string): TTSSegment['emotion'] {
    // 檢測親切友善的內容
    if (text.includes('✅') || text.includes('成功') || text.includes('幫您') ||
        text.includes('好的呢') || text.includes('喔') || text.includes('～')) {
      return 'gentle' // 溫柔語氣
    }

    // 檢測開心興奮
    if (text.includes('🌟') || text.includes('真厲害') || text.includes('太棒') ||
        text.includes('讚') || text.includes('耶')) {
      return 'excited'
    }

    // 檢測提醒注意
    if (text.includes('⚠️') || text.includes('提醒') || text.includes('注意') ||
        text.includes('小心') || text.includes('危險')) {
      return 'concerned'
    }

    return 'neutral'
  }

  /**
   * 檢測需要強調的部分（重點詞）
   */
  private detectEmphasis(text: string): number[] {
    const emphasisIndices: number[] = []
    const emphasisWords = ['非常', '特別', '最重要', '必須', '一定', '請', '謝謝']

    for (const word of emphasisWords) {
      let index = text.indexOf(word)
      while (index !== -1) {
        emphasisIndices.push(index)
        index = text.indexOf(word, index + 1)
      }
    }

    return emphasisIndices
  }

  /**
   * 檢測語速
   */
  private detectSpeed(text: string): number {
    // 數字和特殊符號讀慢一點
    const numberCount = (text.match(/[0-9]/g) || []).length
    if (numberCount > 3) return 0.85

    // 英文內容稍快
    if (/[a-zA-Z]{5,}/.test(text)) return 1.05

    // 豆包風格：整體稍慢，更親切
    if (this.config.douBaoStyle) {
      return 0.92
    }

    return 1.0
  }

  /**
   * 使用瀏覽器原生語音合成（豆包風格優化版）
   */
  private async speakWithBrowser(segments: TTSSegment[]): Promise<void> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      throw new Error('瀏覽器不支援語音合成')
    }

    // 等待語音載入
    await new Promise<void>((resolve) => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        resolve()
      } else {
        window.speechSynthesis.onvoiceschanged = () => resolve()
      }
    })

    // 選擇最佳語音
    const voices = window.speechSynthesis.getVoices()
    const voice = this.selectBestVoice(voices)

    for (const segment of segments) {
      if (this.shouldStop) break

      const utterance = new SpeechSynthesisUtterance(segment.text)

      // 設置語音
      utterance.voice = voice

      // 豆包風格參數調整
      const baseRate = segment.speed || this.config.rate || 1.0
      const basePitch = this.config.pitch || 1.0

      if (this.config.douBaoStyle) {
        // 豆包風格：稍慢、稍高音、更親切
        utterance.rate = baseRate * 0.9 // 稍慢更親切
        utterance.pitch = basePitch * 1.08 // 稍高更年輕
        utterance.volume = 1.0
      } else {
        utterance.rate = baseRate * 0.95
        utterance.pitch = basePitch * 1.05
        utterance.volume = 1.0
      }

      // 設置語調變化 - 豆包風格
      if (segment.emotion === 'gentle') {
        utterance.pitch = basePitch * 1.12
        utterance.rate = baseRate * 0.95
      } else if (segment.emotion === 'happy') {
        utterance.pitch = basePitch * 1.15
        utterance.rate = baseRate * 1.05
      } else if (segment.emotion === 'concerned') {
        utterance.pitch = basePitch * 0.95
        utterance.rate = baseRate * 0.9
      } else if (segment.emotion === 'excited') {
        utterance.pitch = basePitch * 1.2
        utterance.rate = baseRate * 1.08
      }

      await new Promise<void>((resolve, reject) => {
        utterance.onend = () => {
          if (segment.pause && !this.shouldStop) {
            setTimeout(resolve, segment.pause)
          } else {
            resolve()
          }
        }
        utterance.onerror = (e) => reject(e)

        window.speechSynthesis.speak(utterance)
      })
    }
  }

  /**
   * 選擇最佳語音 - 豆包風格（優先選擇年輕女性聲音）
   */
  private selectBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // 豆包風格優先順序：
    // 1. 台灣國語女聲（最親切）
    // 2. 簡體中文女聲
    // 3. "Google" 或 "Microsoft" 的中文語音（品質較好）
    // 4. 其他中文女聲
    // 5. 任何中文語音
    // 6. 第一個可用語音

    // 台灣女聲 - 最佳選擇
    const taiwanFemale = voices.find(v =>
      v.lang === 'zh-TW' && (v.name.includes('女') || v.name.includes('Female'))
    )

    // 簡體中文女聲
    const chineseFemale = voices.find(v =>
      v.lang.startsWith('zh') && (v.name.includes('女') || v.name.includes('Female'))
    )

    // Google 繁體中文（品質好）
    const googleTaiwan = voices.find(v =>
      v.lang === 'zh-TW' && v.name.includes('Google')
    )

    // Microsoft 繁體中文（品質好）
    const microsoftTaiwan = voices.find(v =>
      v.lang === 'zh-TW' && v.name.includes('Microsoft')
    )

    // 台灣語音（不限性別）
    const taiwanVoice = voices.find(v => v.lang === 'zh-TW')

    // 簡體中文 Google
    const googleChinese = voices.find(v =>
      v.lang.startsWith('zh') && v.name.includes('Google')
    )

    // 任何中文語音
    const chineseVoice = voices.find(v => v.lang.startsWith('zh'))

    return (
      taiwanFemale ||
      googleTaiwan ||
      microsoftTaiwan ||
      chineseFemale ||
      taiwanVoice ||
      googleChinese ||
      chineseVoice ||
      voices[0] ||
      null
    )
  }

  /**
   * 使用 OpenAI TTS API（可選升級方案）
   */
  private async speakWithOpenAI(text: string): Promise<void> {
    if (!this.config.apiKey) {
      throw new Error('需要 OpenAI API Key')
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1-hd', // 高品質語音
        voice: this.config.voice || 'nova', // 自然女聲
        input: text,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      throw new Error('OpenAI TTS 請求失敗')
    }

    const audioBuffer = await response.arrayBuffer()
    this.initAudioContext()

    if (this.audioContext) {
      const audioData = await this.audioContext.decodeAudioData(audioBuffer)
      const source = this.audioContext.createBufferSource()
      source.buffer = audioData
      source.connect(this.audioContext.destination)
      source.start()

      return new Promise((resolve) => {
        source.onended = () => resolve()
      })
    }

    // Fallback if audioContext is not available
    return Promise.resolve()
  }

  /**
   * 使用智譜 GLM TTS API (特惠版 MAX)
   */
  private async speakWithGLM(text: string): Promise<void> {
    // 優先級：localStorage > 環境變量
    const apiKey = this.config.apiKey ||
      localStorage.getItem('GLM_API_KEY') ||
      process.env.GLM_API_KEY ||
      ''

    if (!apiKey) {
      throw new Error('需要 GLM API Key。請在設置中添加或在 localStorage 設置 GLM_API_KEY')
    }

    // 智譜 TTS API 端點
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,  // 注意：智譜用的是 "input" 不是 "text"
        voice: this.config.voice || 'tongtong', // 默認使用彤彤音色
        speed: this.config.rate || 1.0,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('GLM TTS API error:', errorData)

      if (response.status === 401) {
        throw new Error('GLM API Key 無效或已過期')
      } else if (response.status === 429) {
        throw new Error('GLM API 請求頻率過高，請稍後再試')
      } else {
        throw new Error(`GLM TTS 請求失敗: ${response.status} ${errorData.error || ''}`)
      }
    }

    const audioBuffer = await response.arrayBuffer()
    this.initAudioContext()

    if (this.audioContext) {
      const audioData = await this.audioContext.decodeAudioData(audioBuffer)
      const source = this.audioContext.createBufferSource()
      source.buffer = audioData
      source.connect(this.audioContext.destination)
      source.start()

      return new Promise((resolve) => {
        source.onended = () => resolve()
      })
    }

    // Fallback if audioContext is not available
    return Promise.resolve()
  }

  /**
   * 獲取 GLM API Key (內部使用)
   */
  private getGLMApiKey(): string {
    return (
      this.config.apiKey ||
      localStorage.getItem('GLM_API_KEY') ||
      process.env.GLM_API_KEY ||
      ''
    )
  }

  /**
   * 智能說話 - 自動選擇最佳方式
   */
  async speak(text: string): Promise<void> {
    if (this.isPlaying) {
      this.stop()
    }

    this.isPlaying = true
    this.shouldStop = false

    try {
      const segments = this.smartSegment(text)

      // 根據配置選擇 TTS 提供商
      switch (this.config.provider) {
        case 'glm':
          if (this.getGLMApiKey()) {
            await this.speakWithGLM(text)
          } else {
            console.warn('未找到 GLM API Key，降級為瀏覽器原生 TTS')
            await this.speakWithBrowser(segments)
          }
          break

        case 'openai':
          if (this.config.apiKey) {
            await this.speakWithOpenAI(text)
          } else {
            await this.speakWithBrowser(segments)
          }
          break

        case 'browser':
        default:
          await this.speakWithBrowser(segments)
          break
      }
    } catch (error) {
      console.error('TTS Error:', error)
      throw error
    } finally {
      this.isPlaying = false
    }
  }

  /**
   * 停止說話
   */
  stop() {
    this.shouldStop = true
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.isPlaying = false
  }

  /**
   * 暫停
   */
  pause() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause()
    }
  }

  /**
   * 繼續播放
   */
  resume() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume()
    }
  }

  /**
   * 檢查是否正在播放
   */
  getIsPlaying(): boolean {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      return this.isPlaying || window.speechSynthesis.speaking
    }
    return this.isPlaying
  }

  private shouldStop = false
}

/**
 * 獲取自然 TTS 實例
 */
let naturalTTSInstance: NaturalTTS | null = null

export function getNaturalTTS(config?: Partial<NaturalVoiceConfig>): NaturalTTS {
  if (!naturalTTSInstance) {
    // 從 localStorage 讀取配置，如果沒有則自動檢測最佳 provider
    let savedProvider = localStorage.getItem('TTS_PROVIDER') as TTSProvider

    // 如果沒有保存的 provider，自動檢測
    if (!savedProvider) {
      // 優先順序：GLM > OpenAI > 瀏覽器
      const hasGLMApiKey = localStorage.getItem('GLM_API_KEY') || process.env.GLM_API_KEY || ''
      const hasOpenAIApiKey = localStorage.getItem('OPENAI_API_KEY') || ''

      if (hasGLMApiKey) {
        savedProvider = 'glm'
        // 自動保存到 localStorage，避免重複檢測
        localStorage.setItem('TTS_PROVIDER', 'glm')
      } else if (hasOpenAIApiKey) {
        savedProvider = 'openai'
        localStorage.setItem('TTS_PROVIDER', 'openai')
      } else {
        savedProvider = 'browser'
      }
    }

    // 根據 provider 選擇對應的 API Key
    let savedApiKey = ''
    if (savedProvider === 'glm') {
      savedApiKey = localStorage.getItem('GLM_API_KEY') || process.env.GLM_API_KEY || ''
    } else if (savedProvider === 'openai') {
      savedApiKey = localStorage.getItem('OPENAI_API_KEY') || ''
    }

    // 根據 provider 選擇默認語音
    let savedVoice = localStorage.getItem('TTS_VOICE')
    if (!savedVoice) {
      if (savedProvider === 'glm') {
        savedVoice = 'tongtong' // GLM 彤彤默認音色
      } else {
        savedVoice = 'nova' // OpenAI 默認
      }
    }

    naturalTTSInstance = new NaturalTTS({
      provider: savedProvider,
      apiKey: savedApiKey,
      voice: savedVoice,
      rate: 1.0,
      pitch: 1.05,
      useProsody: true,
      useBreathing: true,
      useEmotion: true,
      ...config,
    })
  }

  return naturalTTSInstance
}

/**
 * 設置 TTS 配置
 */
export function setTTSConfig(config: Partial<NaturalVoiceConfig>) {
  if (config.provider) {
    localStorage.setItem('TTS_PROVIDER', config.provider)
  }
  if (config.apiKey) {
    // 根據 provider 保存到對應的 key
    const provider = config.provider || localStorage.getItem('TTS_PROVIDER') || 'browser'
    if (provider === 'glm') {
      localStorage.setItem('GLM_API_KEY', config.apiKey)
    } else if (provider === 'openai') {
      localStorage.setItem('OPENAI_API_KEY', config.apiKey)
    }
  }
  if (config.voice) {
    localStorage.setItem('TTS_VOICE', config.voice)
  }

  naturalTTSInstance = null // 重置實例
  return getNaturalTTS(config)
}

/**
 * 快速設置使用智譜 GLM TTS
 */
export function enableGLMTTS(apiKey: string, voice: GLMTTSVoice = 'tongtong') {
  localStorage.setItem('TTS_PROVIDER', 'glm')
  localStorage.setItem('GLM_API_KEY', apiKey)
  localStorage.setItem('TTS_VOICE', voice)

  naturalTTSInstance = null // 重置實例
  return getNaturalTTS({
    provider: 'glm',
    apiKey: apiKey,
    voice: voice,
  })
}

/**
 * 獲取 GLM TTS 可用聲音列表
 */
export function getGLMVoices(): Record<string, string> {
  return GLM_TTS_VOICES
}

/**
 * 獲取可用的語音列表
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return []
  }
  return window.speechSynthesis.getVoices()
}

/**
 * 獲取中文語音
 */
export function getChineseVoices(): SpeechSynthesisVoice[] {
  return getAvailableVoices().filter(v => v.lang.startsWith('zh'))
}
