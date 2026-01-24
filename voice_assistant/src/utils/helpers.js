// 豆包式語音助手輔助函數
import { SpeechRecognitionService } from './services/speechRecognition.js';
import { TextToSpeechService } from './services/textToSpeech.js';
import { AIService } from './services/aiChat.js';

// 語音助手配置常量
export const VOICE_ASSISTANT_CONFIG = {
    // AI 對話配置
    AI_CONFIG: {
        MODEL: 'gpt-3.5-turbo',
        TEMPERATURE: 0.7,
        MAX_TOKENS: 1000,
        SYSTEM_PROMPT: "你是九九瓦斯行的智能語音助手，名字叫豆包。你語氣友善專業，善於解答瓦斯相關問題，提供便民服務。請用繁體中文回答，語調自然友善。"
    },

    // 語音識別配置
    SPEECH_CONFIG: {
        LANGUAGE: 'zh-TW',
        CONTINUOUS: true,
        INTERIM_RESULTS: true,
        MAX_ALTERNATIVES: 1
    },

    // 語音合成配置
    TTS_CONFIG: {
        LANGUAGE: 'zh-TW',
        RATE: 1.0,
        PITCH: 1.0,
        VOLUME: 1.0
    },

    // UI 配置
    UI_CONFIG: {
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 500,
        MAX_CONVERSATION_LENGTH: 50,
        SESSION_TIMEOUT: 30 * 60 * 1000 // 30 分鐘
    }
};

// 語音助手狀態管理
export class VoiceAssistantState {
    constructor() {
        this.state = {
            isListening: false,
            isSpeaking: false,
            isProcessing: false,
            currentMessage: '',
            conversationHistory: [],
            error: null,
            sessionStartTime: Date.now(),
            userPreferences: {
                voice: null,
                language: 'zh-TW',
                autoSpeak: true,
                showTranscripts: true
            }
        };
        this.listeners = new Map();
    }

    // 獲取狀態
    getState() {
        return { ...this.state };
    }

    // 更新狀態
    setState(updates) {
        const previousState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        // 通知所有監聽器
        this.notifyListeners(previousState, this.state);
    }

    // 添加監聽器
    addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }

    // 移除監聽器
    removeListener(key, callback) {
        if (this.listeners.has(key)) {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // 通知監聽器
    notifyListeners(previousState, currentState) {
        this.listeners.forEach((callbacks, key) => {
            callbacks.forEach(callback => {
                try {
                    callback(currentState[key], previousState[key]);
                } catch (error) {
                    console.error(`監聽器錯誤 (${key}):`, error);
                }
            });
        });
    }
}

// 語音助手事件管理器
export class VoiceAssistantEvents {
    constructor() {
        this.events = {};
    }

    // 訂閱事件
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    // 取消訂閱
    off(event, callback) {
        if (this.events[event]) {
            const index = this.events[event].indexOf(callback);
            if (index > -1) {
                this.events[event].splice(index, 1);
            }
        }
    }

    // 觸發事件
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件處理器錯誤 (${event}):`, error);
                }
            });
        }
    }

    // 清除所有監聽器
    clear() {
        this.events = {};
    }
}

// 語音助手工具函數
export const VoiceAssistantUtils = {
    // 格式化時間
    formatTime(date = new Date()) {
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    // 格式化持續時間
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}小時${minutes % 60}分鐘${seconds % 60}秒`;
        } else if (minutes > 0) {
            return `${minutes}分鐘${seconds % 60}秒`;
        } else {
            return `${seconds}秒`;
        }
    },

    // 清理文本
    cleanText(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '')
            .replace(/[^\w\s.,!?;:()[\]{}'"-]/g, '');
    },

    // 檢查是否為語音指令
    isVoiceCommand(text) {
        const commands = [
            '停止', '暫停', '繼續', '開始', '結束',
            '音量', '安靜', '說話', '聽我說',
            '播放', '暫停播放', '下一個', '上一個',
            '清空', '重新開始', '謝謝', '再見'
        ];

        return commands.some(command => text.includes(command));
    },

    // 提取語音指令
    extractVoiceCommand(text) {
        const commands = [
            { pattern: /停止|暫停|結束/, action: 'stop' },
            { pattern: /繼續|開始/, action: 'start' },
            { pattern: /音量\d+/, action: 'volume', value: parseInt(text.match(/音量(\d+)/)?.[1] || '50') },
            { pattern: /安靜/, action: 'mute' },
            { pattern: /說話/, action: 'unmute' },
            { pattern: /播放/, action: 'play' },
            { pattern: /暫停播放/, action: 'pause' },
            { pattern: /清空/, action: 'clear' },
            { pattern: /重新開始/, action: 'restart' },
            { pattern: /謝謝/, action: 'thanks' },
            { pattern: /再見/, action: 'goodbye' }
        ];

        for (const command of commands) {
            if (command.pattern.test(text)) {
                return {
                    action: command.action,
                    value: command.value
                };
            }
        }

        return null;
    },

    // 生成唯一 ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 深度克隆對象
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    },

    // 防抖函數
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 節流函數
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 檢查瀏覽器兼容性
    checkCompatibility() {
        const issues = [];

        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            issues.push('語音識別API');
        }

        if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
            issues.push('Web Audio API');
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            issues.push('媒體設備API');
        }

        if (!('speechSynthesis' in window)) {
            issues.push('語音合成API');
        }

        return {
            compatible: issues.length === 0,
            issues: issues
        };
    }
};

// 語音助手錯誤處理
export class VoiceAssistantError extends Error {
    constructor(message, code = 'UNKNOWN', details = {}) {
        super(message);
        this.name = 'VoiceAssistantError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
    }

    static create(type, message, details = {}) {
        const errorCodes = {
            'SPEECH_RECOGNITION': 'SR001',
            'SPEECH_SYNTHESIS': 'SS001',
            'AI_SERVICE': 'AI001',
            'MEDIA_PERMISSION': 'MP001',
            'BROWSER_COMPATIBILITY': 'BC001',
            'NETWORK': 'NET001',
            'TIMEOUT': 'TO001'
        };

        const code = errorCodes[type] || 'UNKNOWN';
        return new VoiceAssistantError(message, code, details);
    }
}

// 語音助手日誌系統
export class VoiceAssistantLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
    }

    log(level, message, data = {}) {
        const logEntry = {
            timestamp: new Date(),
            level: level,
            message: message,
            data: data
        };

        this.logs.push(logEntry);

        // 保持日誌數量限制
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }

        // 控制台輸出
        const emoji = {
            'info': 'ℹ️',
            'warn': '⚠️',
            'error': '❌',
            'debug': '🔍'
        };

        console[level](`${emoji[level]} [豆包] ${message}`, data);
    }

    info(message, data) {
        this.log('info', message, data);
    }

    warn(message, data) {
        this.log('warn', message, data);
    }

    error(message, data) {
        this.log('error', message, data);
    }

    debug(message, data) {
        this.log('debug', message, data);
    }

    getLogs() {
        return [...this.logs];
    }

    clear() {
        this.logs = [];
    }
}

// 創建全局實例
export const voiceAssistantState = new VoiceAssistantState();
export const voiceAssistantEvents = new VoiceAssistantEvents();
export const voiceAssistantLogger = new VoiceAssistantLogger();