/**
 * Ollama 本地 LLM 客戶端配置
 * 
 * 支持完全離線運行，不依賴雲端 API
 * 適合內網環境
 */

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  images?: string[]  // 支持圖片輸入（VLM功能）
}

export interface OllamaResponse {
  model: string
  created_at: string
  message: {
    role: string
    content: string
  }
  done: boolean
  done_reason: string
}

export interface OllamaConfig {
  baseUrl?: string  // Ollama 服務器地址，默認 http://localhost:11434
  model?: string    // 使用的模型，默認 llama3.2
  temperature?: number  // 溫度，默認 0.1
  stream?: boolean     // 是否流式輸出，默認 false
}

export class OllamaClient {
  private baseUrl: string
  private model: string
  private temperature: number
  private stream: boolean

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.2'
    this.temperature = config.temperature || 0.1
    this.stream = config.stream !== undefined ? config.stream : false

    console.log(`[Ollama] 初始化: ${this.baseUrl} | Model: ${this.model}`)
  }

  /**
   * 創建聊天完成
   */
  async chatCompletions(options: {
    messages: OllamaMessage[]
    model?: string
    temperature?: number
    stream?: boolean
  }) {
    const model = options.model || this.model
    const temperature = options.temperature ?? this.temperature
    const stream = options.stream ?? this.stream

    console.log(`[Ollama] 發送請求: ${model} | 消息數: ${options.messages.length}`)

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          stream,
          options: {
            temperature,
            num_ctx: 8192,  // 上下文窗口大小
            num_predict: 2048,  // 最大輸出 token
          },
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Ollama API 錯誤: ${response.status} - ${error}`)
      }

      // 處理流式響應
      if (stream) {
        return this.handleStreamResponse(response)
      }

      // 處理非流式響應
      const data: OllamaResponse = await response.json()
      
      console.log(`[Ollama] 響應成功: ${data.message.content.substring(0, 100)}...`)

      return {
        choices: [
          {
            message: {
              role: data.message.role,
              content: data.message.content,
            },
          },
        ],
        model: data.model,
      }
    } catch (error) {
      console.error('[Ollama] 請求失敗:', error)
      throw error
    }
  }

  /**
   * 處理流式響應
   */
  private async handleStreamResponse(response: Response) {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('無法讀取流式響應')
    }

    const decoder = new TextDecoder()
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim())

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (data.message?.content) {
            fullContent += data.message.content
          }
        } catch (e) {
          // 忽略解析錯誤
        }
      }
    }

    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: fullContent,
          },
        },
      ],
      model: this.model,
    }
  }

  /**
   * 測試連接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`[Ollama] 連接成功！可用模型:`, data.models?.map((m: any) => m.name) || [])
        return true
      }
      return false
    } catch (error) {
      console.error('[Ollama] 連接失敗:', error)
      return false
    }
  }

  /**
   * 獲取已安裝的模型列表
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('獲取模型列表失敗')
      }

      const data = await response.json()
      const models = data.models?.map((m: any) => m.name) || []
      
      console.log(`[Ollama] 已安裝的模型:`, models)
      return models
    } catch (error) {
      console.error('[Ollama] 獲取模型列表失敗:', error)
      return []
    }
  }
}

/**
 * 創建預配置的 Ollama 客戶端
 */
export function createOllamaClient(config?: OllamaConfig): OllamaClient {
  return new OllamaClient(config)
}

// 默認導出
export const ollama = new OllamaClient()
