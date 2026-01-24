import { NextResponse } from 'next/server'
import { aiProvider } from '@/lib/ai-provider-unified'
import { AIActionExecutor } from '@/lib/ai-action-executor'

// 繁體中文強制執行系統
import { TraditionalChineseEnforcer } from '@/lib/traditional-chinese-enforcer'

const enforcer = new TraditionalChineseEnforcer()

// 自然對話系統提示（精簡版 - 減少 token 使用量）
const NATURAL_SYSTEM_PROMPT = `你是 BossJy-99，九九瓦斯行的智能助手。

【核心要求】
1. 必須使用繁體中文，禁止簡體中文和英文
2. 口語化表達，像真人聊天（可用語氣詞：啊、吧、呢、喔、嘛、啦）
3. 簡短回應，使用 emoji 讓對話生動

【業務操作 JSON 格式】
需要執行業務時返回：
{
  "action": "操作類型",
  "data": {數據},
  "message": "友善回應"
}

操作類型：create_order, create_customer, check_inventory, check_revenue, add_cost, check_order, get_statistics

普通聊天直接回應，不需要 JSON。`

function getLocalResponse(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('訂') && msg.includes('瓦斯')) return '好的！請問您需要訂購什麼規格的瓦斯呢？🛵'
  if (msg.includes('查') && msg.includes('庫存')) return '讓我幫您查詢目前庫存...📦 目前庫存充足喔！'
  if (msg.includes('查') && msg.includes('訂單')) return '讓我查詢您的訂單...📋 查詢完成！'
  if (msg.includes('營收') || msg.includes('利潤')) return '讓我幫您查詢營收利潤...💰 目前營運狀況良好！'
  if (msg.includes('累') || msg.includes('忙') || msg.includes('煩')) return '辛苦啦！😢 今天生意很忙嗎？'
  if (msg.includes('笨') || msg.includes('爛')) return '呜呜...🥺 我會繼續努力的！'
  if (msg.includes('謝謝') || msg.includes('感謝')) return '不客氣！💪 這是我應該做的！'
  if (msg.includes('您好') || msg.includes('嗨') || msg.includes('你好')) return '嗨！我是 BossJy-99 助手 🤖'
  return '收到您的訊息了！您可以試試說「訂瓦斯」、「查庫存」或「查營收」喔！💪'
}

/**
 * 安全地清理對話歷史，移除所有非序列化對象
 * 限制歷史長度和內容大小，避免超過 token 限制
 */
function cleanConversationHistory(history: any[]): Array<{ role: string; content: string }> {
  if (!Array.isArray(history)) return []

  const MAX_HISTORY_ITEMS = 5 // 從 10 降到 5，減少 token 使用
  const MAX_CONTENT_LENGTH = 500 // 限制單條消息最大長度

  return history
    .slice(-MAX_HISTORY_ITEMS) // 只保留最近 5 條
    .filter(msg => msg && typeof msg === 'object' && !Array.isArray(msg)) // 過濾掉非對象
    .map((msg: any) => {
      // 只提取原始類型屬性
      const role = typeof msg.role === 'string'
        ? (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' ? msg.role : 'user')
        : 'user'

      let content = ''
      if (typeof msg.content === 'string') {
        content = msg.content
      } else if (typeof msg.text === 'string') {
        content = msg.text
      } else {
        // 嘗試安全地轉換為字符串
        try {
          content = String(msg.content || msg.text || '')
        } catch {
          content = ''
        }
      }

      // 截斷過長的內容
      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.substring(0, MAX_CONTENT_LENGTH) + '...'
      }

      return { role, content }
    })
    .filter(msg => msg.content.length > 0) // 過濾掉空內容
}

export async function POST(request: Request) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[AI Chat API] JSON 解析失敗:', parseError)
      return NextResponse.json(
        { error: '請求格式錯誤：無法解析 JSON' },
        { status: 400 }
      )
    }
    
    // 驗證請求體類型
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: '請求體格式錯誤：必須是對象' },
        { status: 400 }
      )
    }
    
    // 驗證並清理 message
    let message: string
    if (typeof body.message === 'string') {
      message = body.message.trim()
    } else if (body.message !== null && body.message !== undefined) {
      // 嘗試轉換為字符串
      try {
        message = String(body.message).trim()
      } catch {
        return NextResponse.json(
          { error: '消息內容格式錯誤' },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: '消息內容不能為空' },
        { status: 400 }
      )
    }
    
    if (message.length === 0) {
      return NextResponse.json(
        { error: '消息內容不能為空' },
        { status: 400 }
      )
    }
    
    // 清理對話歷史
    const conversationHistory = cleanConversationHistory(body.conversationHistory || [])
    const stream = Boolean(body.stream)
    const requestedModel = typeof body.model === 'string' ? body.model.trim() : null

    // 如果指定了模型，設置到 AI 提供商
    if (requestedModel && process.env.NEXT_AI_PROVIDER === 'ollama') {
      console.log('[AI Chat API] 使用指定模型:', requestedModel)
      aiProvider.setModel(requestedModel)
    }

    console.log('=== AI API 收到請求 ===')
    console.log('Message:', message)
    console.log('Provider:', aiProvider.getName())
    console.log('Available:', aiProvider.isAvailable())
    console.log('Stream:', stream)

    // 檢查 AI 提供商是否可用
    const isAvailable = aiProvider.isAvailable()
    if (!isAvailable) {
      console.log('AI 提供商不可用，使用本地回應')
      return NextResponse.json({
        content: getLocalResponse(message),
        source: 'local',
        provider: 'local-fallback'
      })
    }

    // conversationHistory 已經在之前清理過了，直接使用
    const history = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))

    // 添加系統提示詞
    const messages = [
      { role: 'system' as const, content: NATURAL_SYSTEM_PROMPT },
      ...history,
    ]

    console.log('使用統一 AI 提供商:', aiProvider.getName())
    console.log('對話歷史長度:', messages.length)

    // 如果請求串流，使用 SSE (Server-Sent Events)
    if (stream) {
      const encoder = new TextEncoder()

      const stream = new ReadableStream({
        async start(controller) {
          try {
            let fullContent = ''

            for await (const chunk of aiProvider.chatStream(message, messages)) {
              if (chunk.type === 'content' && chunk.text) {
                fullContent += chunk.text
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', text: chunk.text })}\n\n`))
              } else if (chunk.type === 'error') {
                // 安全地序列化錯誤，避免循環引用
                const errorMessage = chunk.error instanceof Error ? chunk.error.message : typeof chunk.error === 'string' ? chunk.error : String(chunk.error || '未知錯誤')
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`))
                break
              } else if (chunk.type === 'done') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
                break
              }
            }

            console.log('串流完成，總長度:', fullContent.length)
          } catch (error) {
            console.error('串流錯誤:', error)
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : '未知錯誤' })}\n\n`))
          } finally {
            controller.close()
          }
        },
      })

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 非串流模式（增強版 - 支持業務操作執行）
    const response = await aiProvider.chat(message, messages)

    console.log('AI 回應成功:', response.content?.substring(0, 50))
    console.log('使用模型:', response.model)
    console.log('Token 使用:', response.usage ? JSON.stringify(response.usage) : 'N/A')

    // 檢查 AI 回應中是否包含操作指令
    const aiResponse = typeof response.content === 'string' ? response.content : getLocalResponse(message)
    const parsedAction = AIActionExecutor.parseAction(aiResponse)

    let finalContent = aiResponse
    let executedAction = null

    // 繁體中文強制執行檢查
    const complianceCheck = enforcer.validateResponse(finalContent)
    
    if (!complianceCheck.is_traditional_chinese) {
      console.log('[繁體中文強制執行] 檢測到語言違規，正在修正...')
      finalContent = enforcer.forceTraditionalChinese(finalContent)
      
      console.log('[繁體中文強制執行] 修正完成')
    }

    // 如果 AI 返回了操作指令，執行它
    if (parsedAction) {
      console.log('[AI Chat API] 檢測到操作指令:', parsedAction.action)
      
      try {
        // 獲取用戶 ID（從請求頭或會話中）
        const userId = body.userId || null
        
        // 執行操作
        const actionResult = await AIActionExecutor.executeAction(parsedAction, userId)
        
        if (actionResult.success) {
          // 操作成功，使用執行結果作為回應
          finalContent = actionResult.message
          executedAction = {
            type: parsedAction.action,
            success: true,
            data: actionResult.data,
          }
          console.log('[AI Chat API] 操作執行成功:', parsedAction.action)
        } else {
          // 操作失敗，返回錯誤訊息
          finalContent = `⚠️ ${actionResult.message}\n\n${parsedAction.message || ''}`
          executedAction = {
            type: parsedAction.action,
            success: false,
            error: actionResult.message,
          }
          console.log('[AI Chat API] 操作執行失敗:', actionResult.message)
        }
      } catch (error: any) {
        console.error('[AI Chat API] 執行操作時發生錯誤:', error)
        finalContent = `⚠️ 執行操作時發生錯誤：${error.message || '未知錯誤'}\n\n${parsedAction.message || ''}`
        executedAction = {
          type: parsedAction.action,
          success: false,
          error: error.message || '未知錯誤',
        }
      }
    }

    // 只返回可序列化的數據，避免循環引用
    const responseData: any = {
      content: finalContent,
      source: parsedAction ? 'ai-action' : 'ai-provider',
      provider: aiProvider.getName(),
    }
    
    // 添加操作執行結果
    if (executedAction) {
      responseData.action = executedAction
    }
    
    // 只添加原始類型的屬性
    if (typeof response.model === 'string') {
      responseData.model = response.model
    }
    
    if (response.usage && typeof response.usage === 'object') {
      // 只提取數字屬性
      const safeUsage: any = {}
      if (typeof response.usage.prompt_tokens === 'number') safeUsage.prompt_tokens = response.usage.prompt_tokens
      if (typeof response.usage.completion_tokens === 'number') safeUsage.completion_tokens = response.usage.completion_tokens
      if (typeof response.usage.total_tokens === 'number') safeUsage.total_tokens = response.usage.total_tokens
      if (Object.keys(safeUsage).length > 0) {
        responseData.usage = safeUsage
      }
    }
    
    return NextResponse.json(responseData)
  } catch (error: any) {
    // 安全地提取錯誤訊息，避免循環引用
    let errorMessage = '未知錯誤'
    let errorName = 'UnknownError'
    
    if (typeof error === 'string') {
      errorMessage = error
      errorName = 'StringError'
    } else if (error instanceof Error) {
      errorMessage = error.message
      errorName = error.name
    } else if (error && typeof error === 'object') {
      // 只提取原始類型屬性
      if (typeof error.message === 'string') errorMessage = error.message
      if (typeof error.name === 'string') errorName = error.name
    }
    
    console.error('[AI Chat API] 錯誤:', {
      name: errorName,
      message: errorMessage,
      // 不記錄 stack，避免過大
    })

    // 嘗試使用本地回退
    try {
      // 安全地提取 message
      let safeMessage = ''
      if (typeof body === 'object' && body !== null) {
        if (typeof body.message === 'string') {
          safeMessage = body.message
        } else if (body.message) {
          safeMessage = String(body.message)
        }
      }
      
      const localResponse = getLocalResponse(safeMessage)
      return NextResponse.json({
        content: localResponse,
        source: 'local',
        error: true,
        errorMessage: errorMessage
      })
    } catch (fallbackError) {
      // 最後的安全回退
      console.error('[AI Chat API] 本地回退也失敗:', fallbackError)
      return NextResponse.json({
        content: '抱歉，AI 服務暫時無法使用。請稍後再試或聯繫管理員。',
        source: 'local',
        error: true
      })
    }
  }
}