'use client'

import { useState, useRef, useEffect } from 'react'
import { IOSButton } from '@/components/ui/ios-button'
import { Mic, Sparkles, X, MessageCircle, Volume2, StopCircle } from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ImmersiveVoiceAssistantProps {
  onClose?: () => void
}

export function ImmersiveVoiceAssistant({ onClose }: ImmersiveVoiceAssistantProps) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  const [isUsingProfessionalASR, setIsUsingProfessionalASR] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自動滾動到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 檢查專業 ASR
  useEffect(() => {
    const checkProfessionalASR = async () => {
      try {
        const res = await fetch('/api/voice/chat')
        const data = await res.json()
        setIsUsingProfessionalASR(data?.services?.deepgram?.available === true)
      } catch {
        setIsUsingProfessionalASR(false)
      }
    }
    checkProfessionalASR()
  }, [])

  // 音量監測
  const startAudioLevelMonitoring = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      microphone.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateLevel = () => {
        if (!analyserRef.current || !listening) return

        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(Math.min(100, (average / 255) * 100))

        if (listening) {
          animationFrameRef.current = requestAnimationFrame(updateLevel)
        }
      }

      updateLevel()
    } catch (error) {
      console.warn('[Voice] Audio level monitoring failed:', error)
    }
  }

  const stopAudioLevelMonitoring = () => {
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
  }

  // 專業 ASR 錄音
  const startProfessionalRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      })

      streamRef.current = stream
      startAudioLevelMonitoring(stream)

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await processAudioWithProfessionalASR(audioBlob)
        stopRecording()
      }

      mediaRecorder.start()
    } catch (error: any) {
      console.error('[Voice] Professional recording failed:', error)
      setListening(false)
      addMessage('assistant', `❌ 無法訪問麥克風：${error.message}`)
      stopRecording()
    }
  }

  const processAudioWithProfessionalASR = async (audioBlob: Blob) => {
    setProcessing(true)
    triggerHaptic('light')

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('/api/voice/chat', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.transcript || data.transcript.trim().length === 0) {
        addMessage('assistant', '❌ 無法識別語音內容，請重試')
        setProcessing(false)
        return
      }

      // 顯示用戶消息
      addMessage('user', data.transcript)

      // 顯示 AI 回應
      if (data.response) {
        addMessage('assistant', data.response)

        // 不自動播放語音，避免機械朗讀感
        // if (data.audio && data.audio.data) {
        //   playTTSAudio(data.audio.data, data.audio.mime || 'audio/mpeg')
        // } else {
        //   speakText(data.response)
        // }
      }
    } catch (error: any) {
      console.error('[Voice] 語音處理錯誤:', error)
      addMessage('assistant', `❌ 語音處理失敗：${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const playTTSAudio = (base64Audio: string, mimeType: string) => {
    try {
      const audio = new Audio(`data:${mimeType};base64,${base64Audio}`)
      setSpeaking(true)

      audio.onended = () => {
        setSpeaking(false)
      }

      audio.onerror = () => {
        setSpeaking(false)
      }

      audio.play().catch(err => {
        console.warn('[Voice] TTS playback failed:', err)
        setSpeaking(false)
      })
    } catch (error) {
      console.warn('[Voice] TTS audio decode failed:', error)
      setSpeaking(false)
    }
  }

  // 瀏覽器原生語音識別（降級）
  const startBrowserRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setListening(false)
      addMessage('assistant', '❌ 您的瀏覽器不支援語音輸入功能')
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = 'zh-TW'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (interimTranscript) {
        setInterimTranscript(interimTranscript)
      }

      if (finalTranscript) {
        setTranscript(finalTranscript)
        setInterimTranscript('')
        handleQuery(finalTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setListening(false)

      let errorMsg = '❌ 語音識別失敗'
      switch (event.error) {
        case 'no-speech':
          errorMsg = '❌ 沒有檢測到語音，請重試'
          break
        case 'audio-capture':
          errorMsg = '❌ 無法訪問麥克風，請檢查權限'
          break
        case 'not-allowed':
          errorMsg = '❌ 麥克風權限被拒絕，請允許訪問'
          break
      }
      addMessage('assistant', errorMsg)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()

    setTimeout(() => {
      if (listening && recognitionRef.current) {
        recognitionRef.current.stop()
        setListening(false)
      }
    }, 15000)
  }

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  // 文字轉語音（使用瀏覽器內置 TTS）
  const speakText = (text: string) => {
    if (!text || typeof text !== 'string') return

    // 停止之前的語音
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()

      // 等待一下再播放新的語音
      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text)

          // 設置語音參數 - 更自然的對話風格
          utterance.lang = 'zh-TW' // 繁體中文
          utterance.rate = 1.0 // 正常語速
          utterance.pitch = 1.0 // 正常音調
          utterance.volume = 1.0 // 最大音量

          // 嘗試選擇最好的語音
          const voices = speechSynthesis.getVoices()
          console.log('[Voice] 可用語音數量:', voices.length)

          // 優先選擇自然的語音
          const taiwanVoice = voices.find(v =>
            v.lang.includes('zh-TW') &&
            (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Neural'))
          ) || voices.find(v =>
            v.lang.includes('zh-TW') || v.lang.includes('zh-Hant')
          ) || voices.find(v =>
            v.lang.includes('zh')
          ) || voices.find(v =>
            v.name.includes('Chinese') || v.name.includes('Taiwan')
          )

          if (taiwanVoice) {
            utterance.voice = taiwanVoice
            console.log('[Voice] 使用語音:', taiwanVoice.name, taiwanVoice.lang)
          } else {
            console.log('[Voice] 使用預設語音')
          }

          // 標點處理 - 讓語音更自然
          // 在中文中，句子結尾稍微停頓會更自然
          const sentences = text.split(/[。！？.!?]/)
          if (sentences.length > 1 && sentences[sentences.length - 1].trim() === '') {
            // 如果有標點符號，自然分割即可
            // 不需要特別處理，瀏覽器會自動處理
          }

          // 事件監聽
          utterance.onstart = () => {
            setSpeaking(true)
            console.log('[Voice] ▶️ 開始播放')
          }

          utterance.onend = () => {
            setSpeaking(false)
            console.log('[Voice] ✅ 播放結束')
          }

          utterance.onerror = (event) => {
            console.error('[Voice] ❌ TTS 錯誤:', event)
            setSpeaking(false)
          }

          // 播放語音
          speechSynthesis.speak(utterance)
        } catch (error) {
          console.error('[Voice] TTS 播放失敗:', error)
          setSpeaking(false)
        }
      }, 100)
    }
  }

  const handleQuery = async (query: string) => {
    setProcessing(true)
    triggerHaptic('light')

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          stream: false,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const aiResponse = data.content || '處理完成'

        addMessage('assistant', aiResponse)

        // 不自動播放語音，讓用戶選擇是否播放
        // speakText(aiResponse)
      } else {
        const errorMsg = '❌ 查詢失敗，請稍後再試'
        addMessage('assistant', errorMsg)
      }
    } catch (error) {
      console.error('Query error:', error)
      addMessage('assistant', '❌ 查詢失敗，請稍後再試')
    } finally {
      setProcessing(false)
    }
  }

  const startListening = async () => {
    triggerHaptic('light')
    setListening(true)
    setTranscript('')
    setInterimTranscript('')

    if (isUsingProfessionalASR) {
      await startProfessionalRecording()
    } else {
      startBrowserRecognition()
    }
  }

  const stopListening = () => {
    triggerHaptic('medium')

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    stopRecording()
  }

  const stopRecording = () => {
    setListening(false)
    stopAudioLevelMonitoring()

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    mediaRecorderRef.current = null
    audioChunksRef.current = []
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    setSpeaking(false)
    triggerHaptic('light')
  }

  // 清理資源
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      stopAudioLevelMonitoring()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* 關閉按鈕 */}
      <button
        onClick={() => {
          triggerHaptic('medium')
          onClose?.()
        }}
        className="absolute top-6 right-6 p-3 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* 標題 */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <div className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">AI 語音助手</h1>
          <p className="text-sm text-white/60">隨時準備為您服務</p>
        </div>
      </div>

      {/* 對話歷史 */}
      {messages.length > 0 && (
        <div className="absolute inset-x-0 top-24 bottom-48 overflow-y-auto px-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-white/10 backdrop-blur-sm text-white'
                }`}
              >
                <p className="text-base whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-60 mt-1">
                  {message.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 實時識別文字 */}
      {(transcript || interimTranscript) && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg px-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <p className="text-center text-white text-xl font-medium">
              {transcript || interimTranscript}
            </p>
            {processing && (
              <div className="flex justify-center mt-4 gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 中央語音按鈕 */}
      <div className="relative flex flex-col items-center">
        {/* 波紋動畫 */}
        {listening && (
          <>
            <div className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping" style={{ animationDuration: '1s' }} />
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
          </>
        )}

        {/* 音量波形 */}
        {listening && (
          <div className="absolute -inset-8">
            {Array.from({ length: 8 }).map((_, i) => {
              const size = 80 + audioLevel * 0.8 + Math.sin(Date.now() / 100 + i) * 10
              return (
                <div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-purple-400/30"
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    animation: `ripple 1.5s ease-out ${i * 0.15}s infinite`,
                  }}
                />
              )
            })}
          </div>
        )}

        {/* 主按鈕 */}
        <button
          onClick={listening ? stopListening : startListening}
          disabled={processing || speaking}
          className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
            listening
              ? 'bg-gradient-to-r from-red-500 to-orange-500 shadow-lg shadow-red-500/50 scale-110'
              : 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/50 hover:scale-105 active:scale-95'
          } ${processing || speaking ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {listening ? (
            <>
              <StopCircle className="h-16 w-16 text-white" />
              <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-pulse" />
            </>
          ) : processing ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : speaking ? (
            <Volume2 className="h-16 w-16 text-white animate-pulse" />
          ) : (
            <Mic className="h-16 w-16 text-white" />
          )}
        </button>

        {/* 狀態文字 */}
        <div className="mt-8 text-center">
          <p className="text-white text-lg font-medium">
            {listening ? '正在聆聽...' : processing ? '正在思考...' : speaking ? '正在說話...' : '點擊開始說話'}
          </p>
          {listening && isUsingProfessionalASR && (
            <p className="text-white/60 text-sm mt-2">🎯 專業語音識別</p>
          )}
        </div>

        {/* 停止說話按鈕 */}
        {speaking && (
          <button
            onClick={stopSpeaking}
            className="mt-4 px-6 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all flex items-center gap-2"
          >
            <StopCircle className="h-4 w-4" />
            停止播放
          </button>
        )}
      </div>

      {/* 提示文字 */}
      {messages.length === 0 && !listening && !processing && (
        <div className="absolute bottom-32 text-center">
          <p className="text-white/60 text-sm">您可以說：</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {['今天賺了多少', '庫存還有沒有', '還有多少訂單沒送'].map((query) => (
              <button
                key={query}
                onClick={() => {
                  triggerHaptic('light')
                  setTranscript(query)
                  handleQuery(query)
                }}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm hover:bg-white/20 transition-all"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
