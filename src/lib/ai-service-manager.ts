/**
 * AI 服務管理器
 * 智能降級策略：NVIDIA NIM API（主要）→ Ollama（本地備用）
 * 當 NVIDIA 算力不夠時自動切換到本地 Ollama
 */

import { BossJy99Assistant, getBossJy99Assistant } from './boss-jy-99-api'

// ========================================
// AI 服務提供商
// ========================================

type AIProvider = 'nvidia-nim' | 'ollama'

interface AIProviderConfig {
  name: string
  provider: AIProvider
  priority: number
  available: boolean
  errorCount: number
  lastError?: Date
  cooldownUntil?: Date
}

// ========================================
// 統一 AI 服務管理器
// ========================================

export class AIServiceManager {
  private bossJy99: BossJy99Assistant
  private providers: Map<AIProvider, AIProviderConfig>
  private currentProvider: AIProvider
  private cooldownPeriod: number = 300000 // 5 分鐘冷卻期

  constructor() {
    this.bossJy99 = getBossJy99Assistant()
    this.providers = new Map()
    this.currentProvider = 'nvidia-nim'
    this.initializeProviders()
  }

  private initializeProviders() {
    this.providers.set('nvidia-nim', {
      name: 'NVIDIA NIM API',
      provider: 'nvidia-nim',
      priority: 1,
      available: true,
      errorCount: 0,
    })

    this.providers.set('ollama', {
      name: 'Ollama (本地)',
      provider: 'ollama',
      priority: 2,
      available: true,
      errorCount: 0,
    })
  }

  private getProvider(provider: AIProvider): AIProviderConfig {
    return this.providers.get(provider)!
  }

  private updateProviderStatus(provider: AIProvider, updates: Partial<AIProviderConfig>) {
    const config = this.providers.get(provider)
    if (config) {
      Object.assign(config, updates)
    }
  }

  private isProviderInCooldown(provider: AIProvider): boolean {
    const config = this.providers.get(provider)
    if (!config?.cooldownUntil) return false
    return new Date() < config.cooldownUntil
  }

  private checkProviderCooldown(provider: AIProvider) {
    const config = this.providers.get(provider)
    if (!config?.cooldownUntil) return

    if (new Date() >= config.cooldownUntil) {
      config.cooldownUntil = undefined
      config.available = true
      config.errorCount = 0
    }
  }

  private shouldSwitchProvider(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || ''

    const rateLimitErrors = [
      'rate limit',
      'quota exceeded',
      'insufficient',
      'capacity',
      '429',
      '503',
    ]

    return rateLimitErrors.some(err => errorMessage.toLowerCase().includes(err))
  }

  private markProviderError(provider: AIProvider, error: any) {
    const config = this.providers.get(provider)
    if (!config) return

    config.errorCount++

    if (this.shouldSwitchProvider(error)) {
      const cooldownEnd = new Date(Date.now() + this.cooldownPeriod)
      config.cooldownUntil = cooldownEnd
      config.available = false
      config.lastError = cooldownEnd

      console.log(`🔄 ${config.name} 進入冷卻期，將於 ${cooldownEnd.toLocaleTimeString('zh-TW')} 恢復`)
    }
  }

  private selectBestProvider(): AIProvider {
    let bestProvider: AIProvider | null = null
    let highestPriority = Infinity

    for (const [provider, config] of this.providers.entries()) {
      this.checkProviderCooldown(provider)

      if (!config.available) continue

      if (config.priority < highestPriority) {
        highestPriority = config.priority
        bestProvider = provider
      }
    }

    if (!bestProvider) {
      console.warn('⚠️ 所有 AI 提供商都在冷卻中，使用預設 NVIDIA NIM')
      return 'nvidia-nim'
    }

    return bestProvider
  }

  async generateResponse(
    userId: string,
    message: string,
    options: {
      conversationHistory?: Array<{ role: string; content: string }>
      forceProvider?: AIProvider
    } = {}
  ): Promise<{ text: string; provider: AIProvider; model: string }> {
    let provider = options.forceProvider || this.currentProvider
    let lastError: any = null
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      const providerConfig = this.providers.get(provider)
      if (!providerConfig) {
        throw new Error(`Unknown AI provider: ${provider}`)
      }

      if (this.isProviderInCooldown(provider)) {
        console.log(`⏸️ ${providerConfig.name} 在冷卻中，切換提供商...`)
        provider = this.selectBestProvider()
        attempts++
        continue
      }

      try {
        console.log(`🤖 使用 ${providerConfig.name} 生成回應...`)

        if (provider === 'nvidia-nim') {
          const response = await this.bossJy99.generateResponse(
            userId,
            message,
            options.conversationHistory || []
          )

          this.updateProviderStatus(provider, { errorCount: 0 })

          this.currentProvider = provider

          return {
            text: response,
            provider: 'nvidia-nim',
            model: 'MiniMax M2.1',
          }
        } else if (provider === 'ollama') {
          const response = await this.callOllama(message, options.conversationHistory || [])

          this.updateProviderStatus(provider, { errorCount: 0 })

          this.currentProvider = provider

          return {
            text: response,
            provider: 'ollama',
            model: 'Llama 3.3 (本地)',
          }
        }
      } catch (error) {
        lastError = error
        console.error(`❌ ${providerConfig.name} 錯誤:`, error)

        this.markProviderError(provider, error)

        if (this.shouldSwitchProvider(error)) {
          provider = this.selectBestProvider()
          console.log(`🔄 切換到 ${this.providers.get(provider)!.name}`)
          attempts++
        } else {
          attempts++
        }
      }
    }

    throw new Error(`AI 服務暫時無法使用: ${lastError?.message || 'Unknown error'}`)
  }

  private async callOllama(
    message: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<string> {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.3'

    const messages = [
      { role: 'system', content: '你是一個專業的瓦斯行客服AI助手。所有輸出必須使用繁體中文。' },
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        messages,
        stream: false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Ollama API 錯誤: ${error}`)
    }

    const data = await response.json()
    return data.message?.content || '抱歉，我無法生成回應。'
  }

  getCurrentProvider(): AIProvider {
    return this.currentProvider
  }

  getProvidersStatus(): AIProviderConfig[] {
    const status: AIProviderConfig[] = []

    for (const [provider, config] of this.providers.entries()) {
      status.push({
        ...config,
        available: this.isProviderInCooldown(provider) ? false : config.available,
      })
    }

    return status
  }

  switchProvider(provider: AIProvider): void {
    const config = this.providers.get(provider)
    if (!config) {
      throw new Error(`Unknown AI provider: ${provider}`)
    }

    if (!config.available) {
      throw new Error(`${config.name} 不可用`)
    }

    console.log(`🔄 手動切換到 ${config.name}`)
    this.currentProvider = provider
  }
}

let aiServiceManagerInstance: AIServiceManager | null = null

export function getAIServiceManager(): AIServiceManager {
  if (!aiServiceManagerInstance) {
    aiServiceManagerInstance = new AIServiceManager()
  }
  return aiServiceManagerInstance
}

export default AIServiceManager
