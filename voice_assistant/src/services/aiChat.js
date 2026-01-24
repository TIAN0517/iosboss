// AI 對話服務
class AIService {
    constructor() {
        this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
        this.baseURL = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
        this.model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
        this.conversationHistory = [];
        this.systemPrompt = "你是九九瓦斯行的智能語音助手，名字叫豆包。你語氣友善專業，善於解答瓦斯相關問題，提供便民服務。";
    }

    // 添加對話記錄
    addToHistory(role, content) {
        this.conversationHistory.push({
            role: role,
            content: content
        });

        // 保持最近 10 輪對話
        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }
    }

    // 生成 AI 回應
    async generateResponse(userMessage, options = {}) {
        try {
            // 添加用戶消息到歷史
            this.addToHistory('user', userMessage);

            // 構建請求
            const messages = [
                {
                    role: 'system',
                    content: this.systemPrompt
                },
                ...this.conversationHistory
            ];

            const requestBody = {
                model: this.model,
                messages: messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 1000,
                stream: options.stream || false
            };

            console.log('正在生成 AI 回應...');

            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`AI API 請求失敗: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices[0]?.message?.content || '抱歉，我現在無法回應。';

            // 添加 AI 回應到歷史
            this.addToHistory('assistant', aiResponse);

            return {
                text: aiResponse,
                confidence: 0.9,
                processingTime: Date.now(),
                usage: data.usage
            };

        } catch (error) {
            console.error('AI 服務錯誤:', error);
            
            // 備用回應
            const fallbackResponse = this.getFallbackResponse(userMessage);
            return {
                text: fallbackResponse,
                confidence: 0.5,
                processingTime: Date.now(),
                isFallback: true
            };
        }
    }

    // 備用回應
    getFallbackResponse(message) {
        const responses = [
            "感謝您聯繫九九瓦斯行！我是豆包，您的專屬語音助手。",
            "我正在學習如何更好地為您服務，請稍等一下。",
            "如果您需要瓦斯配送或有任何疑問，我會為您提供專業建議。",
            "我是豆包，很高興為您服務！請告訴我您的需求。",
            "九九瓦斯行致力於為您提供優質的瓦斯服務。"
        ];

        // 簡單關鍵詞匹配
        const keywords = {
            '價格': '目前瓦斯價格：4kg NT$160，10kg NT$360，16kg NT$550，20kg NT$620-730，50kg NT$1,550',
            '配送': '我們提供全台配送服務，平日 8:00-18:00，假日 9:00-17:00',
            '訂購': '您可以電話訂購：02-XXXX-XXXX，或線上訂購',
            '客服': '客服專線：02-XXXX-XXXX，服務時間週一至週五 8:00-18:00',
            '安全': '使用瓦斯時請注意：定期檢查管線，保持通風良好，發現異味立即停用',
        };

        for (const [keyword, response] of Object.entries(keywords)) {
            if (message.includes(keyword)) {
                return response;
            }
        }

        return responses[Math.floor(Math.random() * responses.length)];
    }

    // 分析用戶意圖
    analyzeIntent(message) {
        const intents = {
            'greeting': ['你好', '嗨', '哈囉', '早安', '午安', '晚安'],
            'inquiry': ['價格', '多少錢', '費用', '多少'],
            'order': ['訂購', '訂單', '要買', '購買'],
            'delivery': ['配送', '送貨', '運費'],
            'service': ['客服', '服務', '聯絡'],
            'safety': ['安全', '注意事項', '使用'],
            'complaint': ['投訴', '問題', '不滿'],
            'thanks': ['謝謝', '感謝', '感恩']
        };

        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => message.includes(keyword))) {
                return intent;
            }
        }

        return 'general';
    }

    // 生成個性化回應
    generatePersonalizedResponse(intent, message) {
        const responses = {
            'greeting': '你好！我是豆包，九九瓦斯行的語音助手。很高興為您服務！',
            'inquiry': '關於價格資訊，我可以為您詳細介紹我們的產品和價格。',
            'order': '想要訂購瓦斯嗎？我可以為您處理訂單，請提供您的需求。',
            'delivery': '我們提供專業的瓦斯配送服務，可以為您安排合適的配送時間。',
            'service': '我們的客服團隊隨時為您服務，請告訴我您需要什麼幫助。',
            'safety': '瓦斯安全使用非常重要，讓我為您介紹安全注意事項。',
            'complaint': '感謝您的反饋，我會將您的意見轉達給相關部門處理。',
            'thanks': '不客氣！有任何問題隨時找我。'
        };

        return responses[intent] || '請告訴我我可以為您做什麼。';
    }

    // 設置系統提示
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt;
    }

    // 清空對話歷史
    clearHistory() {
        this.conversationHistory = [];
    }

    // 獲取對話摘要
    getConversationSummary() {
        return {
            totalMessages: this.conversationHistory.length,
            lastMessage: this.conversationHistory[this.conversationHistory.length - 1],
            summary: this.conversationHistory.map(msg => `${msg.role}: ${msg.content.substring(0, 50)}...`)
        };
    }
}

// 語音情感分析
class EmotionAnalysisService {
    constructor() {
        this.emotions = ['happy', 'sad', 'angry', 'surprised', 'fearful', 'disgusted', 'neutral'];
    }

    // 分析文本情感
    analyzeEmotion(text) {
        // 簡單的關鍵詞情感分析
        const positiveWords = ['好', '棒', '讚', '喜歡', '開心', '滿意', '謝謝'];
        const negativeWords = ['不好', '差', '討厭', '生氣', '不滿', '問題', '投訴'];

        let positiveScore = 0;
        let negativeScore = 0;

        positiveWords.forEach(word => {
            if (text.includes(word)) positiveScore++;
        });

        negativeWords.forEach(word => {
            if (text.includes(word)) negativeScore++;
        });

        if (positiveScore > negativeScore) {
            return 'happy';
        } else if (negativeScore > positiveScore) {
            return 'sad';
        } else {
            return 'neutral';
        }
    }

    // 根據情感調整回應
    adjustResponseByEmotion(response, emotion) {
        const emotionAdjustments = {
            'happy': ' 😊',
            'sad': ' 💙',
            'angry': ' 😔',
            'surprised': ' 😮',
            'fearful': ' 😰',
            'disgusted': ' 😕'
        };

        return response + (emotionAdjustments[emotion] || '');
    }
}

// 對話管理服務
class ConversationManager {
    constructor() {
        this.conversations = new Map(); // 用戶 ID -> 對話數據
        this.activeUsers = new Set();
    }

    // 創建或獲取用戶對話
    getUserConversation(userId) {
        if (!this.conversations.has(userId)) {
            this.conversations.set(userId, {
                aiService: new AIService(),
                emotionService: new EmotionAnalysisService(),
                startTime: Date.now(),
                messageCount: 0,
                lastActivity: Date.now()
            });
        }

        const conversation = this.conversations.get(userId);
        conversation.lastActivity = Date.now();
        
        return conversation;
    }

    // 處理用戶消息
    async processUserMessage(userId, message, options = {}) {
        const conversation = this.getUserConversation(userId);
        const { aiService, emotionService } = conversation;

        // 分析情感
        const emotion = emotionService.analyzeEmotion(message);
        
        // 生成 AI 回應
        const aiResponse = await aiService.generateResponse(message, options);
        
        // 根據情感調整回應
        const adjustedResponse = emotionService.adjustResponseByEmotion(aiResponse.text, emotion);

        // 更新對話統計
        conversation.messageCount++;
        
        return {
            userMessage: message,
            aiResponse: adjustedResponse,
            emotion: emotion,
            confidence: aiResponse.confidence,
            processingTime: aiResponse.processingTime,
            conversationStats: {
                totalMessages: conversation.messageCount,
                sessionDuration: Date.now() - conversation.startTime
            }
        };
    }

    // 清理不活躍對話
    cleanupInactiveConversations(timeout = 30 * 60 * 1000) { // 30 分鐘
        const now = Date.now();
        for (const [userId, conversation] of this.conversations) {
            if (now - conversation.lastActivity > timeout) {
                this.conversations.delete(userId);
            }
        }
    }

    // 獲取所有對話統計
    getConversationStats() {
        const stats = {
            totalConversations: this.conversations.size,
            activeUsers: Array.from(this.activeUsers),
            averageMessageCount: 0,
            totalMessages: 0
        };

        if (this.conversations.size > 0) {
            let totalMessages = 0;
            this.conversations.forEach(conversation => {
                totalMessages += conversation.messageCount;
            });
            stats.totalMessages = totalMessages;
            stats.averageMessageCount = Math.round(totalMessages / this.conversations.size);
        }

        return stats;
    }
}

export {
    AIService,
    EmotionAnalysisService,
    ConversationManager
};