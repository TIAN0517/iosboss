import { TRADITIONAL_CHINESE_CONFIG } from './traditional-chinese-config';

interface NVIDIAConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  fallbackModel: string;
  timeout: number;
  maxRetries: number;
}

interface AIResponse {
  text: string;
  model: string;
  tokensUsed?: number;
  error?: string;
}

export class NVIDIA_NIM_Service {
  private config: NVIDIAConfig;
  private apiKeys: string[];
  private currentKeyIndex: number = 0;
  private enableKeyRotation: boolean;

  constructor() {
    const keysEnv = process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || '';
    this.apiKeys = keysEnv.split(',').map(k => k.trim()).filter(k => k.length > 0);
    
    this.config = {
      apiKey: this.apiKeys[0] || '',
      baseUrl: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
      model: process.env.NVIDIA_MODEL || 'minimaxai/minimax-m2.1',
      fallbackModel: process.env.NVIDIA_FALLBACK_MODEL || 'z-ai/glm4.7',
      timeout: parseInt(process.env.NVIDIA_TIMEOUT_MS || '15000'),
      maxRetries: parseInt(process.env.NVIDIA_MAX_RETRIES || '3'),
    };

    this.enableKeyRotation = process.env.NVIDIA_ENABLE_KEY_ROTATION === 'true';

    console.log(`[NVIDIA NIM] Initialized with ${this.apiKeys.length} API keys`);
    console.log(`[NVIDIA NIM] Primary model: ${this.config.model}`);
    console.log(`[NVIDIA NIM] Fallback model: ${this.config.fallbackModel}`);
  }

  private getCurrentApiKey(): string {
    if (!this.enableKeyRotation || this.apiKeys.length === 0) {
      return this.config.apiKey;
    }
    return this.apiKeys[this.currentKeyIndex];
  }

  private rotateApiKey(): void {
    if (this.apiKeys.length > 0) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      console.log(`[NVIDIA NIM] Rotated to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
    }
  }

  private getSystemPrompt(): string {
    return TRADITIONAL_CHINESE_CONFIG.systemPrompt;
  }

  async generateResponse(
    userId: string,
    message: string,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<AIResponse> {
    let lastError: any = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        console.log(`[NVIDIA NIM] Attempt ${attempt + 1}/${this.config.maxRetries}`);

        const apiKey = this.getCurrentApiKey();

        const messages = [
          { role: 'system', content: this.getSystemPrompt() },
          ...conversationHistory,
          { role: 'user', content: message },
        ];

        const requestBody = {
          model: this.config.model,
          messages,
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2000,
          stream: false,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json();
          const errorMsg = error.error?.message || error.message || 'NVIDIA NIM API 請求失敗';

          console.error(`[NVIDIA NIM] API Error:`, errorMsg);

          if (errorMsg.includes('401') || errorMsg.includes('auth') || errorMsg.includes('key')) {
            console.warn(`[NVIDIA NIM] API key ${this.currentKeyIndex} failed, rotating...`);
            this.rotateApiKey();
            continue;
          }

          throw new Error(errorMsg);
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content || '';

        console.log(`[NVIDIA NIM] Success! Model: ${this.config.model}, Tokens: ${data.usage?.total_tokens || 0}`);

        return {
          text: assistantMessage,
          model: this.config.model,
          tokensUsed: data.usage?.total_tokens,
        };
      } catch (error: any) {
        lastError = error;
        console.error(`[NVIDIA NIM] Attempt ${attempt + 1} failed:`, error.message);

        if (error.name === 'AbortError') {
          console.warn('[NVIDIA NIM] Request timeout');
        }

        if (this.enableKeyRotation && attempt < this.config.maxRetries - 1) {
          console.warn('[NVIDIA NIM] Retrying with next API key...');
          this.rotateApiKey();
        }

        if (attempt === this.config.maxRetries - 1) {
          console.error('[NVIDIA NIM] All attempts failed, trying fallback model...');
          return await this.generateWithFallback(userId, message, conversationHistory);
        }
      }
    }

    throw new Error(`NVIDIA NIM API failed after ${this.config.maxRetries} attempts: ${lastError?.message}`);
  }

  private async generateWithFallback(
    userId: string,
    message: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<AIResponse> {
    try {
      console.log(`[NVIDIA NIM] Using fallback model: ${this.config.fallbackModel}`);

      const messages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...conversationHistory,
        { role: 'user', content: message },
      ];

      const requestBody = {
        model: this.config.fallbackModel,
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000,
        stream: false,
      };

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getCurrentApiKey()}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Fallback model also failed');
      }

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || '';

      return {
        text: assistantMessage,
        model: this.config.fallbackModel,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (error) {
      console.error('[NVIDIA NIM] Fallback model failed:', error);
      throw error;
    }
  }

  async generateStreamingResponse(
    userId: string,
    message: string,
    onChunk: (chunk: string) => void,
    conversationHistory: Array<{ role: string; content: string }> = []
  ): Promise<void> {
    try {
      const apiKey = this.getCurrentApiKey();

      const messages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...conversationHistory,
        { role: 'user', content: message },
      ];

      const requestBody = {
        model: this.config.model,
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000,
        stream: true,
      };

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Streaming request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }

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
              onChunk('');
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              console.warn('[NVIDIA NIM] Failed to parse streaming chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('[NVIDIA NIM] Streaming error:', error);
      throw error;
    }
  }
}

let nvidiaServiceInstance: NVIDIA_NIM_Service | null = null;

export function getNVIDIANIMService(): NVIDIA_NIM_Service {
  if (!nvidiaServiceInstance) {
    nvidiaServiceInstance = new NVIDIA_NIM_Service();
  }
  return nvidiaServiceInstance;
}

export default NVIDIA_NIM_Service;
