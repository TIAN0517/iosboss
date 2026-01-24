/**
 * BossJy-99 統一 AI 提供商管理層
 * 支持多個 AI 提供商和模型切換
 *
 * 支持的提供商：
 * - GLM 商業版 (Coding Max) - 完整高級功能
 * - GLM 原生版 - 基礎功能
 * - Ollama 本地模型 - 免費本地運行
 * - Kimi AI (Moonshot) - 選配
 * - Groq API - 超快速推理，選配
 * - OpenAI - 佔位符，未實現
 */

// ========================================
// 類型定義
// ========================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  model?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  thinking?: string;
  reasoning_content?: string;
  tool_calls?: any[];
}

export interface StreamChunk {
  type: 'content' | 'error' | 'thinking' | 'done';
  text?: string;
  done?: boolean;
}

export interface AIProvider {
  /**
   * 發送聊天訊息（非串流）
   */
  chat(message: string, history?: ChatMessage[]): Promise<ChatResponse>;

  /**
   * 發送聊天訊息（串流）
   */
  chatStream(message: string, history?: ChatMessage[]): AsyncGenerator<StreamChunk>;

  /**
   * 檢查提供商是否可用
   */
  isAvailable(): boolean;

  /**
   * 獲取提供商名稱
   */
  getName(): string;
}

// ========================================
// 系統提示詞定義
// ========================================

const SYSTEM_PROMPTS = {
  chat: `你是九九瓦斯行的專業 AI 助手，名字叫「BossJy-99助手」。

**你的角色定位：**
|- 專業、友好、響應迅速的商業助手
|- 熟悉瓦斯行所有業務流程
|- 可以為老板、員工、客戶提供不同層級的服務

**你可以處理的問題：**
🛵 訂單相關 - 查詢今日訂單、待配送訂單
👥 客戶管理 - 查詢客戶資料
📦 庫存管理 - 查詢當前庫存
💰 財務管理 - 今日營收、月度營收
📅 休假管理 - 查詢今日休假人員
📊 運營報表 - 統計數據查詢

**回覆風格：**
1. 簡潔明瞭，使用繁體中文
2. 重要數據使用粗體或列表呈現
3. 如無法理解用戶需求，主動詢問`,
  voice: `你是九九瓦斯行的語音助手。請用簡短、口語化的方式回應，每句話不超過20字。`,
  assistant: `你是九九瓦斯行的管理系統助手。專門處理員工查詢、庫存確認、營運數據等業務。`
};

// ========================================
// 多 Key 輪換 GLM Provider
// ========================================

interface MultiKeyGLMConfig {
  apiKeys: string[];
  model?: string;
  enableStreaming?: boolean;
  maxRetries?: number;
  timeout?: number;
}

class MultiKeyGLMProvider implements AIProvider {
  private config: Required<MultiKeyGLMConfig>;
  private currentKeyIndex = 0;
  private keyStats: Map<string, { success: number; failures: number; lastFailure?: number }> = new Map();

  constructor(config: MultiKeyGLMConfig) {
    console.log(`[MultiKeyGLMProvider] 接收到的 apiKeys 數量: ${config.apiKeys.length}`);
    if (config.apiKeys.length > 0) {
      console.log(`[MultiKeyGLMProvider] 第一個 key 長度: ${config.apiKeys[0].length}`);
      console.log(`[MultiKeyGLMProvider] 第一個 key 前 30 字符: ${config.apiKeys[0].substring(0, 30)}...`);
    }
    
    const filteredKeys = config.apiKeys.filter(k => {
      const trimmed = k.trim();
      const isValid = trimmed.length > 0;
      if (!isValid) {
        console.warn(`[MultiKeyGLMProvider] 過濾掉空 key: "${k}"`);
      } else if (trimmed.length < 10) {
        console.warn(`[MultiKeyGLMProvider] 過濾掉過短的 key (長度: ${trimmed.length}): "${trimmed.substring(0, 20)}..."`);
        return false;
      }
      return isValid;
    });
    
    this.config = {
      apiKeys: filteredKeys,
      model: config.model || 'glm-4.7-coding-max',
      enableStreaming: config.enableStreaming ?? true,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 60000,
    };

    this.config.apiKeys.forEach(key => {
      this.keyStats.set(key, { success: 0, failures: 0 });
    });

    console.log(`[多 Key GLM Provider] 已初始化，共 ${this.config.apiKeys.length} 個 Key`);
    if (this.config.apiKeys.length === 0) {
      console.error(`[MultiKeyGLMProvider] ⚠️ 警告：沒有有效的 API Keys！`);
      console.error(`[MultiKeyGLMProvider] 原始 apiKeys 數量: ${config.apiKeys.length}`);
    }
  }

  private getBestApiKey(): string {
    if (this.config.apiKeys.length === 0) throw new Error('沒有可用的 API Key');
    if (this.config.apiKeys.length === 1) return this.config.apiKeys[0];

    let bestKey = this.config.apiKeys[0];
    let bestScore = -Infinity;

    this.config.apiKeys.forEach((key) => {
      const stats = this.keyStats.get(key);
      if (!stats) return;
      const recentFailurePenalty = stats.lastFailure && (Date.now() - stats.lastFailure < 3600000) ? 5 : 0;
      const score = stats.success * 2 - stats.failures - recentFailurePenalty;
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    });

    this.currentKeyIndex = this.config.apiKeys.indexOf(bestKey);
    return bestKey;
  }

  private markKeySuccess(key: string): void {
    const stats = this.keyStats.get(key);
    if (stats) {
      stats.success++;
      stats.lastFailure = undefined;
      this.keyStats.set(key, stats);
    }
  }

  private markKeyFailure(key: string): void {
    const stats = this.keyStats.get(key);
    if (stats) {
      stats.failures++;
      stats.lastFailure = Date.now();
      this.keyStats.set(key, stats);
    }
  }

  private rotateToNextKey(): void {
    if (this.config.apiKeys.length > 1) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.config.apiKeys.length;
    }
  }

  isAvailable(): boolean {
    return this.config.apiKeys.length > 0;
  }

  getName(): string {
    return `GLM-4.7 多 Key (${this.config.apiKeys.length} 個 Key)`;
  }

  async chat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    if (!this.isAvailable()) throw new Error('沒有可用的 API Key');

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.chat },
      ...(history?.slice(-5) || []).map(msg => ({ role: msg.role, content: msg.content.substring(0, 500) })),
      { role: 'user', content: message },
    ];

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const apiKey = this.getBestApiKey();
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-provider-unified.ts:187',message:'開始 API 請求',data:{attempt:attempt+1,maxRetries:this.config.maxRetries,apiKeyLength:apiKey.length,model:this.config.model,timeout:this.config.timeout},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            stream: false,
            temperature: 0.8,
            max_tokens: 2000,
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.markKeyFailure(apiKey);
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-provider-unified.ts:204',message:'API 請求失敗',data:{status:response.status,statusText:response.statusText,errorMessage:errorData.error?.message,attempt:attempt+1},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'F'})}).catch(()=>{});
          // #endregion

          if ((response.status === 401 || response.status === 403) && attempt < this.config.maxRetries - 1) {
            this.rotateToNextKey();
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }

          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        this.markKeySuccess(apiKey);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-provider-unified.ts:217',message:'API 請求成功',data:{contentLength:content.length,model:data.model,hasUsage:!!data.usage},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'F'})}).catch(()=>{});
        // #endregion

        return {
          content,
          model: data.model || this.config.model,
          usage: data.usage,
        };
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-provider-unified.ts:226',message:'API 請求異常',data:{errorName:error?.name,errorMessage:error?.message,attempt:attempt+1,maxRetries:this.config.maxRetries},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        if (attempt < this.config.maxRetries - 1) {
          this.rotateToNextKey();
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-provider-unified.ts:236',message:'所有重試都失敗',data:{maxRetries:this.config.maxRetries},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    throw new Error('所有重試都失敗了');
  }

  async *chatStream(message: string, history?: ChatMessage[]): AsyncGenerator<StreamChunk> {
    if (!this.isAvailable()) throw new Error('沒有可用的 API Key');

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.chat },
      ...(history?.slice(-5) || []).map(msg => ({ role: msg.role, content: msg.content.substring(0, 500) })),
      { role: 'user', content: message },
    ];

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const apiKey = this.getBestApiKey();
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            stream: true,
            temperature: 0.8,
          }),
          signal: AbortSignal.timeout(this.config.timeout),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          this.markKeyFailure(apiKey);

          if ((response.status === 401 || response.status === 403) && attempt < this.config.maxRetries - 1) {
            this.rotateToNextKey();
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }

          throw new Error(errorData.error?.message || `HTTP ${response.status}`);
        }

        this.markKeySuccess(apiKey);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('無法讀取流式響應');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            if (line.trim() === 'data: [DONE]') {
              yield { type: 'done', done: true };
              return;
            }

            try {
              const data = JSON.parse(line.slice(5));
              const delta = data.choices?.[0]?.delta?.content || '';
              if (delta) yield { type: 'content', text: delta };
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }

        return;
      } catch (error: any) {
        if (attempt < this.config.maxRetries - 1) {
          this.rotateToNextKey();
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        yield { type: 'error', error: error.message };
        return;
      }
    }
  }
}

// ========================================
// Ollama 雲 API 提供商
// ========================================

interface OllamaConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  enableStreaming?: boolean;
  timeout?: number;
}

class OllamaProvider implements AIProvider {
  private config: Required<OllamaConfig>;
  private baseUrl: string;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl || 'https://ollama.com/v1';
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'deepseek-v3.1:671b', // 默認使用速度快、性能好的模型
      baseUrl: this.baseUrl,
      enableStreaming: config.enableStreaming ?? true,
      timeout: config.timeout || 60000,
    };

    console.log(`[Ollama Provider] 已初始化，模型: ${this.config.model}`);
  }

  isAvailable(): boolean {
    // 本地 Ollama（localhost:11434）不需要 API Key
    // 雲端 Ollama API 需要 API Key
    const isLocalOllama = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');
    return isLocalOllama || (!!this.config.apiKey && this.config.apiKey.length > 10);
  }

  getName(): string {
    return `Ollama (${this.config.model})`;
  }

  async chat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    if (!this.isAvailable()) throw new Error('Ollama 不可用');

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.chat },
      ...(history?.slice(-5) || []).map(msg => ({ role: msg.role, content: msg.content.substring(0, 500) })),
      { role: 'user', content: message },
    ];

    try {
      // 本地 Ollama 使用 /api/chat 端點
      const isLocalOllama = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');
      const endpoint = isLocalOllama ? '/api/chat' : '/chat/completions';
      const url = this.baseUrl.endsWith('/') ? this.baseUrl + 'api/chat' : `${this.baseUrl}/api/chat`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 雲端 Ollama 需要 Authorization header
      if (!isLocalOllama && this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const body = isLocalOllama
        ? {
            model: this.config.model,
            messages,
            stream: false,
          }
        : {
            model: this.config.model,
            messages,
            stream: false,
            temperature: 0.8,
            max_tokens: 2000,
          };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // 本地 Ollama 返回格式：{ message: { content: "..." } }
      // 雲端 Ollama 返回格式：{ choices: [{ message: { content: "..." } }] }
      const content = data.message?.content || data.choices?.[0]?.message?.content || '';

      return {
        content,
        model: data.model || this.config.model,
        usage: data.usage,
      };
    } catch (error: any) {
      console.error('[Ollama Provider] Chat error:', error);
      throw error;
    }
  }

  async *chatStream(message: string, history?: ChatMessage[]): AsyncGenerator<StreamChunk> {
    if (!this.isAvailable()) throw new Error('Ollama 不可用');

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.chat },
      ...(history?.slice(-5) || []).map(msg => ({ role: msg.role, content: msg.content.substring(0, 500) })),
      { role: 'user', content: message },
    ];

    try {
      // 本地 Ollama 使用 /api/chat 端點
      const isLocalOllama = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');
      const url = this.baseUrl.endsWith('/') ? this.baseUrl + 'api/chat' : `${this.baseUrl}/api/chat`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 雲端 Ollama 需要 Authorization header
      if (!isLocalOllama && this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const body = {
        model: this.config.model,
        messages,
        stream: true,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('無法讀取流式響應');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 本地 Ollama 返回多個 JSON 對象，每個一行
        // 格式：{"model":"...","created_at":"...","message":{"role":"assistant","content":"..."},"done":false}
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);
            const content = data.message?.content || '';
            if (content) yield { type: 'content', text: content };

            if (data.done) {
              yield { type: 'done', done: true };
              return;
            }
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }

      yield { type: 'done', done: true };
    } catch (error: any) {
      console.error('[Ollama Provider] Stream error:', error);
      yield { type: 'error', error: error.message };
    }
  }
}

// ========================================
// GLM 原生版提供商（現有功能）
// ========================================

class OriginalGLMProvider implements AIProvider {
  private apiKey: string;
  private mode: 'chat' | 'voice' | 'assistant' = 'chat';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.chat },
      ...(history?.slice(-5) || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content.substring(0, 500),
      })),
      { role: 'user', content: message },
    ];

    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages,
          stream: false,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        throw new Error(`GLM API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        model: data.model,
        usage: data.usage,
      };
    } catch (error) {
      console.error('GLM API error:', error);
      throw error;
    }
  }

  async *chatStream(message: string, history?: ChatMessage[]): AsyncGenerator<StreamChunk> {
    yield* this.getLocalResponseStream(message);
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getName(): string {
    return 'GLM 原生版';
  }

  private getLocalResponse(message: string): ChatResponse {
    const msg = message.toLowerCase();

    if (msg.includes('訂') && msg.includes('瓦斯')) {
      return { content: '好的！請問您需要訂購什麼規格的瓦斯呢？🛵' };
    }
    if (msg.includes('查') && msg.includes('庫存')) {
      return { content: '讓我幫您查詢目前庫存...📦 目前庫存充足喔！' };
    }
    if (msg.includes('查') && msg.includes('訂單')) {
      return { content: '讓我查詢您的訂單...📋 查詢完成！' };
    }

    return {
      content: '收到您的訊息了！您可以試試說「訂瓦斯」、「查庫存」或「查營收」喔！💪',
    };
  }

  private *getLocalResponseStream(message: string): AsyncGenerator<StreamChunk> {
    const response = this.getLocalResponse(message);

    yield { type: 'content', text: response.content };
    yield { type: 'done', done: true };
  }
}

// ========================================
// Kimi AI Provider (Moonshot API)
// ========================================

interface KimiConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  enableStreaming?: boolean;
  timeout?: number;
}

class KimiProvider implements AIProvider {
  private config: Required<KimiConfig>;

  constructor(config: KimiConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'kimi-k2-thinking-turbo',
      baseUrl: config.baseUrl || 'https://api.moonshot.cn/v1',
      enableStreaming: config.enableStreaming ?? true,
      timeout: config.timeout || 60000,
    };
    console.log(`[KimiProvider] 已初始化，模型: ${this.config.model}`);
  }

  isAvailable(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 10;
  }

  getName(): string {
    return `Kimi AI (${this.config.model})`;
  }

  async chat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    if (!this.isAvailable()) throw new Error('Kimi API Key 未配置');

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.chat },
      ...(history?.slice(-5) || []).map(msg => ({ role: msg.role, content: msg.content.substring(0, 500) })),
      { role: 'user', content: message },
    ];

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: false,
          temperature: 0.8,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        model: data.model || this.config.model,
        usage: data.usage,
      };
    } catch (error: any) {
      console.error('[KimiProvider] API error:', error);
      throw error;
    }
  }

  async *chatStream(message: string, history?: ChatMessage[]): AsyncGenerator<StreamChunk> {
    if (!this.isAvailable()) throw new Error('Kimi API Key 未配置');

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.chat },
      ...(history?.slice(-5) || []).map(msg => ({ role: msg.role, content: msg.content.substring(0, 500) })),
      { role: 'user', content: message },
    ];

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
          temperature: 0.8,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Kimi API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('無法獲取 response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield { type: 'content', text: content };
              }
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }
      }

      yield { type: 'done', done: true };
    } catch (error: any) {
      console.error('[KimiProvider] Stream error:', error);
      yield { type: 'error', text: error.message };
    }
  }
}

// ========================================
// Groq API Provider (超快速推理)
// ========================================

interface GroqConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  enableStreaming?: boolean;
  timeout?: number;
}

class GroqProvider implements AIProvider {
  private config: Required<GroqConfig>;

  constructor(config: GroqConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'llama-3.3-70b-versatile',
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1',
      enableStreaming: config.enableStreaming ?? true,
      timeout: config.timeout || 30000, // Groq 很快，默認 30 秒
    };
    console.log(`[GroqProvider] 已初始化，模型: ${this.config.model}`);
  }

  isAvailable(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 10;
  }

  getName(): string {
    return `Groq (${this.config.model})`;
  }

  async chat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    if (!this.isAvailable()) throw new Error('Groq API Key 未配置');

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.chat },
      ...(history?.slice(-5) || []).map(msg => ({ role: msg.role, content: msg.content.substring(0, 500) })),
      { role: 'user', content: message },
    ];

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: false,
          temperature: 0.8,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        model: data.model || this.config.model,
        usage: data.usage,
      };
    } catch (error: any) {
      console.error('[GroqProvider] API error:', error);
      throw error;
    }
  }

  async *chatStream(message: string, history?: ChatMessage[]): AsyncGenerator<StreamChunk> {
    if (!this.isAvailable()) throw new Error('Groq API Key 未配置');

    const messages: any[] = [
      { role: 'system', content: SYSTEM_PROMPTS.chat },
      ...(history?.slice(-5) || []).map(msg => ({ role: msg.role, content: msg.content.substring(0, 500) })),
      { role: 'user', content: message },
    ];

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: true,
          temperature: 0.8,
        }),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('無法獲取 response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield { type: 'content', text: content };
              }
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }
      }

      yield { type: 'done', done: true };
    } catch (error: any) {
      console.error('[GroqProvider] Stream error:', error);
      yield { type: 'error', text: error.message };
    }
  }
}

// ========================================
// 統一 AI 提供商管理層
// ========================================

class UnifiedAIProvider {
  private provider: AIProvider | null = null;
  private providerType: 'glm-commercials' | 'glm-original' | 'openai' | 'ollama' | 'kimi' | 'groq' = 'ollama';
  private currentModel: string | null = null; // 當前選擇的模型

  constructor() {
    this.initializeProvider();
  }

  /**
   * 設置當前模型（用於動態切換）
   */
  setModel(model: string): void {
    this.currentModel = model;
    console.log('[統一 AI 提供商] 設置模型:', model);
    this.initializeProvider();
  }

  /**
   * 獲取當前模型
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * 初始化 AI 提供商
   */
  private initializeProvider(): void {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-provider-unified.ts:433',message:'開始初始化 Provider',data:{hasNextAIProvider:!!process.env.NEXT_AI_PROVIDER,hasGLM_API_KEYS:!!process.env.GLM_API_KEYS,hasGLM_API_KEY:!!process.env.GLM_API_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const providerType = process.env.NEXT_AI_PROVIDER || 'ollama'; // 默認使用 Ollama
    this.providerType = providerType;

    // API Keys 配置
    let apiKeys: string[] = [];

    // 根據提供商類型獲取 API Keys
    switch (providerType) {
      case 'ollama':
        // Ollama 雲 API - 單個 Key
        if (process.env.OLLAMA_API_KEY) {
          apiKeys = [process.env.OLLAMA_API_KEY];
        }
        console.log(`[統一 AI 提供商] 已初始化 Ollama: ${apiKeys.length > 0 ? '已配置' : '未配置'}`);
        break;

      case 'kimi':
        // Kimi AI - 單個 Key
        if (process.env.KIMI_API_KEY) {
          apiKeys = [process.env.KIMI_API_KEY];
        }
        console.log(`[統一 AI 提供商] 已初始化 Kimi AI: ${apiKeys.length > 0 ? '已配置' : '未配置'}`);
        break;

      case 'groq':
        // Groq API - 單個 Key
        if (process.env.GROQ_API_KEY) {
          apiKeys = [process.env.GROQ_API_KEY];
        }
        console.log(`[統一 AI 提供商] 已初始化 Groq: ${apiKeys.length > 0 ? '已配置' : '未配置'}`);
        break;

      case 'glm-commercials':
        // GLM 商業版 - 支持多個 Keys
        if (process.env.GLM_API_KEYS) {
          const rawKeys = process.env.GLM_API_KEYS;
          console.log('[初始化] GLM_API_KEYS 原始值長度:', rawKeys.length);
          apiKeys = rawKeys
            .split(',')
            .map(key => key.trim())
            .filter(key => {
              // 過濾掉明顯無效的 key（API Key 通常至少 20 字符）
              const isValid = key.length > 10;
              if (!isValid && key.length > 0) {
                console.warn('[初始化] 過濾掉過短的 key (長度:', key.length, '):', key.substring(0, 20) + '...');
              }
              return isValid;
            });
          console.log('[初始化] 解析後的 apiKeys 數量:', apiKeys.length);
          if (apiKeys.length > 0) {
            console.log('[初始化] 第一個 key 長度:', apiKeys[0].length);
          }
        } else if (process.env.GLM_API_KEY) {
          const key = process.env.GLM_API_KEY.trim();
          if (key.length > 10) {
            apiKeys = [key];
            console.log('[初始化] 使用 GLM_API_KEY，長度:', key.length);
          } else {
            console.warn('[初始化] GLM_API_KEY 長度過短:', key.length);
          }
        }
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-provider-unified.ts:449',message:'GLM 商業版初始化',data:{apiKeysCount:apiKeys.length,hasGLM_API_KEYS:!!process.env.GLM_API_KEYS,hasGLM_API_KEY:!!process.env.GLM_API_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.log(`[統一 AI 提供商] 已初始化 GLM 商業版 (增強): 多個 Keys=${apiKeys.length}`);
        break;

      case 'glm-original':
        // GLM 原生版 - 單個 Key
        if (process.env.GLM_API_KEY) {
          apiKeys = [process.env.GLM_API_KEY];
        }
        console.log(`[統一 AI 提供商] 已初始化 GLM 原生版: 單個 Key`);
        break;

      case 'openai':
        // OpenAI - 佔位符
        if (process.env.OPENAI_API_KEY) {
          apiKeys = [process.env.OPENAI_API_KEY];
        }
        console.log(`[統一 AI 提供商] 已初始化 OpenAI: ${apiKeys.length > 0 ? '已配置' : '未配置'}`);
        break;
    }

    // 創建提供商實例
    if (apiKeys.length > 0 || providerType === 'ollama') {
      switch (providerType) {
        case 'ollama':
          // Ollama 雲 API
          const ollamaApiKey = process.env.OLLAMA_API_KEY || '';
          // 優先使用當前設置的模型，否則使用環境變量
          const ollamaModel = this.currentModel || process.env.OLLAMA_MODEL || 'qwen2.5:14b'; // 默認使用 qwen2.5:14b
          const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
          const ollamaTimeout = parseInt(process.env.OLLAMA_TIMEOUT || '60000');

          // 本地 Ollama 不需要 API Key
          this.provider = new OllamaProvider({
            apiKey: ollamaApiKey,
            model: ollamaModel,
            baseUrl: ollamaBaseUrl,
            enableStreaming: process.env.OLLAMA_ENABLE_STREAMING !== 'false',
            timeout: ollamaTimeout,
          });
          console.log(`[統一 AI 提供商] 已創建 Ollama Provider，模型: ${ollamaModel}，地址: ${ollamaBaseUrl}`);
          break;

        case 'kimi':
          // Kimi AI Provider
          const kimiModel = process.env.KIMI_MODEL || 'kimi-k2-thinking-turbo';
          const kimiBaseUrl = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
          const kimiTimeout = parseInt(process.env.KIMI_TIMEOUT || '60000');

          this.provider = new KimiProvider({
            apiKey: apiKeys[0],
            model: kimiModel,
            baseUrl: kimiBaseUrl,
            enableStreaming: true,
            timeout: kimiTimeout,
          });
          console.log(`[統一 AI 提供商] 已創建 Kimi Provider，模型: ${kimiModel}`);
          break;

        case 'groq':
          // Groq Provider (超快速推理)
          const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
          const groqBaseUrl = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
          const groqTimeout = parseInt(process.env.GROQ_TIMEOUT || '30000');

          this.provider = new GroqProvider({
            apiKey: apiKeys[0],
            model: groqModel,
            baseUrl: groqBaseUrl,
            enableStreaming: true,
            timeout: groqTimeout,
          });
          console.log(`[統一 AI 提供商] 已創建 Groq Provider，模型: ${groqModel}`);
          break;

        case 'glm-commercials':
          // 使用多 Key 輪換的 GLM Provider
          const model = process.env.GLM_MODEL || 'glm-4.7-coding-max';
          const timeout = parseInt(process.env.GLM_TIMEOUT || '60000');
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-provider-unified.ts:474',message:'創建 MultiKeyGLMProvider',data:{apiKeysCount:apiKeys.length,model,timeout,enableStreaming:process.env.GLM_ENABLE_STREAMING !== 'false'},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          this.provider = new MultiKeyGLMProvider({
            apiKeys,
            model,
            enableStreaming: process.env.GLM_ENABLE_STREAMING !== 'false',
            maxRetries: 3,
            timeout,
          });
          break;

        case 'glm-original':
          this.provider = new OriginalGLMProvider(apiKeys[0]);
          break;

        case 'openai':
          // OpenAI 尚未實現，使用 GLM 作為回退
          this.provider = new OriginalGLMProvider(apiKeys[0]);
          console.log('[統一 AI 提供商] OpenAI 尚未實現，使用 GLM 回退');
          break;
      }
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ai-provider-unified.ts:493',message:'無 API Key，使用本地回退',data:{providerType},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.warn('[統一 AI 提供商] 未配置任何 API Key，使用本地回退模式');
      // 沒有 API Key 時，創建一個空提供商用於本地回退
      this.provider = new OriginalGLMProvider('');
    }
  }

  /**
   * 重新加載配置
   */
  reloadConfig(): void {
    this.initializeProvider();
    console.log('[統一 AI 提供商] 配置已重新加載');
  }

  /**
   * 發送聊天訊息（非串流）
   */
  async chat(message: string, history?: ChatMessage[]): Promise<ChatResponse> {
    if (!this.provider || !this.provider.isAvailable()) {
      // 如果沒有可用的 API Key，使用本地回退
      return this.getLocalResponse(message);
    }

    return await this.provider.chat(message, history);
  }

  /**
   * 發送聊天訊息（串流）
   */
  async *chatStream(message: string, history?: ChatMessage[]): AsyncGenerator<StreamChunk> {
    if (!this.provider || !this.provider.isAvailable()) {
      // 如果沒有可用的 API Key，使用本地回退
      yield* this.getLocalResponseStream(message);
      return;
    }

    yield* this.provider.chatStream(message, history);
  }

  /**
   * 使用函數調用（僅 GLM 商業版支持）
   */
  async chatWithTools(message: string, tools: any[], history?: ChatMessage[]): Promise<{ content: string; tool_calls?: any[]; usage?: any }> {
    if (!this.provider || !this.provider.isAvailable()) {
      // 如果沒有可用的 API Key，使用本地回退
      return this.getLocalResponse(message);
    }

    // 僅 GLM 商業版支持工具調用
    if (this.providerType === 'glm-commercials' && (this.provider as any).chatWithTools) {
      return await (this.provider as any).chatWithTools(message, tools, history);
    }

    return this.provider?.chat(message, history) || this.getLocalResponse(message);
  }

  /**
   * 檢查提供商是否可用
   */
  isAvailable(): boolean {
    return this.provider?.isAvailable() || false;
  }

  /**
   * 獲取提供商名稱
   */
  getName(): string {
    return this.provider?.getName() || '本地回退模式';
  }

  /**
   * 獲取當前提供商類型
   */
  getProviderType(): string {
    return this.providerType;
  }
}

// ========================================
// 導出統一實例
// ========================================

export const aiProvider = new UnifiedAIProvider();
