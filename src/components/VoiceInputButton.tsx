'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Loader2 } from 'lucide-react'
import { triggerHaptic } from '@/lib/ios-utils'

interface VoiceInputButtonProps {
  onTextRecognized: (text: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
  language?: 'zh-TW' | 'zh-CN' | 'en-US'
}

/**
 * 語音輸入按鈕 - 使用 Web Speech API
 * 自動檢測語言：iOS Safari 使用 zh-CN，其他使用 zh-TW
 */
export function VoiceInputButton({
  onTextRecognized,
  onError,
  disabled = false,
  className = '',
  language: propLanguage,
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  // 自動檢測最佳語言
  const detectLanguage = (): 'zh-TW' | 'zh-CN' | 'en-US' => {
    if (propLanguage) return propLanguage

    // iOS Safari 使用 zh-CN（識別率較高）
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS) {
      return 'zh-CN'
    }

    // 其他瀏覽器使用 zh-TW
    return 'zh-TW'
  }

  // 初始化語音識別
  useEffect(() => {
    if (typeof window === 'undefined') return

    // 檢查瀏覽器支援
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      onError?.('您的瀏覽器不支援語音識別功能')
      return
    }

    const recognition = new SpeechRecognition()
    const language = detectLanguage()

    recognition.continuous = false // 單次識別
    recognition.interimResults = true // 顯示中間結果
    recognition.lang = language
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      console.log('🎤 語音識別已啟動 (語言:', language, ')')
      setIsListening(true)
      setInterimText('')
      triggerHaptic('light')
    }

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence

        if (event.results[i].isFinal) {
          finalTranscript += transcript
          console.log('✅ 識別完成:', transcript, `(信心: ${(confidence * 100).toFixed(0)}%)`)
        } else {
          interimTranscript += transcript
        }
      }

      // 顯示中間結果
      if (interimTranscript) {
        setInterimText(interimTranscript)
      }

      // 完成識別
      if (finalTranscript) {
        setInterimText('')
        setIsListening(false)
        triggerHaptic('success')
        onTextRecognized(finalTranscript)
      }
    }

    recognition.onerror = (event: any) => {
      console.error('🎤 語音識別錯誤:', event.error)

      let errorMessage = '語音識別失敗'

      switch (event.error) {
        case 'no-speech':
          errorMessage = '沒有檢測到語音，請再試一次'
          break
        case 'audio-capture':
          errorMessage = '無法訪問麥克風'
          break
        case 'not-allowed':
          errorMessage = '麥克風權限被拒絕，請在瀏覽器設置中允許麥克風訪問'
          break
        case 'network':
          errorMessage = '網絡錯誤，請檢查網絡連接'
          break
      }

      setIsListening(false)
      setInterimText('')
      triggerHaptic('error')
      onError?.(errorMessage)
    }

    recognition.onend = () => {
      if (isListening) {
        // 如果還在監聽狀態，自動重啟（處理自動停止的情況）
        try {
          recognition.start()
        } catch (e) {
          setIsListening(false)
        }
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [onTextRecognized, onError, propLanguage])

  const handleClick = () => {
    if (!isSupported) {
      onError?.('您的瀏覽器不支援語音識別功能')
      return
    }

    if (disabled) {
      return
    }

    triggerHaptic('light')

    if (isListening) {
      // 停止識別
      recognitionRef.current?.stop()
      setIsListening(false)
      setInterimText('')
    } else {
      // 開始識別
      try {
        recognitionRef.current?.start()
      } catch (e) {
        // 如果已經在運行，先停止再啟動
        recognitionRef.current?.stop()
        setTimeout(() => {
          try {
            recognitionRef.current?.start()
          } catch (e2) {
            onError?.('語音識別啟動失敗')
          }
        }, 100)
      }
    }
  }

  if (!isSupported) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          relative p-3 rounded-full transition-all duration-200
          ${isListening
            ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
            : 'bg-purple-500 hover:bg-purple-600 hover:scale-105'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        title={isListening ? '點擊停止錄音' : '點擊開始語音輸入'}
      >
        {isListening ? (
          <MicOff className="w-5 h-5 text-white" />
        ) : (
          <Mic className="w-5 h-5 text-white" />
        )}
      </button>

      {/* 聽覺視覺反饋 */}
      {isListening && (
        <div className="absolute -inset-1 bg-purple-400 rounded-full animate-ping opacity-75" />
      )}

      {/* 中間結果顯示 */}
      {interimText && (
        <div className="absolute bottom-full right-0 mb-2 p-3 bg-white rounded-xl shadow-2xl border-2 border-purple-200 min-w-[200px] max-w-[300px]">
          <div className="flex items-center gap-2 mb-1">
            <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
            <span className="text-xs text-gray-500">正在聆聽...</span>
          </div>
          <p className="text-sm text-gray-800">{interimText}</p>
        </div>
      )}
    </div>
  )
}

/**
 * 語音輸入 Hook - 便捷方式
 */
export function useVoiceInput() {
  const [text, setText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTextRecognized = (recognizedText: string) => {
    setText(recognizedText)
    setIsListening(false)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    setIsListening(false)
  }

  return {
    text,
    setText,
    isListening,
    error,
    handleTextRecognized,
    handleError,
  }
}
