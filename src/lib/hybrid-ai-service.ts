import OpenAI from 'openai';
import { openVoiceTTS } from './openvoice-tts';

interface AIResponse {
  content: string;
  provider: string;
  model: string;
  audioBuffer?: Buffer;
}

interface ConversationHistory {
  role: 'user' | 'assistant';
  content: string;
}

export class HybridAIService {
  private providers: {
    glm: OpenAI;
    kimi: OpenAI;
    groq: OpenAI;
  };
  private primaryProvider: 'glm' | 'kimi' | 'groq' = 'glm';
  private conversationHistory: Map<string, ConversationHistory[]> = new Map();

  constructor() {
    this.providers = {
      glm: new OpenAI({
        apiKey: process.env.GLM_API_KEY,
        baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
      }),
      kimi: new OpenAI({
        apiKey: process.env.KIMI_API_KEY,
        baseURL: 'https://api.moonshot.cn/v1',
      }),
      groq: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      }),
    };
  }

  async generateResponse(
    userId: string,
    message: string,
    options: {
      includeVoice?: boolean;
      voiceId?: string;
      emotion?: string;
    } = {}
  ): Promise<AIResponse> {
    const { includeVoice = false, voiceId, emotion } = options;

    try {
      const history = this.getHistory(userId);
      const aiResponse = await this.callCloudAI(message, history);
      
      this.updateHistory(userId, 'assistant', aiResponse.content);

      let audioBuffer: Buffer | undefined;
      if (includeVoice) {
        audioBuffer = await this.generateVoice(aiResponse.content, voiceId, emotion);
      }

      return {
        content: aiResponse.content,
        provider: aiResponse.provider,
        model: aiResponse.model,
        audioBuffer,
      };
    } catch (error) {
      console.error('AI response generation failed:', error);
      throw error;
    }
  }

  private async callCloudAI(
    message: string,
    history: ConversationHistory[]
  ): Promise<{ content: string; provider: string; model: string }> {
    const providers = ['glm', 'kimi', 'groq'] as const;

    for (const provider of providers) {
      try {
        const response = await this.providers[provider].chat.completions.create({
          model: this.getModelForProvider(provider),
          messages: [
            { role: 'system', content: this.getSystemPrompt() },
            ...history,
            { role: 'user', content: message },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        });

        return {
          content: response.choices[0].message.content || '',
          provider,
          model: this.getModelForProvider(provider),
        };
      } catch (error) {
        console.error(`${provider} AI failed:`, error);
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  private async generateVoice(
    text: string,
    voiceId?: string,
    emotion?: string
  ): Promise<Buffer> {
    try {
      const buffer = await openVoiceTTS.textToSpeech({
        text,
        voiceId: voiceId || 'mei',
        speed: 1.0,
        pitch: 1.0,
        emotion: emotion || 'friendly',
      });
      return buffer;
    } catch (error) {
      console.error('Voice generation failed:', error);
      throw new Error('Voice generation failed');
    }
  }

  private getSystemPrompt(): string {
    return `你是一个专业的瓦斯行客服AI助手，负责回答客户关于瓦斯订单、配送、价格、安全等问题。

角色设定：
- 名字：九九瓦斯行智能助手
- 语气：友好、专业、台湾腔
- 语言：繁体中文
- 服务对象：九九瓦斯行的客户

回答风格：
1. 使用台湾腔用语（如：真的、喔、啦、呢、呀）
2. 友好热情，如同真人客服
3. 信息准确，不胡编乱造
4. 遇到不确定的问题，建议联系客服
5. 表达感谢，建立良好关系

可用工具：
- 查询订单状态
- 查询客户信息
- 查询瓦斯价格
- 查询营业时间
- 查询配送范围
- 员工打卡功能

知识库：
- 瓦斯价格：4kg NT$180, 20kg NT$720, 50kg NT$1,800
- 营业时间：平日 08:00-20:00, 週日 09:00-18:00
- 配送范围：台北市、新北市、基隆市部分区域
- 付款方式：现金、月结、支票、转帐`;
  }

  private getModelForProvider(provider: 'glm' | 'kimi' | 'groq'): string {
    const models = {
      glm: 'glm-4-flash',
      kimi: 'kimi-k2-thinking-turbo',
      groq: 'llama-3.3-70b-versatile',
    };
    return models[provider];
  }

  private getHistory(userId: string): ConversationHistory[] {
    return this.conversationHistory.get(userId) || [];
  }

  private updateHistory(userId: string, role: 'user' | 'assistant', content: string): void {
    const history = this.getHistory(userId);
    history.push({ role, content });
    
    if (history.length > 20) {
      history.shift();
    }
    
    this.conversationHistory.set(userId, history);
  }

  clearHistory(userId: string): void {
    this.conversationHistory.delete(userId);
  }
}

export const hybridAIService = new HybridAIService();
