/**
 * 自然語音合成 (Natural Text-to-Speech)
 * 使用端到端語音模式，讓 AI 助手說話更自然人性化
 */

export type TTSProvider = 'browser' | 'openai' | 'elevenlabs' | 'azure' | 'glm'

/**
 * 智譜 TTS 可用聲音 (GLM API 官方系統音色)
 * 官方文檔: https://docs.bigmodel.cn/api-reference/模型-api/文本转语音
 */
export const GLM_TTS_VOICES = {
  'tongtong': '彤彤 (默認音色)',
  'chuichui': '錘錘',
  'xiaochen': '小陳',
  'jam': '動動動物圈',
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
}

export interface TTSSegment {
  text: string
  pause?: number  // 停頓毫秒數
  emotion?: 'neutral' | 'happy' | 'concerned' | 'excited'
  speed?: number
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
   * 智能分段 - 將長文本分成自然的語音段落
   */
  private smartSegment(text: string): TTSSegment[] {
    // 清理文本
    const cleanText = text
      .replace(/```json\s*([\s\S]*?)\s*```/g, '') // 移除代碼塊
      .replace(/\*\*/g, '') // 移除粗體標記
      .replace(/#{1,6}\s/g, '') // 移除標題
      .trim()

    const segments: TTSSegment[] = []

    // 按標點符號分段
    const sentences = cleanText.split(/([。！？\n]+)/).filter(s => s.trim())

    let currentSegment = ''

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      currentSegment += sentence

      // 判斷是否應該分段
      const isEnd = sentence.match(/[。！？]/)
      const isBreak = sentence.includes('\n')

      if (isEnd || isBreak) {
        segments.push({
          text: currentSegment.trim(),
          pause: isBreak ? 800 : 400, // 換行停頓更長
          emotion: this.detectEmotion(currentSegment),
          speed: this.detectSpeed(currentSegment),
        })
        currentSegment = ''
      }
    }

    if (currentSegment.trim()) {
      segments.push({
        text: currentSegment.trim(),
        emotion: 'neutral',
      })
    }

    return segments
  }

  /**
   * 檢測情感
   */
  private detectEmotion(text: string): TTSSegment['emotion'] {
    if (text.includes('✅') || text.includes('成功') || text.includes('幫您')) {
      return 'happy'
    }
    if (text.includes('⚠️') || text.includes('提醒') || text.includes('注意')) {
      return 'concerned'
    }
    if (text.includes('🌟') || text.includes('真厲害') || text.includes('太棒')) {
      return 'excited'
    }
    return 'neutral'
  }

  /**
   * 檢測語速
   */
  private detectSpeed(text: string): number {
    // 數字和特殊符號讀慢一點
    if (text.match(/[0-9]/g) && text.match(/[0-9]/g)!.length > 3) {
      return 0.85
    }
    return 1.0
  }

  /**
   * 使用瀏覽器原生語音合成（優化版）
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
      utterance.rate = (segment.speed || this.config.rate || 1.0) * 0.95 // 稍微放慢，更自然
      utterance.pitch = this.config.pitch || 1.05 // 稍微高音，更親切
      utterance.volume = 1.0

      // 設置語調變化
      if (segment.emotion === 'happy') {
        utterance.pitch = 1.15
        utterance.rate = 1.05
      } else if (segment.emotion === 'concerned') {
        utterance.pitch = 0.95
        utterance.rate = 0.9
      } else if (segment.emotion === 'excited') {
        utterance.pitch = 1.2
        utterance.rate = 1.1
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
   * 選擇最佳語音
   */
  private selectBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    // 優先順序：
    // 1. 中文女聲
    // 2. 中文語音
    // 3. 台灣繁體中文
    // 4. 任何中文語音
    // 5. 第一個可用語音

    const taiwanFemale = voices.find(v =>
      v.lang === 'zh-TW' && v.name.includes('女')
    )

    const chineseFemale = voices.find(v =>
      v.lang.startsWith('zh') && (v.name.includes('Female') || v.name.includes('女'))
    )

    const taiwanVoice = voices.find(v => v.lang === 'zh-TW')
    const chineseVoice = voices.find(v => v.lang.startsWith('zh'))

    return taiwanFemale || chineseFemale || taiwanVoice || chineseVoice || voices[0] || null
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

      return new Promise((resolve, reject) => {
        source.onended = () => resolve()
        source.onerror = (e) => reject(e)
      })
    }
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
