/**
 * GLM-4.7 商業版增强功能實現
 * BossJy-99 瓦斯行管理系統
 * 
 * 功能清單：
 * 1. 思考模式（Thinking Mode）- 啟用模型在回答前進行推理
 * 2. 流式響應（Streaming）- 實時顯示回應內容
 * 3. 函數調用（Function Calling）- 支持外部工具/API 調用
 * 4. 更大的上下文窗口 - 支持更長的對話歷史
 * 5. 高級錯誤處理 - 更好的重試和降級機制
 * 6. 使用量統計 - 追蹤 token 使用情況
 */

// ========================================
// GLM-4.7 API 配置
// ========================================

export interface GLMConfig {
  apiKey: string
  model: 'glm-4.7-coding-max' | 'glm-4.7-flash' | 'glm-4.7'
  baseURL?: string
  timeout?: number
  enableThinking?: boolean  // 是否啟用思考模式
  enableStreaming?: boolean  // 是否啟用流式響應
  maxRetries?: number
  enableLocalFallback?: boolean
}

export interface GLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string
  tool_calls?: any[]  // 函數調用（工具調用）
  thinking?: string  // 思考過程內容
}

export interface GLMResponse {
  content: string
  model: string
  thinking?: string  // 思考過程
  tool_calls?: any[]  // 工具調用結果
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  reasoning_content?: string  // 推理內容（新版 GLM）
}

// 商業版功能：思考模式提示詞
export const THINKING_PROMPT = `你是一個思考過程可見的 AI 助手。在回答用戶問題之前，你可以使用 <thinking> 標籤來展示你的思考過程。
在 <thinking> 標籤內部，請：
1. 分析用戶的問題和需求
2. 逐步拆解複雜問題
3. 考慮可能的解決方案
4. 評估不同方案的優劣
5. 選擇最佳方案
6. 規劃回答步驟
7. 如需要，列出假設和限制
8. 自我檢查推理過程是否有邏輯錯誤

用戶可以看到完整的思考過程，幫助他們理解你的推理能力。
記住：
- 思考過程要清晰、結構化
- 避免過度複雜或冗長的思考
- 專注於解決問題本身
- 完成思考後，使用 </thinking> 結束標籤，然後給出最終答案

思考結束後，請：
1. 簡潔明瞭地回答用戶的問題
2. 如果問題不完整，提出補充問題
3. 如需要，提供具體行動建議
4. 使用合適的語氣和表情符`;

// ========================================
// GLM-4.7 商業版 API 類
// ========================================

export class GLMEnhancedProvider {
  private config: Required<GLMConfig>
  private currentKeyIndex = 0
  private callHistory: Map<string, any[]> = new Map()
  
  constructor(config: Required<GLMConfig>) {
    this.config = {
      baseURL: config.baseURL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: config.model || 'glm-4.7-coding-max',
      timeout: config.timeout || 60000,
      enableThinking: config.enableThinking ?? true,
      enableStreaming: config.enableStreaming ?? true,
      maxRetries: config.maxRetries ?? 3,
      enableLocalFallback: config.enableLocalFallback ?? true,
    }
  }
  
  /**
   * 獲取請求頭（支持多個 API Key）
   */
  private getHeaders(): Record<string, string> {
    const apiKey = this.getCurrentApiKey();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
  }
  
  /**
   * 獲取當前 API Key（支持輪詢）
   */
  private getCurrentApiKey(): string {
    if (this.config.apiKey && this.config.apiKey.length > 0) {
      // 單一 Key 模式
      return this.config.apiKey;
    } else if (this.config.apiKeys && this.config.apiKeys.length > 0) {
      // 多 Key 輪詢模式
      return this.config.apiKeys[this.currentKeyIndex % this.config.apiKeys.length];
    }
    throw new Error('GLM API Key 未配置');
  }
  
  /**
   * 輪詢到下一個 API Key
   */
  private rotateApiKey(): void {
    if (this.config.apiKeys && this.config.apiKeys.length > 1) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.config.apiKeys.length;
      console.log(`切換到 API Key ${this.currentKeyIndex + 1}/${this.config.apiKeys.length}`);
    }
  }
  
  /**
   * 標記 API Key 失敗
   */
  private markApiKeyFailure(): void {
    if (this.config.apiKeys && this.config.apiKeys.length > 1) {
      const failedKey = this.config.apiKeys[this.currentKeyIndex % this.config.apiKeys.length];
      const failedCount = this.callHistory.get(failedKey) || 0;
      this.callHistory.set(failedKey, failedCount + 1);
      
      // 如果失敗次數超過 3 次，切換到下一個 Key
      if (failedCount >= 3) {
        console.log(`API Key ${this.currentKeyIndex + 1} 失敗 ${failedCount} 次，切換到下一個`);
        this.rotateApiKey();
      }
    }
  }
  
  /**
   * 標記 API Key 成功
   */
  private markApiKeySuccess(): void {
    if (this.config.apiKeys && this.config.apiKeys.length > 1) {
      const currentKey = this.config.apiKeys[this.currentKeyIndex % this.config.apiKeys.length];
      this.callHistory.delete(currentKey);
      console.log(`API Key ${this.currentKeyIndex + 1} 恢復正常`);
    }
  }
  
  /**
   * 構建請求體（支持思考模式）
   */
  private buildRequestBody(messages: GLMMessage[], enableThinking: boolean): string {
    // 如果啟用思考模式，添加思考提示
    if (enableThinking) {
      const systemMsg: GLMMessage = {
        role: 'system',
        content: THINKING_PROMPT,
      };
      return JSON.stringify({
        model: this.config.model,
        messages: [systemMsg, ...messages],
        stream: false, // 思考模式先不使用流式
        temperature: 0.8,
        top_p: 0.9,
      });
    } else {
      return JSON.stringify({
        model: this.config.model,
        messages,
        stream: false, // 非思考模式默認不使用流式（可在調用時開啟）
        temperature: 0.7,
      });
    }
  }
  
  /**
   * 解析 GLM 流式響應
   */
  private parseStreamLine(line: string): { done: boolean; content?: string; thinking?: string; tool_calls?: any[] } {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      
      try {
        const parsed = JSON.parse(data);
        
        // 檢查是否是工具調用
        if (parsed.choices && parsed.choices[0]?.message?.tool_calls) {
          return {
            done: false,
            content: undefined,
            tool_calls: parsed.choices[0].message.tool_calls,
          };
        }
        
        // 檢查思考內容（新版 GLM-4.7）
        if (parsed.choices && parsed.choices[0]?.message?.reasoning_content) {
          return {
            done: false,
            thinking: parsed.choices[0].message.reasoning_content,
          };
        }
        
        // 檢查正常內容
        if (parsed.choices && parsed.choices[0]?.message?.content) {
          return {
            done: false,
            content: parsed.choices[0].message.content,
          };
        }
        
        // 檢查結束標記
        if (parsed.choices && parsed.choices[0]?.finish_reason) {
          return {
            done: parsed.choices[0].finish_reason === 'stop',
            content: parsed.choices[0]?.message?.content,
          };
        }
      } catch (e) {
        console.warn('無法解析流式響應:', e);
      }
    }
    
    return { done: false };
  }
  
  /**
   * 檢查提供商是否可用
   */
  isAvailable(): boolean {
    const hasKey = this.config.apiKeys?.length > 0 || !!this.config.apiKey;
    return hasKey;
  }
  
  /**
   * 獲取提供商名稱
   */
  getName(): string {
    return 'GLM-4.7 商業版';
  }
  
  /**
   * 商業版功能：發送聊天訊息（支持思考模式和流式）
   */
  async chat(message: string, conversationHistory: GLMMessage[] = [], options: {
    enableThinking = false,
    enableStreaming = false,
    tools = undefined,
  }: Promise<{ content: string; thinking?: string; usage?: any; tool_calls?: any[] }> {
    
    if (!this.isAvailable()) {
      throw new Error('GLM API Key 未配置');
    }
    
    const finalEnableThinking = options.enableThinking ?? this.config.enableThinking;
    const finalEnableStreaming = options.enableStreaming ?? this.config.enableStreaming;
    
    try {
      const messages: GLMMessage[] = [
        ...(finalEnableThinking ? [{
          role: 'system',
          content: THINKING_PROMPT,
        }] : []),
        ...conversationHistory.slice(-10),
        { role: 'user', content: message },
      ];
      
      const requestBody = this.buildRequestBody(messages, finalEnableThinking);
      console.log('[GLM-4.7] 發送請求 (思考: %s, 流式: %s)', finalEnableThinking, finalEnableStreaming);
      
      const maxRetries = this.config.maxRetries ?? 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const signal = AbortSignal.timeout(this.config.timeout);
          
          const response = await fetch(this.config.baseURL, {
            method: 'POST',
            headers: this.getHeaders(),
            body: requestBody,
            signal,
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            const errorData = await response.json().catch(() => ({}));
            
            console.error('[GLM-4.7] API 錯誤:', response.status, errorText);
            
            // 檢查是否是 API Key 問題
            if (response.status === 401 || errorData.error?.code === 'invalid_api_key') {
              this.markApiKeyFailure();
            }
            
            // 標記成功（如果不是 401 錯誤）
            if (response.status !== 401) {
              this.markApiKeySuccess();
            }
            
            throw new Error(errorData.error?.message || `GLM API 請求失敗 (${response.status})`);
          }
          
          // 處理思考模式的響應
          const data = await response.json();
          
          if (finalEnableThinking) {
            // 思考模式：完整響應（不使用流式）
            const content = data.choices?.[0]?.message?.content || '';
            const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
            
            return {
              content,
              thinking: reasoning,
              usage: data.usage,
            };
          } else if (finalEnableStreaming) {
            // 流式模式：逐行解析
            const reader = response.body?.getReader();
            let fullContent = '';
            let thinking = '';
            let toolCalls: any[] = [];
            
            if (reader) {
              const decoder = new TextDecoder();
              let buffer = '';
              
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += value;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                  const parsed = this.parseStreamLine(line);
                  
                  if (parsed.content) fullContent += parsed.content;
                  if (parsed.thinking) thinking = parsed.thinking;
                  if (parsed.tool_calls) toolCalls = parsed.tool_calls;
                  
                  if (parsed.done) break;
                }
              }
            }
            
            return {
              content: fullContent,
              thinking: thinking || undefined,
              tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
              usage: undefined, // 流式響應在結束時不返回使用量
            };
          } else {
            // 非流式模式
            const content = data.choices?.[0]?.message?.content || '';
            const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
            
            return {
              content,
              thinking: finalEnableThinking ? reasoning : undefined,
              usage: data.usage,
            };
          }
        } catch (error) {
          // 重試邏輯
          if (attempt < maxRetries - 1) {
            console.log(`[GLM-4.7] 第 ${attempt + 1} 次重試...`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          
          this.markApiKeyFailure();
          throw error;
        }
      }
    } catch (error: any) {
      console.error('[GLM-4.7] 異常:', error);
      throw error;
    }
  }
  
  /**
   * 商業版功能：流式聊天（實時顯示）
   */
  async *chatStream(
    message: string,
    conversationHistory: GLMMessage[] = [],
    onChunk?: (chunk: { content: string; thinking?: string; done: boolean }) => void,
    options: {
      enableThinking = false,
      tools = undefined,
    }: AsyncGenerator<{ content: string; thinking?: string; done: boolean }> {
    
    if (!this.isAvailable()) {
      throw new Error('GLM API Key 未配置');
    }
    
    const finalEnableThinking = options.enableThinking ?? this.config.enableThinking;
    const finalEnableStreaming = true; // 流式模式總是啟用的
    
    try {
      const messages: GLMMessage[] = [
        ...(finalEnableThinking ? [{
          role: 'system',
          content: THINKING_PROMPT,
        }] : []),
        ...conversationHistory.slice(-10),
        { role: 'user', content: message },
      ];
      
      const requestBody = JSON.stringify({
        model: this.config.model,
        messages,
        stream: true, // 啟用流式
        temperature: 0.7,
      });
      
      console.log('[GLM-4.7] 發送流式請求 (思考: %s)', finalEnableThinking);
      
      const maxRetries = this.config.maxRetries ?? 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const signal = AbortSignal.timeout(this.config.timeout);
          
          const response = await fetch(this.config.baseURL, {
            method: 'POST',
            headers: this.getHeaders(),
            body: requestBody,
            signal,
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            const errorData = await response.json().catch(() => ({}));
            
            console.error('[GLM-4.7] API 錯誤:', response.status, errorText);
            
            if (response.status === 401 || errorData.error?.code === 'invalid_api_key') {
              this.markApiKeyFailure();
            } else {
              this.markApiKeySuccess();
            }
            
            throw new Error(errorData.error?.message || `GLM API 請求失敗 (${response.status})`);
          }
          
          // 解析流式響應
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('無法讀取流式響應');
          }
          
          const decoder = new TextDecoder();
          let buffer = '';
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += value;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
              const parsed = this.parseStreamLine(line);
              
              // 回調處理每個 chunk
              if (onChunk) {
                onChunk({
                  content: parsed.content || '',
                  thinking: parsed.thinking,
                  done: parsed.done,
                });
              }
              
              if (parsed.done) {
                reader.cancel();
                return;
              }
            }
          }
          
          return;
        } catch (error) {
          if (attempt < maxRetries - 1) {
            console.log(`[GLM-4.7] 流式第 ${attempt + 1} 次重試...`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          
          this.markApiKeyFailure();
          throw error;
        }
      }
    } catch (error) {
      console.error('[GLM-4.7] 流式異常:', error);
      throw error;
    }
  }
  
  /**
   * 商業版功能：函數調用（Function Calling）
   * 支持自定義工具/函數定義
   */
  async chatWithTools(
    message: string,
    tools: any[],
    conversationHistory: GLMMessage[] = [],
  ): Promise<{ content: string; tool_calls?: any[]; usage?: any }> {
    
    if (!this.isAvailable()) {
      throw new Error('GLM API Key 未配置');
    }
    
    try {
      const messages: GLMMessage[] = [
        ...(conversationHistory.slice(-10)),
        { role: 'user', content: message },
      ];
      
      const requestBody = JSON.stringify({
        model: this.config.model,
        messages,
        tools, // 傳遞工具定義
        stream: false, // 函數調用暫不使用流式
        temperature: 0.7,
      });
      
      console.log('[GLM-4.7] 發送函數調用請求');
      
      const maxRetries = this.config.maxRetries ?? 3;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const signal = AbortSignal.timeout(this.config.timeout);
          
          const response = await fetch(this.config.baseURL, {
            method: 'POST',
            headers: this.getHeaders(),
            body: requestBody,
            signal,
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            console.error('[GLM-4.7] 函數調用 API 錯誤:', response.status);
            this.markApiKeyFailure();
            
            throw new Error(errorData.error?.message || `GLM API 請求失敗 (${response.status})`);
          }
          
          const data = await response.json();
          
          // 處理工具調用結果
          const content = data.choices?.[0]?.message?.content || '';
          const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
          
          this.markApiKeySuccess();
          
          return {
            content,
            tool_calls,
            usage: data.usage,
          };
        } catch (error) {
          if (attempt < maxRetries - 1) {
            console.log(`[GLM-4.7] 函數調用第 ${attempt + 1} 次重試...`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
          
          this.markApiKeyFailure();
          throw error;
        }
      }
    } catch (error) {
      console.error('[GLM-4.7] 函數調用異常:', error);
      throw error;
    }
  }
}

// ========================================
// 工具定義示例（函數調用）
// ========================================

export const TOOL_DEFINITIONS = {
  // 查詢庫存
  query_inventory: {
    name: 'query_inventory',
    description: '查詢瓦斯庫存狀況',
    parameters: {
      type: 'object',
      properties: {
        item_type: {
          type: 'string',
          description: '庫存類型（瓦斯、鋼瓶等）',
          enum: ['gas', 'steel_cylinder'],
        },
      },
      required: ['item_type'],
    },
  },
  
  // 查詢今日訂單
  query_today_orders: {
    name: 'query_today_orders',
    description: '查詢今日所有訂單',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  
  // 創建新訂單
  create_order: {
    name: 'create_order',
    description: '創建新的客戶訂單',
    parameters: {
      type: 'object',
      properties: {
        customer_id: {
          type: 'string',
          description: '客戶 ID',
        },
        items: {
          type: 'array',
          description: '訂單項目',
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              quantity: { type: 'number' },
              unit: { type: 'string' },
            },
            required: ['product_id', 'quantity'],
          },
        },
      },
      required: ['customer_id', 'items'],
    },
  },
  
  // 查詢營運狀況
  query_daily_status: {
    name: 'query_daily_status',
    description: '查詢今日營運數據',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

// ========================================
// 導出增強提供商
// ========================================

export { GLMEnhancedProvider, THINKING_PROMPT, TOOL_DEFINITIONS };
