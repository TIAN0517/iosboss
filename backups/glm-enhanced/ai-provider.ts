/**
 * 統一 AI 提供商層
 * 支持多個 AI 提供商，包含重試、降級、錯誤處理
 */

// ========================================
// 類型定義
// ========================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface AIProviderConfig {
  maxRetries?: number
  timeout?: number
  enableLocalFallback?: boolean
}

export type StreamChunk = { type: 'content'; text: string } | { type: 'error'; error: string }

// ========================================
// 統一 AI 提供商接口
// ========================================

export interface AIProvider {
  /**
   * 發送聊天訊息（非串流）
   */
  chat(message: string, history?: ChatMessage[]): Promise<ChatResponse>

  /**
   * 發送聊天訊息（串流）
   */
  chatStream(message: string, history?: ChatMessage[]): AsyncGenerator<StreamChunk>

  /**
   * 檢查提供商是否可用
   */
  isAvailable(): boolean

  /**
   * 獲取提供商名稱
   */
  getName(): string
}

// ========================================
// 系統提示定義
// ========================================

const SYSTEM_PROMPTS = {
  chat: `你是九九瓦斯行的專業 AI 助手，名字叫「BossJy-99助手」。

**你的角色定位：**
- 專業、友好、響應迅速的商業助手
- 熟悉瓦斯行所有業務流程
- 可以為老板、員工、客戶提供不同層級的服務

**你可以處理的問題：**
🛵 訂單相關 - 查詢今日訂單、待配送訂單
👥 客戶管理 - 查詢客戶資料
📦 庫存管理 - 查詢當前庫存
💰 財務管理 - 今日營收、月度營收
📊 運營報表 - 統計數據查詢
📅 休假管理 - 查詢今日休假人員

**回覆風格：**
1. 簡潔明瞭，使用繁體中文
2. 重要數據使用粗體或列表呈現
3. 如無法理解用戶需求，主動詢問`,
  voice: `你是九九瓦斯行的語音助手。請用簡短、口語化的方式回應，每句話不超過20字。`,
  assistant: `你是九九瓦斯行的管理系統助手。專門處理員工查詢、庫存確認、營運數據等業務。`
}

function getSystemPrompt(mode: 'chat' | 'voice' | 'assistant' = 'chat'): string {
  return SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat
}

// ========================================
// GLM 提供商實現
// ========================================

export class GLMProvider implements AIProvider {
  private apiKeys: string[]
  private mode: 'chat' | 'voice' | 'assistant' = 'chat'
  private currentKeyIndex = 0
  private config: Required<AIProviderConfig>

  // API 配置
  private readonly API_CONFIG = {
    // 主要模型 - 使用 GLM 4.7 特惠版 MAX（最強）
    primary: {
      baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: 'glm-4.7-coding-max',
    },
    // 備用模型
    fallback: {
      baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: 'glm-4-flash',
    },
  }

  constructor(apiKeys: string[], config: AIProviderConfig = {}, mode: 'chat' | 'voice' | 'assistant' = 'chat') {
    this.apiKeys = apiKeys.filter(k => k.trim().length > 0)
    this.mode = mode
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 60000,
      enableLocalFallback: config.enableLocalFallback ?? true,
    }
  }

  /**
   * 設置 AI 模式
   */
  setMode(mode: 'chat' | 'voice' | 'assistant') {
    this.mode = mode
  }

  getName(): string {
    return 'GLM'
  }

  isAvailable(): boolean {
    return this.apiKeys.length > 0
  }

  /**
   * 獲取當前 API Key
   */
  private getCurrentApiKey(): string {
    if (this.apiKeys.length === 0) {
      throw new Error('沒有可用的 API Key')
    }
    return this.apiKeys[this.currentKeyIndex]
  }

  /**
   * 切換到下一個 API Key
   */
  private rotateApiKey(): void {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
  }

  /**
   * 指數退避延遲
   */
  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  /**
   * 帶重試的 HTTP 請求
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(this.config.timeout),
      })

      // 檢查是否需要重試
      if (!response.ok && attempt < this.config.maxRetries) {
        const isAuthError = response.status === 401 || response.status === 403

        if (isAuthError) {
          // 認證錯誤：嘗試下一個 API Key
          this.rotateApiKey()
          console.log(`API Key 認證失敗，切換到下一個 Key (attempt ${attempt + 1})`)
          await this.backoff(attempt)

          // 更新請求中的 Authorization header
          const newOptions = {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': `Bearer ${this.getCurrentApiKey()}`,
            },
          }

          return this.fetchWithRetry(url, newOptions, attempt + 1)
        }

        // 其他錯誤：重試
        console.log(`請求失敗 (${response.status})，重試中... (attempt ${attempt + 1})`)
        await this.backoff(attempt)
        return this.fetchWithRetry(url, options, attempt + 1)
      }

      return response
    } catch (error) {
      // 網絡錯誤或超時：重試
      if (attempt < this.config.maxRetries) {
        console.log(`請求錯誤: ${error}，重試中... (attempt ${attempt + 1})`)
        await this.backoff(attempt)
        return this.fetchWithRetry(url, options, attempt + 1)
      }
      throw error
    }
  }

  /**
   * 構建請求頭
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getCurrentApiKey()}`,
    }
  }

  /**
   * 構建請求體
   */
  private getRequestBody(
    messages: ChatMessage[],
    stream: boolean = false
  ): any {
    return {
      model: this.API_CONFIG.primary.model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2000,
      stream,
    }
  }

  /**
   * 獲取系統提示詞
   */
  private getSystemPrompt(): string {
    return getSystemPrompt(this.mode)
  }

  /**
   * 聊天（非串流）
   */
  async chat(message: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    if (!this.isAvailable()) {
      throw new Error('GLM 提供商不可用：沒有配置 API Key')
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      ...history.slice(-10), // 只保留最近 10 條歷史
      { role: 'user', content: message },
    ]

    try {
      // 嘗試主要模型
      const response = await this.fetchWithRetry(
        this.API_CONFIG.primary.baseURL,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(this.getRequestBody(messages, false)),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'GLM API 請求失敗')
      }

      const data = await response.json()
      const content = data.choices[0]?.message?.content || ''

      return {
        content,
        model: data.model || this.API_CONFIG.primary.model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens || 0,
              completionTokens: data.usage.completion_tokens || 0,
              totalTokens: data.usage.total_tokens || 0,
            }
          : undefined,
      }
    } catch (error) {
      console.error('GLM API Error:', error)
      throw new Error(`GLM API 請求失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }

  /**
   * 聊天（串流）
   */
  async *chatStream(
    message: string,
    history: ChatMessage[] = []
  ): AsyncGenerator<StreamChunk> {
    if (!this.isAvailable()) {
      yield { type: 'error', error: 'GLM 提供商不可用：沒有配置 API Key' }
      return
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: this.getSystemPrompt() },
      ...history.slice(-10),
      { role: 'user', content: message },
    ]

    try {
      const response = await this.fetchWithRetry(
        this.API_CONFIG.primary.baseURL,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(this.getRequestBody(messages, true)),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        yield { type: 'error', error: error.error?.message || 'GLM API 請求失敗' }
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        yield { type: 'error', error: '無法讀取串流回應' }
        return
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content || ''

              if (content) {
                yield { type: 'content', text: content }
              }
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }
      }
    } catch (error) {
      console.error('GLM Stream API Error:', error)
      yield {
        type: 'error',
        error: `GLM API 串流請求失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
      }
    }
  }
}

// ========================================
// 本地 AI 提供商（後備方案）
// ========================================

export class LocalFallbackProvider implements AIProvider {
  async chat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    // 簡單的本地規則引擎
    const lowerMessage = message.toLowerCase()

    // 快速回應規則
    const quickResponses: Record<string, string> = {
      '今天的訂單': '正在查詢今日訂單...請使用訂單管理頁面查看詳細資訊。',
      '今日訂單': '正在查詢今日訂單...請使用訂單管理頁面查看詳細資訊。',
      '庫存': '瓦斯庫存充足，20kg瓦斯桶目前庫存正常。',
      '營業額': '請使用營運報表頁面查看詳細營收數據。',
      '休假': '請使用休假管理功能查看今日休假人員。',
    }

    for (const [key, response] of Object.entries(quickResponses)) {
      if (lowerMessage.includes(key)) {
        return { content: response, model: 'local-fallback' }
      }
    }

    return {
      content: '抱歉，AI 服務暫時無法使用。請稍後再試或聯繫管理員。',
      model: 'local-fallback',
    }
  }

  async *chatStream(
    message: string,
    history?: ChatMessage[]
  ): AsyncGenerator<StreamChunk> {
    const response = await this.chat(message, history)
    const words = response.content.split('')

    for (const word of words) {
      yield { type: 'content', text: word }
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }

  isAvailable(): boolean {
    return true // 本地提供商始終可用
  }

  getName(): string {
    return 'Local'
  }
}

// ========================================
// 統一 AI 管理器
// ========================================

export class AIManager {
  private providers: AIProvider[] = []
  private primaryProvider?: GLMProvider
  private fallbackProvider?: AIProvider

  constructor(config?: { 
    glmApiKeys?: string[]; 
    enableLocalFallback?: boolean;
    mode?: 'chat' | 'voice' | 'assistant';
  }) {
    // 添加 GLM 提供商（支持不同模式）
    if (config?.glmApiKeys && config.glmApiKeys.length > 0) {
      this.primaryProvider = new GLMProvider(config.glmApiKeys, {
        enableLocalFallback: config.enableLocalFallback ?? true,
      }, config.mode || 'chat')
      this.providers.push(this.primaryProvider)
    }

    // 添加本地後備提供商
    if (config?.enableLocalFallback !== false) {
      this.fallbackProvider = new LocalFallbackProvider()
      this.providers.push(this.fallbackProvider)
    }
  }

  /**
   * 切換 AI 模式
   */
  setMode(mode: 'chat' | 'voice' | 'assistant') {
    if (this.primaryProvider) {
      this.primaryProvider.setMode(mode)
    }
  }

  /**
   * 獲取可用的提供商
   */
  private getAvailableProvider(): AIProvider {
    // 優先使用主要提供商
    if (this.primaryProvider && this.primaryProvider.isAvailable()) {
      return this.primaryProvider
    }

    // 使用後備提供商
    if (this.fallbackProvider && this.fallbackProvider.isAvailable()) {
      return this.fallbackProvider
    }

    throw new Error('沒有可用的 AI 提供商')
  }

  /**
   * 發送聊天訊息（非串流）
   */
  async chat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    const provider = this.getAvailableProvider()
    return provider.chat(message, history)
  }

  /**
   * 發送聊天訊息（串流）
   */
  async *chatStream(
    message: string,
    history?: ChatMessage[]
  ): AsyncGenerator<StreamChunk> {
    const provider = this.getAvailableProvider()
    yield* provider.chatStream(message, history)
  }

  /**
   * 檢查是否有可用的提供商
   */
  isAvailable(): boolean {
    return this.providers.some(p => p.isAvailable())
  }

  /**
   * 獲取當前使用的提供商名稱
   */
  getCurrentProviderName(): string {
    try {
      return this.getAvailableProvider().getName()
    } catch {
      return 'None'
    }
  }
}

// ========================================
// 單例模式
// ========================================

let aiManagerInstance: AIManager | null = null

/**
 * 獲取 AI 管理器實例
 */
export function getAIManager(): AIManager {
  if (!aiManagerInstance) {
    // 從環境變量獲取 API Keys
    let apiKeys: string[] = []

    if (typeof process !== 'undefined' && process.env?.GLM_API_KEYS) {
      apiKeys = process.env.GLM_API_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0)
    } else if (typeof process !== 'undefined' && process.env?.GLM_API_KEY) {
      apiKeys = [process.env.GLM_API_KEY]
    }

    aiManagerInstance = new AIManager({
      glmApiKeys: apiKeys,
      enableLocalFallback: true,
    })
  }

  return aiManagerInstance
}

/**
 * 設置 API Keys（客戶端）
 */
export function setAIApiKeys(keys: string[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('GLM_API_KEYS', JSON.stringify(keys))
    }
  } catch (e) {
    console.warn('無法保存 API Keys:', e)
  }
  aiManagerInstance = null // 重置實例
}

/**
 * 獲取 API Keys（客戶端）
 */
export function getAIApiKeys(): string[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('GLM_API_KEYS')
      if (stored) {
        return JSON.parse(stored)
      }
    }
  } catch (e) {
    console.warn('無法讀取 API Keys:', e)
  }
  return []
}
