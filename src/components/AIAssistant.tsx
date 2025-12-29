'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { IOSCard } from '@/components/ui/ios-card'
import { IOSButton } from '@/components/ui/ios-button'
import { triggerHaptic } from '@/lib/ios-utils'
import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Sparkles,
  User,
  Bot,
  ShoppingCart,
  Package,
  FileText,
  DollarSign,
  Send,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronRight,
  Brain,
  Zap,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: any
  isSpeaking?: boolean
  // 思考過程
  thinking?: string
  // 工具調用
  toolCalls?: Array<{
    name: string
    arguments: Record<string, any>
    result?: any
  }>
  // Token 使用情況
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  // 是否正在流式輸出
  isStreaming?: boolean
  // 來源
  source?: 'ai' | 'local-fallback' | 'error'
  // 模型名稱
  model?: string
}

const QUICK_ACTIONS = [
  { icon: ShoppingCart, label: '訂瓦斯', prompt: '我要訂購瓦斯', color: 'bg-purple-500' },
  { icon: Package, label: '查庫存', prompt: '查詢目前庫存', color: 'bg-orange-500' },
  { icon: FileText, label: '查訂單', prompt: '查詢我的訂單', color: 'bg-blue-500' },
  { icon: DollarSign, label: '營收利潤', prompt: '查詢營收利潤', color: 'bg-green-500' },
]

const AI_NAME = 'BossJy-99助手'
const AI_AVATAR = '🤖'

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `您好！我是 ${AI_NAME} ${AI_AVATAR}\n\n我可以幫您管理整個瓦斯行系統：\n\n🛵 **訂單管理**\n• 訂購瓦斯、查詢訂單\n\n👥 **客戶管理**\n• 新增客戶、查詢客戶資料\n\n📦 **庫存管理**\n• 查詢庫存、補貨登記\n\n💰 **財務管理**\n• 營收利潤、成本分析\n• 支票管理、抄錶計算\n\n📊 **營運報表**\n• 今日統計、月度報表\n\n💬 **語音功能**\n• 點擊麥克風就可以說話喔！\n\n請問今天有什麼可以幫您的呢？`,
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [providerName, setProviderName] = useState<string>('初始化中...')
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([])

  // 思考過程展開狀態
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({})

  // 深度清理 conversationHistory 的輔助函數
  // 過濾掉所有 React 組件、DOM 元素（包括 SVG）和循環引用
  const deepCleanHistory = (history: Array<any>): Array<{ role: string; content: string }> => {
    return (history || [])
      .filter(msg => {
        if (!msg || typeof msg !== 'object' || Array.isArray(msg)) {
          return false
        }
        // 過濾掉 DOM 元素（包括 SVG）
        if (msg instanceof HTMLElement || 
            msg instanceof Node || 
            msg instanceof SVGElement ||
            (typeof SVGElement !== 'undefined' && msg instanceof SVGElement)) {
          return false
        }
        // 過濾掉 React 組件（檢查 React 內部屬性）
        if ((msg as any).$$typeof !== undefined || 
            (msg as any).__reactFiber !== undefined ||
            (msg as any).__reactInternalInstance !== undefined) {
          return false
        }
        // 檢查是否有 React Fiber 相關屬性（常見的循環引用來源）
        const keys = Object.keys(msg)
        if (keys.some(key => key.includes('reactFiber') || key.includes('__react'))) {
          return false
        }
        return true
      })
      .map(msg => {
        const role = typeof msg.role === 'string' 
          ? (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' ? msg.role : 'user')
          : 'user'
        
        let content = ''
        if (typeof msg.content === 'string') {
          content = msg.content
        } else if (typeof msg.text === 'string') {
          content = msg.text
        } else {
          try {
            content = String(msg.content || msg.text || '')
          } catch {
            content = ''
          }
        }
        
        return { role, content }
      })
      .filter(msg => msg.content.length > 0)
  }

  // 自動滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 開啟時聚焦輸入框
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
    }
  }, [isOpen, isMinimized])

  // 類似 iOS Messages 的打字動畫效果
  useEffect(() => {
    if (isLoading) {
      setIsTyping(true)
    } else {
      const timer = setTimeout(() => setIsTyping(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  // 檢查 API 連接狀態
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // 確保請求體只包含純數據
        const pingBody = JSON.stringify({ 
          message: 'ping', 
          conversationHistory: [],
          stream: false,
        })
        
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: pingBody,
        })
        if (response.ok) {
          const data = await response.json()
          setProviderName(data.provider || 'GLM')
          setConnectionStatus('online')
        } else {
          setConnectionStatus('offline')
          setProviderName('Local (後備)')
        }
      } catch {
        setConnectionStatus('offline')
        setProviderName('Local (後備)')
      }
    }

    checkConnection()
    // 每 30 秒檢查一次
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSend = async (useStream = true) => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    const currentInput = inputValue
    setInputValue('')
    triggerHaptic('light')
    setIsLoading(true)
    setIsStreaming(true)

    // 創建一個臨時的 AI 消息用於流式更新
    const tempMessageId = (Date.now() + 1).toString()
    setMessages((prev) => [
      ...prev,
      {
        id: tempMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ])

    try {
      // 使用 API 路由（支持串流）
      // 使用深度清理函數確保 conversationHistory 只包含純數據
      const cleanHistory = deepCleanHistory(conversationHistory).slice(-10)
      
      // 驗證 message 是否為純字符串
      const safeMessage = typeof currentInput === 'string' ? currentInput : String(currentInput || '')
      
      // 構建請求體，確保所有值都是可序列化的
      const requestBody = {
        message: safeMessage,
        conversationHistory: cleanHistory,
        stream: Boolean(useStream),
      }
      
      // 在發送前驗證請求體是否可序列化
      let requestBodyString: string
      try {
        requestBodyString = JSON.stringify(requestBody)
      } catch (serializeError) {
        console.error('[AIAssistant] 請求體序列化失敗:', serializeError)
        // 如果序列化失敗，使用最簡單的請求體
        requestBodyString = JSON.stringify({
          message: safeMessage,
          conversationHistory: [],
          stream: Boolean(useStream),
        })
      }
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBodyString,
      })

      if (!response.ok) {
        throw new Error(`API 請求失敗: ${response.status}`)
      }

      // 檢查是否為串流響應
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('text/event-stream')) {
        // 處理串流響應
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullContent = ''

        if (!reader) throw new Error('無法讀取串流響應')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'content' && data.text) {
                  fullContent += data.text
                  // 更新消息內容
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === tempMessageId
                        ? { ...msg, content: fullContent, isStreaming: true }
                        : msg
                    )
                  )
                } else if (data.type === 'done') {
                  break
                } else if (data.type === 'error') {
                  throw new Error(data.error || '串流錯誤')
                }
              } catch (e) {
                // 忽略解析錯誤
              }
            }
          }
        }

        // 完成串流
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempMessageId
              ? { ...msg, content: fullContent, isStreaming: false }
              : msg
          )
        )

        // 更新對話歷史（確保只保存純數據）
        setConversationHistory((prev) => {
          // 深度清理現有歷史，確保沒有污染
          const cleanedPrev = deepCleanHistory(prev)
          
          // 只添加新的純數據
          return [
            ...cleanedPrev,
            { role: 'user', content: String(currentInput || '') },
            { role: 'assistant', content: String(fullContent || '') },
          ]
        })

        // 嘗試獲取提供商信息（使用非串流請求）
        try {
          // 使用深度清理函數
          const cleanHistoryForInfo = deepCleanHistory(conversationHistory).slice(-10)
          
          const safeMessage = typeof currentInput === 'string' ? currentInput : String(currentInput || '')
          
          let infoRequestBodyString: string
          try {
            infoRequestBodyString = JSON.stringify({
              message: safeMessage,
              conversationHistory: cleanHistoryForInfo,
              stream: false,
            })
          } catch {
            infoRequestBodyString = JSON.stringify({
              message: safeMessage,
              conversationHistory: [],
              stream: false,
            })
          }
          
          const infoResponse = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: infoRequestBodyString,
          })
          if (infoResponse.ok) {
            const infoData = await infoResponse.json()
            if (infoData.provider) setProviderName(infoData.provider)
            if (infoData.model) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempMessageId
                    ? { ...msg, model: infoData.model }
                    : msg
                )
              )
            }
            setConnectionStatus(infoData.source === 'ai' ? 'online' : 'offline')
          }
        } catch {
          // 忽略信息獲取錯誤
        }

        setIsLoading(false)
        setIsStreaming(false)
        triggerHaptic('success')
        return
      }

      // 非串流響應（原有邏輯）
      const data = await response.json()

      // 更新對話歷史（確保只保存純數據）
      setConversationHistory((prev) => {
        // 深度清理現有歷史，確保沒有污染
        const cleanedPrev = deepCleanHistory(prev)
        
        // 只添加新的純數據
        return [
          ...cleanedPrev,
          { role: 'user', content: String(currentInput || '') },
          { role: 'assistant', content: String(data.content || '') },
        ]
      })

      // 更新提供商名稱
      if (data.provider) {
        setProviderName(data.provider)
      }

      // 更新連接狀態
      setConnectionStatus(data.source === 'ai' ? 'online' : 'offline')

      const aiResponse: Message = {
        id: tempMessageId,
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        thinking: data.thinking,
        toolCalls: data.tool_calls,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
        source: data.source === 'ai' ? 'ai' : 'local-fallback',
        model: data.model,
        isStreaming: false,
      }

      setMessages((prev) => prev.map((msg) => (msg.id === tempMessageId ? aiResponse : msg)))
      setIsLoading(false)
      setIsStreaming(false)
      triggerHaptic('success')
    } catch (error) {
      // 安全地記錄錯誤，避免循環引用
      let errorMessage = '未知錯誤'
      let errorForLog = error

      if (error instanceof Error) {
        errorMessage = error.message
        errorForLog = { message: error.message, name: error.name, stack: error.stack }
      } else if (typeof error === 'string') {
        errorMessage = error
        errorForLog = { message: error }
      } else {
        try {
          // 嘗試安全地序列化
          errorMessage = JSON.stringify(error, ['message', 'name', 'stack', 'status', 'statusText'])
          errorForLog = { serialized: errorMessage }
        } catch {
          errorMessage = String(error)
          errorForLog = { stringVersion: errorMessage }
        }
      }

      console.error('AI 處理錯誤:', errorForLog)

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempMessageId
            ? {
                id: tempMessageId,
                role: 'assistant',
                content: `⚠️ 連接 AI 服務時遇到問題。\n\n錯誤：${errorMessage}\n\n請檢查：\n• 網路連接是否正常\n• API Key 是否正確\n• 或稍後再試`,
                timestamp: new Date(),
                source: 'error',
                isStreaming: false,
              }
            : msg
        )
      )
      setIsLoading(false)
      setIsStreaming(false)
      triggerHaptic('error')
      setProviderName('連接失敗')
      setConnectionStatus('offline')
    }
  }

  const handleQuickAction = (prompt: string) => {
    setInputValue(prompt)
    triggerHaptic('medium')
    setTimeout(() => handleSend(), 300)
  }

  const toggleAssistant = () => {
    setIsOpen(!isOpen)
    setIsMinimized(false)
    triggerHaptic('medium')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* iOS 風格浮動按鈕 */}
      {!isOpen && (
        <button
          onClick={toggleAssistant}
          className="fixed bottom-6 right-6 z-50 ios-gradient-primary text-white p-4 rounded-full ios-card-shadow-elevated hover:scale-105 active:scale-95 transition-all duration-200 ios-safe-area-bottom"
          style={{ marginBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
        >
          <div className="relative">
            <MessageCircle className="h-7 w-7" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </div>
        </button>
      )}

      {/* AI 助手視窗 - iOS Messages 風格 */}
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm ios-safe-area"
            onClick={toggleAssistant}
          />

          {/* 聊天視窗 */}
          <div
            className={`fixed z-50 bg-white ios-card-shadow-elevated transition-all duration-300 ios-safe-area ios-safe-area-bottom ${
              isMinimized
                ? 'bottom-0 right-4 left-4 md:left-auto md:right-6 md:bottom-6 h-auto md:h-20 md:w-96 rounded-2xl'
                : 'bottom-0 right-0 left-0 md:left-auto md:right-6 md:bottom-6 h-[90vh] md:h-[700px] md:w-[420px] md:rounded-3xl'
            }`}
          >
            {/* iOS 風格 Header */}
            <div className="ios-glass border-b border-gray-200/50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* 返回按鈕（移動端） */}
                <button
                  onClick={toggleAssistant}
                  className="md:hidden p-2 -ml-2 text-blue-500 hover:bg-blue-50 rounded-xl active:scale-95 transition-all"
                >
                  <ChevronDown className="h-6 w-6" />
                </button>

                {/* AI 頭像 */}
                <div className="relative">
                  <div className="w-11 h-11 rounded-full ios-gradient-primary flex items-center justify-center shadow-lg">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></span>
                </div>

                <div>
                  <h3 className="text-easy-subheading font-bold text-gray-900">{AI_NAME}</h3>
                  <p className="text-easy-caption flex items-center gap-1">
                    {connectionStatus === 'checking' && (
                      <>
                        <Loader2 className="h-2 w-2 animate-spin text-gray-400" />
                        <span className="text-gray-400">檢查連接中...</span>
                      </>
                    )}
                    {connectionStatus === 'online' && (
                      <>
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-green-600">在線</span>
                      </>
                    )}
                    {connectionStatus === 'offline' && (
                      <>
                        <WifiOff className="h-2 w-2 text-orange-500" />
                        <span className="text-orange-600">離線模式</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsMinimized(!isMinimized)
                    triggerHaptic('light')
                  }}
                  className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-all active:scale-95"
                >
                  {isMinimized ? (
                    <Maximize2 className="h-5 w-5" />
                  ) : (
                    <Minimize2 className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={toggleAssistant}
                  className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-all active:scale-95 md:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 內容區域 */}
            {!isMinimized && (
              <div className="flex flex-col h-[calc(100%-72px)]">
                {/* 訊息區 - iOS Messages 樣式 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ios-slide-in-up`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div
                        className={`flex gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* 頭像 */}
                        <div
                          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm ${
                            message.role === 'user' ? 'bg-orange-500' : 'ios-gradient-primary'
                          }`}
                        >
                          {message.role === 'user' ? (
                            <User className="h-4 w-4 text-white" />
                          ) : (
                            <Bot className="h-4 w-4 text-white" />
                          )}
                        </div>

                        {/* 訊息氣泡容器 */}
                        <div className="flex flex-col gap-1">
                          {/* 思考過程顯示（可摺疊） */}
                          {message.thinking && message.role === 'assistant' && (
                            <div
                              className={`bg-amber-50 border border-amber-200 rounded-xl overflow-hidden transition-all duration-300 ${
                                expandedThinking[message.id] ? 'max-h-96' : 'max-h-8'
                              }`}
                            >
                              <button
                                onClick={() => {
                                  setExpandedThinking(prev => ({
                                    ...prev,
                                    [message.id]: !prev[message.id],
                                  }))
                                  triggerHaptic('light')
                                }}
                                className="w-full px-3 py-1.5 flex items-center gap-1 text-amber-700 hover:bg-amber-100/50 transition-colors"
                              >
                                <Brain className="h-3.5 w-3.5" />
                                <span className="text-easy-caption font-semibold">
                                  {expandedThinking[message.id] ? '隱藏思考過程' : '顯示思考過程'}
                                </span>
                                <ChevronRight
                                  className={`h-3 w-3 transition-transform ${
                                    expandedThinking[message.id] ? 'rotate-90' : ''
                                  }`}
                                />
                              </button>
                              {expandedThinking[message.id] && (
                                <div className="px-3 pb-2">
                                  <p className="text-easy-body-small text-amber-800 whitespace-pre-wrap leading-relaxed font-medium">
                                    {message.thinking}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 工具調用顯示 */}
                          {message.toolCalls && message.toolCalls.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2">
                              <div className="flex items-center gap-1 text-blue-700 mb-1">
                                <Zap className="h-3 w-3" />
                                <span className="text-easy-caption font-semibold">工具調用</span>
                              </div>
                              {message.toolCalls.map((tool, idx) => (
                                <div key={idx} className="text-[10px] text-blue-600 font-mono bg-white/50 rounded p-1">
                                  <span className="font-semibold">{tool.name}</span>
                                  <span className="text-blue-400"> → </span>
                                  <span>{(() => {
                                    try {
                                      // 安全地序列化 tool.arguments，避免循環引用
                                      const safeArgs = tool.arguments && typeof tool.arguments === 'object'
                                        ? Object.fromEntries(
                                            Object.entries(tool.arguments).map(([key, value]) => [
                                              key,
                                              typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null
                                                ? value
                                                : String(value)
                                            ])
                                          )
                                        : tool.arguments
                                      return JSON.stringify(safeArgs, null, 2)
                                    } catch {
                                      return String(tool.arguments || '')
                                    }
                                  })()}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 訊息氣泡 - iOS Messages 風格 */}
                          <div
                            className={`px-4 py-3 shadow-sm ${
                              message.role === 'user'
                                ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl rounded-br-sm'
                                : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm ios-border-thin'
                            } ${message.isStreaming ? 'animate-pulse' : ''}`}
                          >
                            <p className="text-easy-body whitespace-pre-wrap leading-relaxed font-medium tracking-wide">
                              {message.content}
                            </p>

                            {/* 元資訊 */}
                            <div className="flex items-center justify-between mt-2">
                              <p
                                className={`text-easy-caption font-medium ${
                                  message.role === 'user' ? 'text-orange-200' : 'text-gray-400'
                                }`}
                              >
                                {message.timestamp.toLocaleTimeString('zh-TW', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>

                              {/* Token 使用情況 */}
                              {message.usage && (
                                <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                  {message.usage.totalTokens}T
                                </span>
                              )}

                              {/* 來源標籤 */}
                              {message.source === 'local-fallback' && (
                                <span className="text-[9px] text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full">
                                  後備模式
                                </span>
                              )}
                              {message.source === 'error' && (
                                <span className="text-[9px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                                  錯誤
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* iOS 風格的正在輸入動畫 */}
                  {isLoading && (
                    <div className="flex justify-start ios-slide-in-up">
                      <div className="flex gap-2">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full ios-gradient-primary flex items-center justify-center shadow-sm">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white ios-border-thin shadow-sm">
                          <div className="flex gap-1.5 items-center h-5">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* 快速操作 - iOS 風格 */}
                {messages.length <= 1 && (
                  <div className="px-4 py-3 bg-white border-t border-gray-100/50">
                    <p className="text-easy-caption text-gray-500 mb-3 font-semibold">快速操作</p>
                    <div className="grid grid-cols-4 gap-2">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={action.label}
                          onClick={() => handleQuickAction(action.prompt)}
                          className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all ios-border-thin"
                        >
                          <div className={`${action.color} p-2 rounded-xl shadow-sm`}>
                            <action.icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-easy-caption font-semibold text-gray-700">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* iOS 風格的輸入區域 */}
                <div className="p-4 bg-white border-t border-gray-100/50 ios-safe-area-bottom">
                  <div className="flex gap-2 items-end">
                    {/* 輸入框 */}
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="輸入訊息..."
                        className="w-full px-4 py-3 pr-2 bg-gray-100 rounded-2xl text-easy-body focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                        disabled={isLoading}
                        style={{ minHeight: '48px' }}
                      />
                    </div>

                    {/* 發送按鈕 */}
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isLoading}
                      className={`p-3 rounded-xl transition-all active:scale-95 ${
                        inputValue.trim() && !isLoading
                          ? 'ios-gradient-primary text-white shadow-md'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                      <span>{AI_NAME}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-500">{providerName}</span>

                      {/* 連接狀態指示器 */}
                      {connectionStatus === 'checking' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[8px] font-medium">
                          <Loader2 className="h-2 w-2 animate-spin" />
                          檢查中
                        </span>
                      )}
                      {connectionStatus === 'online' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[8px] font-medium">
                          <Wifi className="h-2 w-2" />
                          在線
                        </span>
                      )}
                      {connectionStatus === 'offline' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[8px] font-medium">
                          <WifiOff className="h-2 w-2" />
                          離線
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
