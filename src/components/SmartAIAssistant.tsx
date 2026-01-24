'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { IOSButton } from '@/components/ui/ios-button'
import { Input } from '@/components/ui/ios-input'
import { triggerHaptic } from '@/lib/ios-utils'
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

export function SmartAIAssistant() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    triggerHaptic('light')

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || data.content || '抱歉，我沒有理解您的問題。',
        timestamp: new Date(),
        action: data.action,
        isStreaming: false,
      }

      setMessages(prev => [...prev, assistantMessage])
      triggerHaptic('success')
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，AI 助手暫時無法回應。請稍後再試。',
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
              <h3 className="font-bold text-lg">BossJy-99 助手</h3>
              <p className="text-xs text-white/80 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                隨時為您服務
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              嗨！我是 BossJy-99 助手 🤖
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
            placeholder="輸入您的問題..."
            className="flex-1"
            disabled={isLoading}
          />
          <IOSButton
            onClick={() => {
              setIsListening(!isListening)
              triggerHaptic('light')
            }}
            className={`p-3 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-500 hover:bg-purple-600'}`}
            disabled={isLoading}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </IOSButton>
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
