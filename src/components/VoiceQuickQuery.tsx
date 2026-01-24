'use client'

import { useState, useRef, useEffect } from 'react'
import { IOSCard, IOSCardHeader, IOSCardTitle, IOSCardContent } from '@/components/ui/ios-card'
import { IOSButton } from '@/components/ui/ios-button'
import { Mic, Sparkles, StopCircle, Waves } from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface VoiceQuickQueryProps {
  onResult?: (query: string, result: any) => void
}

export function VoiceQuickQuery({ onResult }: VoiceQuickQueryProps) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [audioLevel, setAudioLevel] = useState(0) // 音量等級（0-100）
  const [isUsingProfessionalASR, setIsUsingProfessionalASR] = useState(false) // 是否使用專業 ASR

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // 檢查是否可以使用專業 ASR（Deepgram）
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

  // 音量檢測
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
        if (!analyserRef.current || !listening) {
          return
        }
        
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

  // 使用專業 ASR（Deepgram）錄製和處理
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
      setResponse(`❌ 無法訪問麥克風：${error.message}`)
      stopRecording()
    }
  }

  // 使用專業 ASR 處理音頻
  const processAudioWithProfessionalASR = async (audioBlob: Blob) => {
    setProcessing(true)
    triggerHaptic('light')
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      // 不需要 conversationHistory，让服务端使用默认

      const response = await fetch('/api/voice/chat', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!data.transcript || data.transcript.trim().length === 0) {
        setResponse('❌ 無法識別語音內容，請重試')
        setProcessing(false)
        return
      }

      setTranscript(data.transcript)

      // 显示 AI 回應
      if (data.response) {
        setResponse(data.response)
      }

      // 如果有數據結果，傳回給父組件
      if (onResult) {
        onResult(data.transcript, data)
      }
    } catch (error: any) {
      console.error('[Voice] 語音處理錯誤:', error)
      setResponse(`❌ 語音處理失敗：${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  // 使用瀏覽器原生語音識別（降級方案）
  const startBrowserRecognition = () => {
    // 檢查瀏覽器是否支援語音識別
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setListening(false)
      setResponse('❌ 您的瀏覽器不支援語音輸入功能')
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
      
      // 實時顯示識別結果
      if (interimTranscript) {
        setTranscript(interimTranscript)
      }
      
      // 如果是最終結果，處理查詢
      if (finalTranscript) {
        setTranscript(finalTranscript)
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
        case 'network':
          errorMsg = '❌ 網路錯誤，請檢查連接'
          break
      }
      setResponse(errorMsg)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()

    // 15 秒後自動停止
    setTimeout(() => {
      if (listening && recognitionRef.current) {
        recognitionRef.current.stop()
        setListening(false)
      }
    }, 15000)
  }

  const startListening = async () => {
    triggerHaptic('light')
    setListening(true)
    setTranscript('')
    setResponse('')
    setAudioLevel(0)

    // 優先使用專業 ASR（如果可用）
    if (isUsingProfessionalASR) {
      await startProfessionalRecording()
    } else {
      // 降級到瀏覽器原生 API
      startBrowserRecognition()
    }
  }

  const stopListening = () => {
    triggerHaptic('medium')
    
    // 停止專業錄製
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    // 停止瀏覽器識別
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    
    stopRecording()
  }

  const stopRecording = () => {
    setListening(false)
    stopAudioLevelMonitoring()
    
    // 停止所有音頻軌道
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    mediaRecorderRef.current = null
    audioChunksRef.current = []
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
    }
  }, [])

  const handleQuery = async (query: string) => {
    setProcessing(true)
    triggerHaptic('light')

    try {
      // 確保 query 是純字符串
      const safeQuery = typeof query === 'string' ? query.trim() : String(query || '').trim()
      
      if (safeQuery.length === 0) {
        setResponse('❌ 請輸入有效的查詢內容')
        setProcessing(false)
        return
      }
      
      // 構建安全的請求體
      const requestBody = {
        message: safeQuery,
        conversationHistory: [], // 語音查詢不使用歷史記錄
        stream: false,
      }
      
      // 驗證請求體可序列化
      let requestBodyString: string
      try {
        requestBodyString = JSON.stringify(requestBody)
      } catch (serializeError) {
        console.error('[VoiceQuickQuery] 請求體序列化失敗:', serializeError)
        setResponse('❌ 請求格式錯誤')
        setProcessing(false)
        return
      }
      
      // 調用 AI 助手處理查詢
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBodyString,
      })

      if (response.ok) {
        const data = await response.json()
        setResponse(data.content || '處理完成')

        // 如果有數據結果，傳回給父組件
        if (data.action && onResult) {
          onResult(query, data.action)
        }
      } else {
        setResponse('❌ 查詢失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Query error:', error)
      setResponse('❌ 查詢失敗，請稍後再試')
    } finally {
      setProcessing(false)
    }
  }

  const quickQueries = [
    { label: '今日營收', query: '今天賺了多少' },
    { label: '庫存查詢', query: '20kg 瓦斯還有多少' },
    { label: '待配送', query: '還有多少訂單沒送' },
    { label: '本月統計', query: '這個月生意怎麼樣' },
  ]

  return (
    <IOSCard>
      <IOSCardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-500" />
          <IOSCardTitle>語音助手</IOSCardTitle>
        </div>
      </IOSCardHeader>
      <IOSCardContent className="space-y-4">
        {/* 語音輸入按鈕 */}
        <div className="flex flex-col items-center gap-3">
          <IOSButton
            size="lg"
            onClick={listening ? stopListening : startListening}
            className={`gap-3 relative ${
              listening
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
            }`}
          >
            {listening ? (
              <>
                <StopCircle className="h-6 w-6" />
                停止聆聽
              </>
            ) : (
              <>
                <Mic className="h-6 w-6" />
                點擊說話
              </>
            )}
          </IOSButton>
          
          {/* 音量指示器 */}
          {listening && (
            <div className="w-full max-w-xs">
              <div className="flex items-center gap-2 mb-1">
                <Waves className="h-4 w-4 text-purple-500" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{Math.round(audioLevel)}%</span>
              </div>
              <p className="text-xs text-center text-gray-500">
                {isUsingProfessionalASR ? '🎯 使用專業語音識別' : '🌐 使用瀏覽器語音識別'}
              </p>
            </div>
          )}
        </div>

        {/* 識別結果 */}
        {transcript && (
          <div className="rounded-xl bg-blue-50 p-4 border-2 border-blue-200 animate-in fade-in slide-in-from-top-2">
            <p className="text-easy-caption text-blue-600 font-semibold mb-1">🎤 您說：</p>
            <p className="text-easy-body text-gray-900">{transcript}</p>
            {processing && (
              <p className="text-easy-caption text-blue-500 mt-2 animate-pulse">⏳ 正在處理中...</p>
            )}
          </div>
        )}

        {/* 處理中 */}
        {processing && !transcript && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-easy-body text-gray-600 mt-2">🤔 正在處理語音...</p>
          </div>
        )}

        {/* AI 回應 */}
        {response && !processing && (
          <div className="rounded-xl bg-green-50 p-4 border-2 border-green-200">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-easy-caption text-green-600 font-semibold mb-1">🤖 助手回復：</p>
                <p className="text-easy-body text-gray-900 whitespace-pre-wrap">{response}</p>
              </div>
            </div>
          </div>
        )}

        {/* 快速查詢按鈕 */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-easy-subheading font-bold text-gray-900 mb-3">🔥 熱門問題</p>
          <div className="grid grid-cols-2 gap-2">
            {quickQueries.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  triggerHaptic('light')
                  setTranscript(item.query)
                  handleQuery(item.query)
                }}
                className="rounded-lg border-2 border-gray-200 bg-gray-50 p-3 text-center transition-all hover:border-purple-300 hover:bg-purple-50 active:scale-95"
              >
                <p className="text-easy-body font-semibold text-gray-900">{item.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 使用提示 */}
        <div className="rounded-lg bg-yellow-50 p-3 border border-yellow-200">
          <p className="text-easy-caption text-gray-700">
            💡 <strong>提示：</strong>可以詢問「今天賺了多少」、「庫存還有沒有」、「還有多少訂單沒送」等問題
          </p>
        </div>
      </IOSCardContent>
    </IOSCard>
  )
}
