'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { IOSButton } from '@/components/ui/ios-button'
import { Input } from '@/components/ui/ios-input'
import { triggerHaptic } from '@/lib/ios-utils'
import { getOllamaClient, OllamaMessage } from '@/lib/ollama-provider'
import { getNaturalTTS, NaturalTTS } from '@/lib/natural-tts'
import { VoiceInputButton } from '@/components/VoiceInputButton'
import {
  MessageCircle,
  X,
  Sparkles,
  Send,
  Mic,
  MicOff,
  ShoppingCart,
  Package,
  FileText,
  DollarSign,
  Brain,
  Zap,
  Loader2,
  Copy,
  Trash2,
  Bot,
  User,
  ChevronDown,
  Lightbulb,
  TrendingUp,
  Volume2,
  VolumeX,
  Settings,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: string
  isStreaming?: boolean
}

const QUICK_ACTIONS = [
  {
    icon: ShoppingCart,
    label: '訂瓦斯',
    prompt: '我要訂購瓦斯',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    icon: Package,
    label: '查庫存',
    prompt: '查詢目前庫存狀況',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    icon: FileText,
    label: '查訂單',
    prompt: '查詢最近的訂單',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: TrendingUp,
    label: '營收報告',
    prompt: '查詢今日營收和統計',
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50'
  },
]

const SUGGESTED_QUESTIONS = [
  '王小姐要訂 20桶瓦斯',
  '查詢目前的庫存',
  '今日營收多少？',
  '新增客戶：陳先生 0912345678',
]

export function VoiceAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true) // 語音輸出開關
  const [ollamaConnected, setOllamaConnected] = useState(false)
  const [ollamaModel, setOllamaModel] = useState('glm4') // 使用 GLM-4 模型
  const [showSettings, setShowSettings] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const ttsRef = useRef<NaturalTTS | null>(null)

  // 初始化 TTS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ttsRef.current = getNaturalTTS({
        provider: 'browser', // 使用瀏覽器原生 TTS（免費）
        douBaoStyle: true,   // 豆包風格
      })
    }
  }, [])

  // 測試 OLLAMA 連接
  useEffect(() => {
    const testOllama = async () => {
      try {
        const client = getOllamaClient()
        const connected = await client.testConnection()
        setOllamaConnected(connected)

        if (connected) {
          const models = await client.getModels()
          if (models.length > 0) {
            setOllamaModel(models[0].split(':')[0])
          }
        }
      } catch (e) {
        setOllamaConnected(false)
      }
    }
    testOllama()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 語音播放
  const speak = async (text: string) => {
    if (!voiceEnabled || !ttsRef.current) return

    try {
      await ttsRef.current.speak(text)
    } catch (e) {
      console.error('TTS error:', e)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = input
    setInput('')
    setIsLoading(true)
    triggerHaptic('light')

    try {
      // 構建對話歷史
      const conversationHistory: OllamaMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      // 添加系統提示
      const systemPrompt = `你是九九瓦斯行的 AI 助手，名字叫「小九」。

**你的特色：**
- 親切友善，像鄰居女孩一樣自然
- 說話簡潔明了，不囉嗦
- 會主動幫客戶處理問題
- 使用繁體中文

**說話風格：**
- 用「呢、喔、啦」等語氣詞，更自然
- 不說機械化的「好的」，說「好的呢」
- 不說「請」，說「麻煩」
- 加上表情符號，更親切

**你能做的事：**
1. 幫客戶訂購瓦斯
2. 查詢庫存和訂單
3. 回答瓦斯相關問題
4. 記錄客戶需求`

      const allMessages: OllamaMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userInput },
      ]

      // 使用 OLLAMA 生成回應
      const client = getOllamaClient()
      let aiResponse = ''

      // 串流回應
      await client.chat(allMessages, (chunk) => {
        aiResponse += chunk
        setMessages(prev => {
          const newMessages = [...prev]
          const lastMessage = newMessages[newMessages.length - 1]

          if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
            lastMessage.content = aiResponse
          } else {
            newMessages.push({
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiResponse,
              timestamp: new Date(),
              isStreaming: true,
            })
          }

          return newMessages
        })
      })

      // 完成回應
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse || '讓我幫您處理這個問題呢～',
        timestamp: new Date(),
        isStreaming: false,
      }

      setMessages(prev => {
        const newMessages = [...prev]
        // 移除串流中的消息
        const filtered = newMessages.filter(m => !m.isStreaming)
        return [...filtered, assistantMessage]
      })

      triggerHaptic('success')

      // 語音播放
      if (voiceEnabled) {
        await speak(assistantMessage.content)
      }
    } catch (error) {
      console.error('AI error:', error)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: ollamaConnected
          ? '抱歉，我遇到了一些問題。請再試一次喔～'
          : '抱歉，無法連接到本地 AI 服務。請確認 OLLAMA 正在運行～',
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, errorMessage])
      triggerHaptic('error')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleQuickAction = (prompt: string) => {
    setInput(prompt)
    triggerHaptic('light')
    setTimeout(() => handleSend(), 100)
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
    triggerHaptic('light')
  }

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content)
    triggerHaptic('light')
  }

  const handleClear = () => {
    setMessages([])
    triggerHaptic('medium')
  }

  const handleVoiceRecognized = (text: string) => {
    setInput(text)
    triggerHaptic('success')
    // 自動發送
    setTimeout(() => handleSend(), 500)
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => {
          setIsMinimized(false)
          triggerHaptic('light')
        }}
        className="fixed bottom-24 right-4 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all"
      >
        <Bot className="w-6 h-6" />
      </button>
    )
  }

  return (
    <Card className="fixed bottom-24 right-4 left-4 md:left-auto md:w-96 md:right-4 h-[70vh] z-50 shadow-2xl flex flex-col bg-white/95 backdrop-blur-xl border-2 border-purple-200 rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                小九
                {ollamaConnected && (
                  <span className="text-xs bg-green-400/30 px-2 py-0.5 rounded-full">本地</span>
                )}
              </h3>
              <p className="text-xs text-white/80 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {voiceEnabled ? '語音模式' : '文字模式'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setVoiceEnabled(!voiceEnabled)
                triggerHaptic('light')
              }}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title={voiceEnabled ? '關閉語音' : '開啟語音'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setShowSettings(!showSettings)
                triggerHaptic('light')
              }}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="設置"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                handleClear()
                triggerHaptic('light')
              }}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              title="清除對話"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsMinimized(true)
                triggerHaptic('medium')
              }}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* OLLAMA Status */}
        {!ollamaConnected && (
          <div className="mt-2 p-2 bg-red-500/20 rounded-lg text-xs">
            ⚠️ OLLAMA 未連接 - 請確認 OLLAMA 正在運行
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="text-sm font-semibold mb-2">OLLAMA 設置</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>模型: {ollamaModel || '未連接'}</div>
            <div>狀態: {ollamaConnected ? '✅ 已連接' : '❌ 未連接'}</div>
            <div className="text-gray-500 mt-2">
              安裝 GLM-4: <code className="bg-gray-200 px-1 rounded">ollama pull glm4</code>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              嗨！我是小九 🤖
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              我可以幫您管理瓦斯行的各項業務
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className={`p-3 rounded-xl ${action.bgColor} hover:scale-105 active:scale-95 transition-all`}
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg mx-auto mb-2 flex items-center justify-center`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{action.label}</div>
                </button>
              ))}
            </div>

            {/* Suggested Questions */}
            <div className="w-full text-left">
              <div className="flex items-center gap-2 mb-3 text-gray-700">
                <Lightbulb className="w-4 h-4" />
                <span className="text-sm font-semibold">試試問這些：</span>
              </div>
              <div className="space-y-2">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="w-full text-left p-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl text-sm text-gray-700 hover:text-gray-900 transition-all"
                  >
                    💬 {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex gap-3 max-w-[85%] ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString('zh-TW', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(message.content)}
                        className="opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 bg-gray-100 rounded-2xl">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="輸入您的問題... 或按 🎤 語音"
            className="flex-1"
            disabled={isLoading}
          />
          <VoiceInputButton
            onTextRecognized={handleVoiceRecognized}
            onError={(error) => console.error('Voice error:', error)}
            disabled={isLoading}
          />
          <IOSButton
            onClick={handleSend}
            className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-5 h-5" />
          </IOSButton>
        </div>
      </div>
    </Card>
  )
}
