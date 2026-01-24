// 語音識別服務
class SpeechRecognitionService {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.isSupported = false;
        this.init();
    }

    init() {
        // 檢查瀏覽器支持
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.isSupported = true;
            this.recognition = new SpeechRecognition();
            
            // 配置語音識別
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'zh-TW'; // 繁體中文
            this.recognition.maxAlternatives = 1;
            
            this.setupEventListeners();
        } else {
            console.warn('瀏覽器不支持語音識別功能');
        }
    }

    setupEventListeners() {
        if (!this.recognition) return;

        // 開始識別
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('語音識別已開始');
        };

        // 收到識別結果
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // 觸發識別事件
            if (typeof this.onResult === 'function') {
                this.onResult({
                    final: finalTranscript,
                    interim: interimTranscript,
                    confidence: event.results[event.resultIndex]?.[0]?.confidence || 0
                });
            }
        };

        // 識別結束
        this.recognition.onend = () => {
            this.isListening = false;
            console.log('語音識別已結束');
            // 如果是持續監聽模式且非手動停止，嘗試重新啟動（可選）
            // this.start(); 
        };

        // 識別錯誤
        this.recognition.onerror = (event) => {
            this.isListening = false;
            console.error('語音識別錯誤:', event.error);
            if (typeof this.onError === 'function') {
                this.onError(event.error);
            }
        };
    }

    // 開始語音識別
    start() {
        if (!this.isSupported) {
            throw new Error('瀏覽器不支持語音識別');
        }

        if (this.isListening) {
            console.log('語音識別已在運行');
            return;
        }

        try {
            this.recognition.start();
        } catch (error) {
            console.error('啟動語音識別失敗:', error);
            this.onError?.(error.message);
        }
    }

    // 停止語音識別
    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    // 切換識別狀態
    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }

    // 檢查是否在監聽
    get listening() {
        return this.isListening;
    }

    // 檢查是否支持
    get supported() {
        return this.isSupported;
    }

    // 設置事件回調
    set onResult(callback) {
        this.onResult = callback;
    }

    set onError(callback) {
        this.onError = callback;
    }
}

// 音頻錄製服務
class AudioRecorderService {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.init();
    }

    async init() {
        try {
            // 請求麥克風權限
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });
            console.log('麥克風權限已獲得');
        } catch (error) {
            console.error('無法訪問麥克風:', error);
            this.onError?.(error.message);
        }
    }

    startRecording() {
        if (!this.stream) {
            throw new Error('未獲得麥克風權限');
        }

        if (this.isRecording) {
            console.log('錄音已在進行中');
            return;
        }

        try {
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstart = () => {
                this.isRecording = true;
                console.log('開始錄音');
                this.onStart?.();
            };

            this.mediaRecorder.onstop = () => {
                this.isRecording = false;
                console.log('停止錄音');
                this.onStop?.();
            };

            this.mediaRecorder.onerror = (event) => {
                console.error('錄音錯誤:', event.error);
                this.onError?.(event.error);
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('啟動錄音失敗:', error);
            this.onError?.(error.message);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
    }

    // 獲取錄音數據
    getAudioData() {
        if (this.audioChunks.length === 0) {
            return null;
        }

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        return audioBlob;
    }

    // 獲取錄音URL
    getAudioURL() {
        const audioBlob = this.getAudioData();
        if (!audioBlob) return null;

        return URL.createObjectURL(audioBlob);
    }

    get recording() {
        return this.isRecording;
    }

    // 清理資源
    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        this.stream = null;
    }
}

// 語音處理工具
class VoiceProcessingUtils {
    // 檢測音量
    static async getAudioVolume(stream) {
        return new Promise((resolve) => {
            const audioContext = new AudioContext();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            
            microphone.connect(analyser);
            analyser.fftSize = 512;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const getVolume = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
                resolve(average);
            };

            getVolume();
            setTimeout(() => resolve(0), 100); // 1秒後清理
        });
    }

    // 噪音檢測
    static isNoise(volume, threshold = 20) {
        return volume < threshold;
    }

    // 格式化語音識別結果
    static formatRecognitionResult(result) {
        if (!result) return '';

        const { final, interim } = result;
        
        // 清理文本
        let text = final || interim;
        text = text.replace(/\s+/g, ' ').trim();
        
        // 移除特殊字符但保留中文
        text = text.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');
        
        return text;
    }

    // 檢查是否為語音指令
    static isVoiceCommand(text) {
        const commands = [
            '停止', '暫停', '繼續', '開始', '結束',
            '音量', '安靜', '說話', '聽我說',
            '播放', '暫停播放', '下一個', '上一個'
        ];

        return commands.some(command => text.includes(command));
    }

    // 提取語音指令
    static extractVoiceCommand(text) {
        const commands = [
            { pattern: /停止|暫停|結束/, action: 'stop' },
            { pattern: /繼續|開始/, action: 'start' },
            { pattern: /音量\d+/, action: 'volume', value: text.match(/音量(\d+)/)?.[1] },
            { pattern: /安靜/, action: 'mute' },
            { pattern: /說話/, action: 'unmute' },
            { pattern: /播放/, action: 'play' },
            { pattern: /暫停播放/, action: 'pause' }
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
    }
}

export {
    SpeechRecognitionService,
    AudioRecorderService,
    VoiceProcessingUtils
};