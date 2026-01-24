// React 主應用組件
import React, { useState, useEffect, useRef } from 'react';
import { 
    SpeechRecognitionService, 
    AudioRecorderService, 
    VoiceProcessingUtils 
} from '../services/speechRecognition.js';
import { AIService, ConversationManager } from '../services/aiChat.js';
import { TextToSpeechService } from '../services/textToSpeech.js';
import '../styles/VoiceAssistant.css';

const VoiceAssistant = () => {
    // 狀態管理
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');
    const [conversationHistory, setConversationHistory] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [recordingLevel, setRecordingLevel] = useState(0);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [conversationStats, setConversationStats] = useState({
        totalMessages: 0,
        sessionDuration: 0
    });

    // 服務實例
    const speechRecognitionRef = useRef(null);
    const audioRecorderRef = useRef(null);
    const ttsServiceRef = useRef(null);
    const conversationManagerRef = useRef(null);
    const sessionStartTimeRef = useRef(Date.now());

    // 初始化服務
    useEffect(() => {
        initializeServices();
        return () => {
            cleanup();
        };
    }, []);

    const initializeServices = () => {
        try {
            // 初始化語音識別
            speechRecognitionRef.current = new SpeechRecognitionService();
            speechRecognitionRef.current.onResult = handleSpeechResult;
            speechRecognitionRef.current.onError = handleSpeechError;

            // 初始化音頻錄製
            audioRecorderRef.current = new AudioRecorderService();
            audioRecorderRef.current.onError = handleAudioError;

            // 初始化語音合成
            ttsServiceRef.current = new TextToSpeechService();
            ttsServiceRef.current.onStart = () => setIsSpeaking(true);
            ttsServiceRef.current.onEnd = () => setIsSpeaking(false);

            // 初始化對話管理
            conversationManagerRef.current = new ConversationManager();

            // 開始會話時間
            sessionStartTimeRef.current = Date.now();

            console.log('語音助手服務初始化完成');
        } catch (error) {
            console.error('服務初始化失敗:', error);
            setError('服務初始化失敗，請檢查瀏覽器權限');
        }
    };

    const cleanup = () => {
        if (speechRecognitionRef.current) {
            speechRecognitionRef.current.stop();
        }
        if (audioRecorderRef.current) {
            audioRecorderRef.current.cleanup();
        }
        if (ttsServiceRef.current) {
            ttsServiceRef.current.stop();
        }
    };

    // 處理語音識別結果
    const handleSpeechResult = (result) => {
        const { final, interim, confidence } = result;
        
        // 智能打斷邏輯：如果用戶開始說話且正在播放語音，則停止播放
        if ((final || interim) && isSpeaking) {
            console.log('檢測到用戶說話，打斷 AI 語音');
            stopSpeaking();
        }
        
        if (final) {
            setCurrentMessage(final);
            processUserMessage(final);
        } else if (interim) {
            setCurrentMessage(interim);
        }
    };

    // 處理語音錯誤
    const handleSpeechError = (error) => {
        console.error('語音識別錯誤:', error);
        setError(`語音識別錯誤: ${error}`);
        setIsListening(false);
    };

    // 處理音頻錯誤
    const handleAudioError = (error) => {
        console.error('音頻錄製錯誤:', error);
        setError(`音頻錄製錯誤: ${error}`);
    };

    // 處理用戶消息
    const processUserMessage = async (message) => {
        if (!message.trim()) return;

        setIsProcessing(true);
        
        try {
            // 添加用戶消息到對話歷史
            const userMessage = {
                type: 'user',
                content: message,
                timestamp: new Date().toISOString()
            };
            
            setConversationHistory(prev => [...prev, userMessage]);
            
            // 處理AI回應
            const response = await conversationManagerRef.current.processUserMessage(
                'user-001', // 臨時用戶ID
                message
            );
            
            // 添加AI回應到對話歷史
            const aiMessage = {
                type: 'ai',
                content: response.aiResponse,
                emotion: response.emotion,
                timestamp: new Date().toISOString(),
                confidence: response.confidence
            };
            
            setConversationHistory(prev => [...prev, aiMessage]);
            
            // 語音合成AI回應
            if (ttsServiceRef.current && response.aiResponse) {
                console.log('準備語音合成回應:', response.aiResponse);
                
                // 設置狀態為處理中（生成語音）
                setIsProcessing(true);
                
                try {
                    await ttsServiceRef.current.speak(response.aiResponse, {
                        language: 'zh-TW',
                        rate: 1.0, // API TTS 默認語速
                        pitch: 1.0
                    });
                    
                    setIsProcessing(false);
                    
                    // 語音播放完畢後，自動重新開啟監聽（連續對話）
                    // 這裡需要一個短暫延遲，避免採集到系統剛播完的尾音
                    setTimeout(() => {
                        if (!isListening && !isProcessing) {
                            console.log('連續對話：重新開啟監聽');
                            toggleListening(); 
                        }
                    }, 500);
                    
                } catch (ttsError) {
                    console.error('語音合成失敗:', ttsError);
                    setIsProcessing(false);
                    setError('語音播放失敗: ' + ttsError.message);
                }
            } else {
                console.warn('TTS服務未就緒或無回應內容');
                setIsProcessing(false);
            }
            
            // 更新統計信息
            updateConversationStats(response.conversationStats);
            
        } catch (error) {
            console.error('處理消息失敗:', error);
            setError('處理消息失敗，請重試');
        } finally {
            setIsProcessing(false);
            setCurrentMessage('');
        }
    };

    // 更新對話統計
    const updateConversationStats = (stats) => {
        setConversationStats({
            totalMessages: stats.totalMessages,
            sessionDuration: Date.now() - sessionStartTimeRef.current
        });
    };

    // 開始/停止語音識別
    const toggleListening = async () => {
        if (isListening) {
            // 停止語音識別
            speechRecognitionRef.current?.stop();
            audioRecorderRef.current?.stopRecording();
            setIsListening(false);
            setCurrentMessage('');
        } else {
            // 開始語音識別
            try {
                await audioRecorderRef.current?.init();
                speechRecognitionRef.current?.start();
                audioRecorderRef.current?.startRecording();
                setIsListening(true);
                setError(null);
            } catch (error) {
                console.error('開始語音識別失敗:', error);
                setError('無法開始語音識別，請檢查麥克風權限');
            }
        }
    };

    // 停止語音播放
    const stopSpeaking = () => {
        ttsServiceRef.current?.stop();
        setIsSpeaking(false);
    };

    // 清空對話歷史
    const clearHistory = () => {
        setConversationHistory([]);
        conversationManagerRef.current?.clearHistory();
        sessionStartTimeRef.current = Date.now();
        setConversationStats({ totalMessages: 0, sessionDuration: 0 });
    };

    // 格式化時間
    const formatDuration = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        } else {
            return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
        }
    };

    // 格式化統計時間
    const formatStatsTime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        return `${seconds}秒`;
    };

    // 模擬音量變化（用於動畫）
    useEffect(() => {
        if (viewState === 'listening' || viewState === 'speaking') {
            const simulateVolume = () => {
                // 產生 0.2 ~ 0.8 之間的隨機波動
                const vol = 0.2 + Math.random() * 0.6;
                setAudioVolume(vol);
                animationFrameRef.current = requestAnimationFrame(simulateVolume);
            };
            simulateVolume();
        } else {
            setAudioVolume(0);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [viewState]);

    return (
        <div className="voice-assistant">
            {/* 頭部 */}
            <header className="voice-header">
                <div className="header-content">
                    <div className="assistant-info">
                        <span className="assistant-name">豆包語音助手</span>
                    </div>
                    <div className="session-stats">
                        <span className="stats-messages">
                            💬 {conversationStats.totalMessages}
                        </span>
                        <span className="stats-duration">
                            ⏱️ {formatStatsTime(conversationStats.sessionDuration)}
                        </span>
                    </div>
                </div>
            </header>

            {/* 主要區域 - 沉浸式佈局 */}
            <main className="voice-main immersive-mode">
                
                {/* 核心視覺區域 */}
                <div className="visual-core">
                    <VoiceSphere state={viewState} volume={audioVolume} />
                </div>

                {/* 實時字幕/對話氣泡 */}
                <div className="live-captions">
                    {/* 顯示最近一條 AI 消息 */}
                    {conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].type === 'ai' && (
                        <div className="caption ai-caption">
                            {conversationHistory[conversationHistory.length - 1].content}
                        </div>
                    )}
                    
                    {/* 顯示當前用戶輸入 */}
                    {currentMessage && (
                        <div className="caption user-caption">
                            {currentMessage}
                        </div>
                    )}
                </div>

                {/* 錯誤顯示 */}
                {error && (
                    <div className="error-message">
                        <span className="error-icon">⚠️</span>
                        <span className="error-text">{error}</span>
                        <button 
                            className="error-close"
                            onClick={() => setError(null)}
                        >
                            ✕
                        </button>
                    </div>
                )}
            </main>

            {/* 控制面板 */}
            <footer className="voice-controls">
                <div className="controls-container">
                    {/* 主要控制按鈕 */}
                    <div className="main-controls">
                        <button 
                            className={`control-btn primary ${isListening ? 'active' : ''}`}
                            onClick={toggleListening}
                            disabled={isProcessing}
                        >
                            <div className={`btn-icon ${isListening ? 'listening' : ''}`}>
                                🎤
                            </div>
                            <span className="btn-text">
                                {isListening ? '點擊停止' : '點擊對話'}
                            </span>
                        </button>
                    </div>

                    {/* 次要控制 */}
                    <div className="secondary-controls">
                        <button 
                            className="control-btn small"
                            onClick={clearHistory}
                            disabled={conversationHistory.length === 0}
                        >
                            🗑️ 重置
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default VoiceAssistant;