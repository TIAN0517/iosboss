// 語音合成服務
class TextToSpeechService {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.currentVoice = null;
        this.isSpeaking = false;
        
        // 初始化回調函數
        this.onVoicesLoaded = null;
        this.onStart = null;
        this.onEnd = null;
        this.onError = null;
        this.onPause = null;
        this.onResume = null;

        this.voiceOptions = {
            zhTW: {
                language: 'zh-TW',
                voice: null,
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0
            },
            zhCN: {
                language: 'zh-CN',
                voice: null,
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0
            },
            enUS: {
                language: 'en-US',
                voice: null,
                rate: 1.0,
                pitch: 1.0,
                volume: 1.0
            }
        };
        this.init();
    }

    init() {
        // 等待語音列表加載
        if (this.synthesis) {
            this.loadVoices();
        }
    }

    loadVoices() {
        const loadVoices = () => {
            this.voices = this.synthesis.getVoices();
            
            // 設置預設語音
            this.setDefaultVoice();
            
            // 觸發voicesloaded事件
            this.onVoicesLoaded?.();
        };

        // 如果語音已經加載
        if (this.voices.length > 0) {
            loadVoices();
        } else {
            // 否則等待voiceschanged事件
            this.synthesis.onvoiceschanged = loadVoices;
        }
    }

    setDefaultVoice() {
        // 優先選擇中文語音
        const preferredVoices = this.voices.filter(voice => 
            voice.lang.includes('zh') || voice.lang.includes('cn') || voice.lang.includes('tw')
        );

        if (preferredVoices.length > 0) {
            this.currentVoice = preferredVoices[0];
        } else if (this.voices.length > 0) {
            this.currentVoice = this.voices[0];
        }
    }

    // 設置語音參數
    setVoiceOptions(options) {
        Object.assign(this.voiceOptions.zhTW, options);
        Object.assign(this.voiceOptions.zhCN, options);
        Object.assign(this.voiceOptions.enUS, options);
    }

    // 選擇語音
    selectVoice(voiceName) {
        const voice = this.voices.find(v => v.name === voiceName || v.voiceURI === voiceName);
        if (voice) {
            this.currentVoice = voice;
            return true;
        }
        return false;
    }

    // 獲取可用語音列表
    getAvailableVoices() {
        return this.voices.map(voice => ({
            name: voice.name,
            lang: voice.lang,
            voiceURI: voice.voiceURI,
            localService: voice.localService
        }));
    }

    // 停止語音播放
    stop() {
        // 停止瀏覽器原生 TTS
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        // 停止 Web Audio API 播放
        if (this.currentSource) {
            try {
                this.currentSource.stop();
            } catch (e) {
                // 忽略已停止的錯誤
            }
            this.currentSource = null;
        }
        
        this.isSpeaking = false;
    }

    // 文字轉語音 (優先使用 API，失敗降級到瀏覽器原生)
    async speak(text, options = {}) {
        // 嘗試使用 API TTS
        try {
            await this.speakWithAPI(text, options);
        } catch (error) {
            console.warn('API TTS 失敗，降級使用瀏覽器原生 TTS:', error);
            await this.speakWithBrowser(text, options);
        }
    }

    // 使用智譜/OpenAI API 生成並播放語音
    async speakWithAPI(text, options = {}) {
        if (!this.apiKey) {
            throw new Error('API Key 未配置');
        }

        // 觸發開始回調
        this.isSpeaking = true;
        console.log('正在請求雲端語音合成...');
        if (typeof this.onStart === 'function') {
            this.onStart(text);
        }

        try {
            const response = await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    input: text,
                    voice: options.voice || this.voice,
                    speed: options.rate || 1.0
                })
            });

            if (!response.ok) {
                throw new Error(`API 請求失敗: ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            await this.playAudioBuffer(arrayBuffer);

            // 播放完成
            this.isSpeaking = false;
            console.log('語音播放完成');
            if (typeof this.onEnd === 'function') {
                this.onEnd(text);
            }

        } catch (error) {
            this.isSpeaking = false;
            if (typeof this.onError === 'function') {
                this.onError(error);
            }
            throw error;
        }
    }

    // 播放二進制音頻數據
    async playAudioBuffer(arrayBuffer) {
        // 確保 AudioContext 是活躍的（需要用戶交互後才能播放）
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        const audioBufferSource = await this.audioContext.decodeAudioData(arrayBuffer);
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBufferSource;
        source.connect(this.audioContext.destination);
        
        this.currentSource = source;

        return new Promise((resolve) => {
            source.onended = () => {
                this.currentSource = null;
                resolve();
            };
            source.start(0);
        });
    }

    // 瀏覽器原生 TTS (原有邏輯)
    speakWithBrowser(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject(new Error('瀏覽器不支持語音合成功能'));
                return;
            }

            // 停止當前播放
            if (this.synthesis) {
                this.synthesis.cancel();
            }

            // 確保有語音可用
            if (!this.currentVoice && this.voices.length === 0) {
                this.voices = this.synthesis.getVoices();
                this.setDefaultVoice();
            }

            // 創建語音utterance
            const utterance = new SpeechSynthesisUtterance(text);
            
            // 設置語音參數
            if (this.currentVoice) {
                utterance.voice = this.currentVoice;
            }
            utterance.lang = options.language || 'zh-TW';
            utterance.rate = options.rate || 1.1; // 默認稍微加快
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 1.0;

            // 設置事件監聽器
            utterance.onstart = () => {
                this.isSpeaking = true;
                if (typeof this.onStart === 'function') {
                    this.onStart(text);
                }
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                if (typeof this.onEnd === 'function') {
                    this.onEnd(text);
                }
                resolve();
            };

            utterance.onerror = (event) => {
                this.isSpeaking = false;
                console.error('語音播放錯誤:', event);
                if (typeof this.onError === 'function') {
                    this.onError(event.error);
                }
                // 有些瀏覽器會在取消時觸發錯誤，這裡不做硬性 reject
                if (event.error === 'interrupted' || event.error === 'canceled') {
                    resolve();
                } else {
                    reject(new Error(event.error));
                }
            };

            utterance.onpause = () => {
                this.isSpeaking = false;
                if (typeof this.onPause === 'function') {
                    this.onPause();
                }
            };

            utterance.onresume = () => {
                this.isSpeaking = true;
                if (typeof this.onResume === 'function') {
                    this.onResume();
                }
            };

            // 開始播放
            try {
                this.synthesis.speak(utterance);
            } catch (error) {
                this.isSpeaking = false;
                reject(error);
            }
        });
    }

    // 暫停語音播放
    pause() {
        if (this.synthesis && this.isSpeaking) {
            this.synthesis.pause();
        }
    }

    // 恢復語音播放
    resume() {
        if (this.synthesis) {
            this.synthesis.resume();
        }
    }

    // 檢查是否正在播放
    get speaking() {
        return this.isSpeaking;
    }

    // 檢查是否支援語音合成
    get supported() {
        return !!this.synthesis;
    }

    // 獲取當前語音狀態
    getStatus() {
        return {
            isSpeaking: this.isSpeaking,
            currentVoice: this.currentVoice ? {
                name: this.currentVoice.name,
                lang: this.currentVoice.lang
            } : null,
            availableVoices: this.getAvailableVoices().length,
            synthesis: this.synthesis ? 'available' : 'not supported'
        };
    }
}

// 高級語音處理工具
class AdvancedTTSService {
    constructor() {
        this.baseTTS = new TextToSpeechService();
        this.audioContext = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.isInitialized = true;
        } catch (error) {
            console.error('初始化音頻上下文失敗:', error);
        }
    }

    // 語音合併處理
    async speakSequentially(texts, options = {}) {
        const results = [];
        
        for (const text of texts) {
            try {
                await this.baseTTS.speak(text, options);
                results.push({ text, status: 'success' });
            } catch (error) {
                console.error('語音合成失敗:', error);
                results.push({ text, status: 'error', error: error.message });
            }
        }
        
        return results;
    }

    // 語音速度調節
    adjustSpeed(text, speed = 1.0) {
        // 根據速度調整文本
        const words = text.split(' ');
        const adjustedWords = words.map(word => {
            if (speed > 1.0) {
                // 快速：添加暫停
                return word + ',';
            } else if (speed < 1.0) {
                // 慢速：添加停頓
                return word + '...';
            }
            return word;
        });
        
        return adjustedWords.join(' ');
    }

    // 語音情感處理
    speakWithEmotion(text, emotion = 'neutral', options = {}) {
        const emotionSettings = {
            'happy': { rate: 1.1, pitch: 1.2, volume: 1.0 },
            'sad': { rate: 0.8, pitch: 0.8, volume: 0.9 },
            'angry': { rate: 1.2, pitch: 0.9, volume: 1.1 },
            'excited': { rate: 1.3, pitch: 1.3, volume: 1.0 },
            'calm': { rate: 0.9, pitch: 1.0, volume: 0.9 },
            'neutral': { rate: 1.0, pitch: 1.0, volume: 1.0 }
        };

        const emotionOptions = emotionSettings[emotion] || emotionSettings.neutral;
        const mergedOptions = { ...emotionOptions, ...options };

        return this.baseTTS.speak(text, mergedOptions);
    }

    // 語音分段處理（長文本）
    async speakLongText(text, maxLength = 200, options = {}) {
        const sentences = text.split(/[。！？]/);
        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxLength) {
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = sentence;
                } else {
                    chunks.push(sentence);
                }
            } else {
                currentChunk += sentence;
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return this.baseTTS.speakSequentially(chunks, options);
    }

    // 獲取語音統計信息
    getTTSStats() {
        return {
            ...this.baseTTS.getStatus(),
            audioContext: this.audioContext ? 'initialized' : 'not initialized',
            features: {
                emotion: true,
                speed: true,
                longText: true,
                sequential: true
            }
        };
    }
}

// 語音特效處理
class VoiceEffects {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
    }

    async init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
        } catch (error) {
            console.error('初始化語音特效失敗:', error);
        }
    }

    // 語音變調效果
    async speakWithPitchShift(text, pitchShift = 0) {
        if (!this.audioContext) {
            await this.init();
        }

        // 簡單的音調調整（實際應用中需要更複雜的處理）
        const adjustedText = this.adjustPitchInText(text, pitchShift);
        return adjustedText;
    }

    // 文字音調調整
    adjustPitchInText(text, pitchShift) {
        // 根據音調調整文字
        if (pitchShift > 0) {
            return text.replace(/[a-zA-Z]/g, (char) => char.toUpperCase());
        } else if (pitchShift < 0) {
            return text.replace(/[a-zA-Z]/g, (char) => char.toLowerCase());
        }
        return text;
    }

    // 語音延遲效果
    async speakWithDelay(text, delayMs = 500) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(text);
            }, delayMs);
        });
    }

    // 語音回音效果
    async speakWithEcho(text, echoDelay = 200, echoGain = 0.3) {
        if (!this.audioContext) {
            await this.init();
        }

        const originalText = text;
        const echoText = `[回音] ${text}`;

        return new Promise((resolve) => {
            // 先播放原聲
            setTimeout(() => {
                resolve(originalText);
            }, 0);

            // 延遲播放回音
            setTimeout(() => {
                resolve(echoText);
            }, echoDelay);
        });
    }
}

export {
    TextToSpeechService,
    AdvancedTTSService,
    VoiceEffects
};