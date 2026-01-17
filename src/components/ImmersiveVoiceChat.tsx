'use client'

/**
 * 沉浸式全屏語音對話組件（服務端版）
 * 所有語音處理在 Docker 中完成：
 * - Deepgram ASR（語音轉文字）
 * - GLM AI（生成回應）
 * - ElevenLabs/Azure TTS（文字轉語音）
 *
 * 核心特性：
 * - 全屏沉浸式 UI
 * - 麥克風錄音上傳
 * - 服務端專業音頻返回
 * - 自動循環對話
 * - 音頻波形可視化
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Mic, Sparkles, Volume2 } from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

// ========================================
// 類型定義
// ========================================

type ChatState = 'idle' | 'recording' | 'processing' | 'playing' | 'error'

interface VoiceMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
  audioUrl?: string  // TTS 音頻 URL
}

// ========================================
// 組件
// ========================================

interface ImmersiveVoiceChatProps {
  onClose?: () => void
  initialMessage?: string
}

export function ImmersiveVoiceChat({ onClose, initialMessage }: ImmersiveVoiceChatProps) {
  // 狀態
  const [chatState, setChatState] = useState<ChatState>('idle')
  const [messages, setMessages] = useState<VoiceMessage[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [currentResponse, setCurrentResponse] = useState('')
  const [audioLevel, setAudioLevel] = useState(0)
  const [servicesReady, setServicesReady] = useState(false)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const currentSessionRef = useRef<number>(0) // 用於中斷當前會話

  // 音頻波形數據
  const [waveformData, setWaveformData] = useState<number[]>([])

  // ========================================
  // 音頻波形可視化
  // ========================================

  const startWaveformVisualization = useCallback((stream: MediaStream) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateWaveform = () => {
        if (!analyserRef.current || chatState !== 'recording') {
          return
        }

        analyserRef.current.getByteFrequencyData(dataArray)

        // 計算音量等級
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAudioLevel(Math.min(100, (average / 128) * 100))

        // 設置波形數據
        setWaveformData(Array.from(dataArray))

        if (chatState === 'recording') {
          animationFrameRef.current = requestAnimationFrame(updateWaveform)
        }
      }

      updateWaveform()
    } catch (error) {
      console.warn('[Waveform] Visualization failed:', error)
    }
  }, [chatState])

  const stopWaveformVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
    setWaveformData([])
  }, [])

  // ========================================
  // 錄音處理
  // ========================================

  const startRecording = useCallback(async () => {
    try {
      console.log('[Recording] 請求麥克風...')

      // 檢查瀏覽器支援
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('瀏覽器不支援麥克風功能')
      }

      // 列出可用的音頻設備
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audioInputs = devices.filter(d => d.kind === 'audioinput')
      console.log('[Recording] 可用麥克風:', audioInputs.map(d => d.label || d.deviceId))

      if (audioInputs.length === 0) {
        throw new Error('沒有檢測到麥克風設備')
      }

      // 請求麥克風
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        }
      })

      console.log('[Recording] 麥克風已獲取:', stream.getAudioTracks().map(t => ({
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
      })))

      streamRef.current = stream
      startWaveformVisualization(stream)

      // 創建錄音器
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        console.log('[Recording] 不支援 opus，使用 audio/webm')
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'
        console.log('[Recording] 不支援 webm，使用 audio/mp4')
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        console.log('[Recording] 收到音頻數據:', {
          size: event.data.size,
          type: event.data.type,
        })
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        console.log('[Recording] 錄音已停止，處理音頻...')
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        console.log('[Recording] 音頻 Blob:', {
          size: audioBlob.size,
          type: audioBlob.type,
        })
        await processAudio(audioBlob)
      }

      mediaRecorder.start(100) // 每 100ms 觸發一次 ondataavailable
      setChatState('recording')
      triggerHaptic('medium')

      console.log('[Recording] 錄音已開始')

      // 10 秒後自動停止
      setTimeout(() => {
        if (chatState === 'recording') {
          console.log('[Recording] 達到最大時長，自動停止')
          stopRecording()
        }
      }, 10000)

    } catch (error: any) {
      console.error('[Recording] Failed:', error)

      let errorMsg = '無法訪問麥克風'
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = '麥克風權限被拒絕，請在瀏覽器設置中允許麥克風權限'
      } else if (error.name === 'NotFoundError') {
        errorMsg = '沒有檢測到麥克風設備，請確認已連接麥克風'
      } else if (error.name === 'NotReadableError') {
        errorMsg = '麥克風被其他應用佔用，請關閉其他應用後重試'
      } else {
        errorMsg = `麥克風錯誤：${error.message}`
      }

      setChatState('error')
      setCurrentTranscript(`❌ ${errorMsg}`)
    }
  }, [startWaveformVisualization, chatState])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopWaveformVisualization()
    triggerHaptic('light')
  }, [stopWaveformVisualization])

  // ========================================
  // 瀏覽器 TTS 播放（降級方案）
  // ========================================

  const playBrowserTTS = useCallback(async (text: string): Promise<void> => {
    if (!('speechSynthesis' in window)) {
      console.warn('[Browser TTS] 瀏覽器不支援語音合成')
      return
    }

    console.log('[Browser TTS] 開始播放:', text.substring(0, 50))

    return new Promise<void>((resolve, reject) => {
      // 停止當前播放
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      // 設置語音參數
      utterance.lang = 'zh-TW'
      utterance.rate = 1.1
      utterance.pitch = 1.05
      utterance.volume = 1.0

      // 獲取最佳語音
      const voices = window.speechSynthesis.getVoices()
      const chineseVoice = voices.find(v =>
        v.lang.includes('zh') && (v.name.includes('Female') || v.name.includes('Neural') || v.name.includes('Google'))
      ) || voices.find(v => v.lang.includes('zh'))

      if (chineseVoice) {
        utterance.voice = chineseVoice
        console.log('[Browser TTS] 使用語音:', chineseVoice.name)
      }

      utterance.onstart = () => {
        console.log('[Browser TTS] 開始說話')
        setChatState('playing')
      }

      utterance.onend = () => {
        console.log('[Browser TTS] 播放完成')
        setChatState('idle')
        resolve()
      }

      utterance.onerror = (e) => {
        console.error('[Browser TTS] 播放錯誤:', e)
        setChatState('idle')
        reject(e)
      }

      window.speechSynthesis.speak(utterance)
    })
  }, [])

  // ========================================
  // TTS 音頻播放
  // ========================================

  const playTTSAudio = useCallback(async (base64Audio: string, mimeType: string): Promise<void> => {
    console.log('[TTS] 開始播放音頻:', {
      mimeType,
      dataLength: base64Audio?.length,
      previewSize: base64Audio?.substring(0, 50),
    })

    return new Promise((resolve, reject) => {
      try {
        // 停止當前播放
        if (currentAudioRef.current) {
          currentAudioRef.current.pause()
          currentAudioRef.current = null
        }

        // 創建音頻元素
        const audioSrc = `data:${mimeType};base64,${base64Audio}`
        console.log('[TTS] 音頻 URL 長度:', audioSrc.length)

        const audio = new Audio(audioSrc)
        currentAudioRef.current = audio

        // 設置音量
        audio.volume = 1.0

        setChatState('playing')
        console.log('[TTS] 開始播放...')

        // 添加加載監聽
        audio.onloadedmetadata = () => {
          console.log('[TTS] 音頻元數據加載完成:', {
            duration: audio.duration,
          })
        }

        audio.oncanplay = () => {
          console.log('[TTS] 音頻可以播放')
        }

        audio.onended = () => {
          console.log('[TTS] 播放完成')
          setChatState('idle')
          resolve()
        }

        audio.onerror = (e) => {
          console.error('[TTS] 播放錯誤:', {
            error: audio.error,
            code: audio.error?.code,
            message: audio.error?.message,
          })
          setChatState('idle')
          reject(new Error(`音頻播放失敗: ${audio.error?.message || '未知錯誤'}`))
        }

        // 嘗試播放
        const playPromise = audio.play()

        if (playPromise) {
          playPromise
            .then(() => {
              console.log('[TTS] 播放成功啟動')
            })
            .catch((err) => {
              console.error('[TTS] play() 被拒絕:', err)
              // 瀏覽器可能阻止了自動播放，需要用戶交互
              setChatState('idle')
              reject(new Error('瀏覽器阻止了自動播放，請點擊播放按鈕'))
            })
        }

      } catch (error) {
        console.error('[TTS] 創建音頻失敗:', error)
        reject(error)
      }
    })
  }, [])

  // ========================================
  // 處理音頻（服務端流式處理）
  // ========================================

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setChatState('processing')
    setCurrentTranscript('🎤 正在識別...')
    setCurrentResponse('')
    triggerHaptic('light')

    // 標記當前會話 ID（用於中斷檢測）
    const sessionId = Date.now()
    currentSessionRef.current = sessionId

    try {
      // 準備表單數據
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('conversationHistory', JSON.stringify(
        messages.map(m => ({ role: m.role, content: m.text }))
      ))

      console.log('[Voice] 發送到服務端（流式）...')

      // 使用流式 API
      const response = await fetch('/api/voice/stream', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      // 處理 SSE 流
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('無法讀取響應流')
      }

      let userText = ''
      let assistantText = ''
      let audioChunks: string[] = []
      let audioMimeType = 'audio/mpeg'
      let buffer = ''
      let ttsStarted = false
      let lastSentence = ''

      while (true) {
        // 檢查是否被中斷
        if (currentSessionRef.current !== sessionId) {
          console.log('[Voice] 會話已中斷')
          break
        }

        const { done, value } = await reader.read()

        if (done) break

        // 解碼並處理數據
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留不完整的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6))

              switch (event.type) {
                case 'transcript':
                  // 語音識別完成
                  userText = event.data
                  setCurrentTranscript(userText)

                  // 添加用戶訊息
                  const userMessage: VoiceMessage = {
                    id: Date.now().toString(),
                    role: 'user',
                    text: userText,
                    timestamp: Date.now(),
                  }
                  setMessages(prev => [...prev, userMessage])
                  break

                case 'text':
                  // AI 流式文本 - 即時播放！
                  if (!event.data.includes('🎤') && !event.data.includes('🤔') && !event.data.includes('🔊')) {
                    lastSentence += event.data
                    assistantText += event.data
                    setCurrentResponse(assistantText)

                    // 檢查是否完成一句話（遇到句號、問號、嘆號）
                    if ((event.data.includes('。') || event.data.includes('？') || event.data.includes('！') || event.data.includes('\n')) && !ttsStarted) {
                      ttsStarted = true
                      // 立即開始瀏覽器 TTS（不等全部生成完）
                      console.log('[Voice] 立即播放句子:', lastSentence)
                      setChatState('playing')
                      playBrowserTTS(lastSentence).then(() => {
                        setChatState('idle')
                      }).catch(() => {
                        setChatState('idle')
                      })
                    }
                  }
                  break

                case 'audio':
                  // 音頻數據塊（後台下載，不立即播放）
                  audioChunks.push(event.data)
                  audioMimeType = event.mimeType
                  break

                case 'error':
                  throw new Error(event.data)
              }
            } catch (e) {
              console.warn('[Voice] SSE 解析錯誤:', e)
            }
          }
        }
      }

      // 如果還沒開始 TTS（沒有標點符號），現在播放完整文字
      if (!ttsStarted && assistantText && currentSessionRef.current === sessionId) {
        await playBrowserTTS(assistantText)
      }

      // 添加 AI 訊息
      if (currentSessionRef.current === sessionId) {
        const assistantMessage: VoiceMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: assistantText,
          timestamp: Date.now(),
          audioUrl: audioChunks.length > 0 ? `data:${audioMimeType};base64,${audioChunks.join('')}` : undefined,
        }
        setMessages(prev => [...prev, assistantMessage])

        // 自動重新開始錄音（循環對話）
        setTimeout(() => {
          if (currentSessionRef.current === sessionId) {
            setChatState('idle')
            setCurrentTranscript('')
            setCurrentResponse('')
          }
        }, 1000)
      }

    } catch (error: any) {
      if (currentSessionRef.current === sessionId) {
        console.error('[Voice] 處理失敗:', error)
        setChatState('error')
        setCurrentTranscript(`❌ 處理失敗：${error.message}`)
      }
    } finally {
      // 清理音頻軌道
      if (streamRef.current && currentSessionRef.current === sessionId) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [messages, startWaveformVisualization, stopWaveformVisualization, playBrowserTTS, playTTSAudio])

  // ========================================
  // 控制函數
  // ========================================

  const toggleRecording = useCallback(() => {
    // 停止當前播放
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    // 如果正在處理或播放，中斷並重新開始錄音
    if (chatState === 'processing' || chatState === 'playing') {
      console.log('[Voice] 用戶中斷')
      // 改變 session ID 以中斷當前流
      currentSessionRef.current = Date.now()
      // 停止錄音
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      // 立即開始新的錄音
      setChatState('idle')
      setTimeout(() => startRecording(), 100)
      return
    }

    if (chatState === 'recording') {
      stopRecording()
    } else if (chatState === 'idle' || chatState === 'error') {
      startRecording()
    }
  }, [chatState, startRecording, stopRecording])

  // ========================================
  // 初始化
  // ========================================

  useEffect(() => {
    // 檢查服務狀態
    const checkServices = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImmersiveVoiceChat.tsx:588',message:'檢查語音服務狀態',data:{url:'/api/voice/chat'},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      try {
        const res = await fetch('/api/voice/chat')
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImmersiveVoiceChat.tsx:591',message:'語音服務響應',data:{status:res.status,ok:res.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        const data = await res.json()
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImmersiveVoiceChat.tsx:592',message:'語音服務數據',data:{hasServices:!!data.services,deepgram:data.services?.deepgram,azure:data.services?.azure,elevenlabs:data.services?.elevenlabs},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        setServicesReady(data.services?.deepgram || false)
        console.log('[Voice] 服務狀態:', data.services)
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ImmersiveVoiceChat.tsx:595',message:'語音服務檢查失敗',data:{errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.warn('[Voice] 無法檢查服務狀態:', error)
      }
    }

    checkServices()

    // 發送初始歡迎訊息
    if (initialMessage) {
      const welcomeMsg: VoiceMessage = {
        id: 'welcome',
        role: 'assistant',
        text: initialMessage,
        timestamp: Date.now(),
      }
      setMessages([welcomeMsg])
    }

    return () => {
      // 清理
      stopWaveformVisualization()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
      }
      // 停止瀏覽器語音合成
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // ========================================
  // 渲染
  // ========================================

  const getStatusText = () => {
    switch (chatState) {
      case 'idle': return servicesReady ? '點擊麥克風開始' : '服務初始化中...'
      case 'recording': return '正在錄音...'
      case 'processing': return '正在處理...'
      case 'playing': return '正在播放...'
      case 'error': return '出錯了'
    }
  }

  const getStatusColor = () => {
    switch (chatState) {
      case 'idle': return 'bg-gray-400'
      case 'recording': return 'bg-red-500 animate-pulse'
      case 'processing': return 'bg-blue-500 animate-pulse'
      case 'playing': return 'bg-green-500 animate-pulse'
      case 'error': return 'bg-orange-500'
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-600 via-purple-700 to-indigo-800 z-50 flex flex-col">
      {/* 頂部關閉按鈕 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start safe-area-top">
        <button
          onClick={() => {
            triggerHaptic('light')
            // 停止所有語音
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel()
            }
            if (currentAudioRef.current) {
              currentAudioRef.current.pause()
            }
            onClose?.()
          }}
          className="w-12 h-12 rounded-full bg-black bg-opacity-30 flex items-center justify-center hover:bg-opacity-50 transition-all"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-white text-sm font-medium">{getStatusText()}</span>
        </div>

        <div className="w-12" /> {/* 佔位 */}
      </div>

      {/* 對話內容區域 */}
      <div className="flex-1 overflow-y-auto px-4 pt-20 pb-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-3xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-white bg-opacity-20 text-white rounded-br-sm'
                    : 'bg-white bg-opacity-10 text-white rounded-bl-sm'
                }`}
              >
                <div className="flex items-start gap-2">
                  <p className="text-lg leading-relaxed whitespace-pre-wrap">
                    {msg.text}
                  </p>
                  {msg.audioUrl && chatState !== 'playing' && (
                    <button
                      onClick={() => {
                        triggerHaptic('light')
                        const audio = new Audio(msg.audioUrl)
                        audio.play()
                      }}
                      className="flex-shrink-0 mt-1"
                    >
                      <Volume2 className="w-5 h-5 text-white" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-white text-opacity-60 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString('zh-TW', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* 當前識別文字 */}
          {currentTranscript && chatState === 'processing' && (
            <div className="flex justify-end">
              <div className="bg-white bg-opacity-20 text-white rounded-3xl rounded-br-sm px-5 py-3">
                <p className="text-lg leading-relaxed">{currentTranscript}</p>
              </div>
            </div>
          )}

          {/* 當前 AI 回應 */}
          {currentResponse && chatState === 'processing' && (
            <div className="flex justify-start">
              <div className="bg-white bg-opacity-10 text-white rounded-3xl rounded-bl-sm px-5 py-3">
                <p className="text-lg leading-relaxed">{currentResponse}</p>
                <p className="text-xs text-white text-opacity-60 mt-1 animate-pulse">
                  正在生成語音...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 底部控制區域 */}
      <div className="pb-12 pt-4 px-4 safe-area-bottom">
        {/* 音頻波形 */}
        {chatState === 'recording' && waveformData.length > 0 && (
          <div className="flex justify-center items-end gap-1 h-16 mb-4">
            {waveformData.map((value, i) => (
              <div
                key={i}
                className="w-1 bg-white bg-opacity-60 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, (value / 255) * 64)}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* 主控制按鈕 */}
        <div className="flex justify-center">
          <button
            onClick={toggleRecording}
            disabled={!servicesReady && chatState === 'idle'}
            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1 transition-all ${
              chatState === 'recording'
                ? 'bg-red-500 scale-110 shadow-lg shadow-red-500/50'
                : 'bg-white scale-100 shadow-xl'
            } ${!servicesReady && chatState === 'idle' ? 'opacity-50' : ''}`}
          >
            {chatState === 'recording' ? (
              <>
                <div className="w-4 h-4 rounded-full bg-white animate-ping absolute" />
                <Mic className="w-10 h-10 text-white relative z-10" />
              </>
            ) : (
              <Mic className={`w-10 h-10 ${chatState === 'idle' ? 'text-purple-600' : 'text-gray-400'}`} />
            )}
          </button>
        </div>

        {/* 提示文字 */}
        <p className="text-center text-white text-opacity-80 text-sm mt-4">
          {!servicesReady && chatState === 'idle' && '正在連接語音服務...'}
          {servicesReady && chatState === 'idle' && '點擊麥克風開始對話'}
          {chatState === 'recording' && '正在錄音...'}
          {(chatState === 'processing' || chatState === 'playing') && '點擊可中斷，立即說下一句'}
        </p>

        {/* 服務狀態提示 */}
        {!servicesReady && (
          <div className="mt-4 bg-yellow-500 bg-opacity-20 rounded-lg p-3 text-center">
            <p className="text-yellow-100 text-sm">
              ⚠️ 語音服務未就緒，請檢查 Docker 配置
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ========================================
// 觸發器按鈕（在其他頁面使用）
// ========================================

export function ImmersiveVoiceChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-xl flex items-center justify-center z-40 hover:scale-110 transition-transform"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </button>
      )}

      {isOpen && (
        <ImmersiveVoiceChat onClose={() => setIsOpen(false)} />
      )}
    </>
  )
}
