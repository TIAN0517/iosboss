/**
 * OLLAMA 本地 AI 提供商
 * 使用本地 OLLAMA 模型進行 AI 對話
 * 完全離線、隱私安全、免費使用
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface OllamaConfig {
  baseUrl: string      // OLLAMA 服務地址，默認 http://localhost:11434
  model: string        // 模型名稱，如 llama3, qwen2.5, gemma2 等
  temperature?: number // 溫度參數 (0-1)
  stream?: boolean     // 是否串流回應
}

export interface OllamaResponse {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
}

/**
 * OLLAMA AI 客戶端
 */
export class OllamaClient {
  private config: OllamaConfig

  constructor(config: OllamaConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      model: config.model || 'llama3',
      temperature: config.temperature || 0.7,
      stream: config.stream !== false,
    }
  }

  /**
   * 測試 OLLAMA 連接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`)
      return response.ok
    } catch (error) {
      console.error('OLLAMA 連接失敗:', error)
      return false
    }
  }

  /**
   * 獲取可用模型列表
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`)
      if (!response.ok) throw new Error('獲取模型列表失敗')

      const data = await response.json()
      return data.models?.map((m: any) => m.name) || []
    } catch (error) {
      console.error('獲取模型列表失敗:', error)
      return []
    }
  }

  /**
   * AI 對話
   */
  async chat(
    messages: OllamaMessage[],
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    try {
      console.log('🤖 OLLAMA 請求:', {
        model: this.config.model,
        messagesCount: messages.length,
      })

      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages,
          stream: this.config.stream,
          options: {
            temperature: this.config.temperature,
            num_predict: 2000, // 最大 token 數
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`OLLAMA 請求失敗: ${response.status}`)
      }

      // 串流處理
      if (this.config.stream) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''

        if (!reader) {
          throw new Error('無法讀取回應串流')
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(line => line.trim())

          for (const line of lines) {
            try {
              const data = JSON.parse(line)
              if (data.message?.content) {
                const content = data.message.content
                fullResponse += content

                // 觸發回調
                if (onChunk) {
                  onChunk(content)
                }
              }

              if (data.done) {
                console.log('✅ OLLAMA 回應完成')
                return fullResponse
              }
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }

        return fullResponse
      }

      // 非串流處理
      const data: OllamaResponse = await response.json()
      console.log('✅ OLLAMA 回應:', data.message?.content)
      return data.message?.content || ''

    } catch (error) {
      console.error('OLLAMA 對話失敗:', error)
      throw error
    }
  }

  /**
   * 單次對話（便利方法）
   */
  async chatSingle(userMessage: string, systemPrompt?: string): Promise<string> {
    const messages: OllamaMessage[] = []

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      })
    }

    messages.push({
      role: 'user',
      content: userMessage,
    })

    return this.chat(messages)
  }

  /**
   * 更換模型
   */
  setModel(model: string) {
    this.config.model = model
  }

  /**
   * 獲取當前配置
   */
  getConfig(): OllamaConfig {
    return { ...this.config }
  }
}

// ========================================
// 單例模式
// ========================================

let ollamaClient: OllamaClient | null = null

/**
 * 獲取 OLLAMA 客戶端實例
 */
export function getOllamaClient(config?: Partial<OllamaConfig>): OllamaClient {
  if (!ollamaClient) {
    // 從 localStorage 讀取配置
    const savedBaseUrl = localStorage.getItem('OLLAMA_BASE_URL') || 'http://localhost:11434'
    const savedModel = localStorage.getItem('OLLAMA_MODEL') || 'llama3'
    const savedTemperature = parseFloat(localStorage.getItem('OLLAMA_TEMPERATURE') || '0.7')

    ollamaClient = new OllamaClient({
      baseUrl: config?.baseUrl || savedBaseUrl,
      model: config?.model || savedModel,
      temperature: config?.temperature || savedTemperature,
      stream: config?.stream !== false,
    })
  }

  return ollamaClient
}

/**
 * 設置 OLLAMA 配置
 */
export function setOllamaConfig(config: Partial<OllamaConfig>) {
  if (config.baseUrl) {
    localStorage.setItem('OLLAMA_BASE_URL', config.baseUrl)
  }
  if (config.model) {
    localStorage.setItem('OLLAMA_MODEL', config.model)
  }
  if (config.temperature !== undefined) {
    localStorage.setItem('OLLAMA_TEMPERATURE', config.temperature.toString())
  }

  // 重置客戶端實例
  ollamaClient = null
  return getOllamaClient(config)
}

/**
 * 測試 OLLAMA 連接
 */
export async function testOllamaConnection(): Promise<{
  success: boolean
  models?: string[]
  error?: string
}> {
  try {
    const client = getOllamaClient()
    const isConnected = await client.testConnection()

    if (!isConnected) {
      return {
        success: false,
        error: '無法連接到 OLLAMA 服務，請確認 OLLAMA 正在運行'
      }
    }

    const models = await client.getModels()

    return {
      success: true,
      models,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }
  }
}

/**
 * OLLAMA 系統提示詞模板
 */
export const OLLAMA_SYSTEM_PROMPTS = {
  default: `你是九九瓦斯行的 AI 助手，名字叫「小九」。

**你的特色：**
- 親切友善，像鄰居女孩一樣自然
- 說話簡潔明了，不囉嗦
- 會主動幫客戶處理問題
- 使用繁體中文

**你能做的事：**
1. 幫客戶訂購瓦斯
2. 查詢庫存和訂單
3. 回答瓦斯相關問題
4. 記錄客戶需求

**說話風格：**
- 用「呢、喔、啦」等語氣詞，更自然
- 不說機械化的「好的」，說「好的呢」
- 不說「請」，說「麻煩」
- 加上表情符號，更親切`,

  concise: `你是九九瓦斯行助手「小九」。
幫客戶解決瓦斯訂購、庫存查詢等問題。
說話親切自然，用繁體中文。`,

  professional: `你是九九瓦斯行的專業 AI 助手。
負責處理客戶訂單、查詢庫存、回答問題。
保持專業、友善的服務態度。`
}
