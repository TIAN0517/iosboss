'use client'

import { useState, useRef, useEffect } from 'react'
import { IOSButton } from '@/components/ui/ios-button'

// ========================================
// 类型定义
// ========================================

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTyping?: boolean
}

interface ChatProps {
  title?: string
  placeholder?: string
  initialMessage?: string
  onSendMessage?: (message: string) => Promise<string>
}

// ========================================
// 专业聊天界面组件
// ========================================

export function ProfessionalChat({
  title = '🤖 AI 助手',
  placeholder = '請輸入您的問題...',
  initialMessage = '您好！我是九九瓦斯行的 AI 助手，有什麼可以幫您的嗎？',
  onSendMessage,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: initialMessage,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 发送消息
  const handleSend = async () => {
    const message = inputValue.trim()
    if (!message || isLoading) return

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // 显示正在输入动画
      setIsTyping(true)

      // 调用 AI 响应
      let response = ''
      if (onSendMessage) {
        response = await onSendMessage(message)
      } else {
        // 默认使用 AI API（GLM）
        response = await sendMessageToAI(message)
      }

      setIsTyping(false)

      // 添加助手消息
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      setIsTyping(false)
      console.error('发送消息失败:', error)

      // 错误消息
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '⚠️ 抱歉，發生錯誤，請稍後再試。',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      scrollToBottom()
    }
  }

  // 发送消息到 AI API（支持流式响应）
  const sendMessageToAI = async (message: string): Promise<string> => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.slice(1).map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: false,
        }),
      })

      if (!res.ok) {
        throw new Error('AI 服务暂时不可用')
      }

      const data = await res.json()

      if (data.success) {
        return data.response || '抱歉，我沒有理解您的問題。'
      } else {
        throw new Error(data.error || '处理失败')
      }
    } catch (error) {
      console.error('AI API Error:', error)
      throw error
    }
  }

  // 格式化消息内容（支持简单 Markdown）
  const formatMessage = (content: string) => {
    // 处理换行
    let formatted = content.replace(/\n/g, '<br />')

    // 处理粗体 **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // 处理代码 `text`
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')

    return formatted
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="text-xs text-orange-100">24/7 全天候服務</p>
          </div>
          <button
            onClick={() => {
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: initialMessage,
                  timestamp: new Date(),
                },
              ])
            }}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-orange-500 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm'
              }`}
            >
              {/* 消息内容 */}
              <div
                className="text-easy-body whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
              />

              {/* 时间戳 */}
              <p
                className={`text-easy-caption mt-1 ${
                  message.role === 'user' ? 'text-orange-100' : 'text-gray-400'
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString('zh-TW', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* 正在输入动画 */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        {/* 滚动锚点 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom">
        <div className="flex gap-2 items-end">
          {/* 文本输入框 */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={placeholder}
              className="w-full px-4 py-3 bg-gray-100 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 placeholder-gray-500"
              rows={1}
              disabled={isLoading}
              style={{
                minHeight: '48px',
                maxHeight: '120px',
              }}
            />
          </div>

          {/* 发送按钮 */}
          <IOSButton
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={`bg-orange-500 hover:bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center p-0 ${
              !inputValue.trim() || isLoading ? 'opacity-50' : ''
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18 9 18-9 2zm0 0v-8" />
              </svg>
            )}
          </IOSButton>
        </div>

        {/* 快捷提示 */}
        {messages.length <= 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: '📦 查詢訂單', text: '我的訂單' },
              { label: '📋 查詢庫存', text: '庫存查詢' },
              { label: '📅 今日休假', text: '今天誰休假' },
              { label: '📊 營業額', text: '本月營業額' },
            ].map((quick) => (
              <button
                key={quick.label}
                onClick={() => setInputValue(quick.text)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
              >
                {quick.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CSS 动画 */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-25%);
            animationTimingFunction: cubic-bezier(0.8, 0, 1, 1);
          }
          50% {
            transform: translateY(0);
            animationTimingFunction: cubic-bezier(0, 0, 0.2, 1);
          }
        }
        .animate-bounce {
          animation: bounce 1s infinite;
        }
      `}</style>
    </div>
  )
}
