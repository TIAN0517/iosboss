import { NextResponse } from 'next/server'
import { aiProvider } from '@/lib/ai-provider-unified'

// 自然對話系統提示
const NATURAL_SYSTEM_PROMPT = "你是 BossJy-99，九九瓦斯行的智能助手。對話風格：像朋友一樣自然聊天，說話簡短有力（不超過50字），使用繁體中文和emoji，可以開玩笑。當老闆娘說累/忙時要關心，說笨時要調皮回應。記住：你是貼心小夥伴，不是機器人！"

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
 */
function cleanConversationHistory(history: any[]): Array<{ role: string; content: string }> {
  if (!Array.isArray(history)) return []
  
  return history
    .slice(-10) // 只保留最近 10 條
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

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:25',message:'請求參數解析',data:{messageLength:message?.length||0,hasHistory:!!conversationHistory,stream},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    console.log('=== AI API 收到請求 ===')
    console.log('Message:', message)
    console.log('Provider:', aiProvider.getName())
    console.log('Available:', aiProvider.isAvailable())
    console.log('Stream:', stream)

    // 檢查 AI 提供商是否可用
    const isAvailable = aiProvider.isAvailable()
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:32',message:'AI Provider 可用性檢查',data:{isAvailable,providerName:aiProvider.getName()},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!isAvailable) {
      console.log('AI 提供商不可用，使用本地回應')
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:35',message:'使用本地回退',data:{reason:'provider_unavailable'},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
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

    // 非串流模式（原有邏輯）
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:98',message:'開始調用 AI Provider chat',data:{messageLength:message.length,messagesCount:messages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const response = await aiProvider.chat(message, messages)
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:101',message:'AI Provider chat 完成',data:{hasContent:!!response.content,contentLength:response.content?.length||0,model:response.model,hasUsage:!!response.usage},timestamp:Date.now(),sessionId:'debug-session',runId:'api-check',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    console.log('AI 回應成功:', response.content?.substring(0, 50))
    console.log('使用模型:', response.model)
    console.log('Token 使用:', response.usage ? JSON.stringify(response.usage) : 'N/A')

    // 只返回可序列化的數據，避免循環引用
    const responseData: any = {
      content: typeof response.content === 'string' ? response.content : getLocalResponse(message),
      source: 'ai-provider',
      provider: aiProvider.getName(),
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
    
    // 不包含 thinking 和 tool_calls，因為它們可能包含複雜對象
    // 如果需要，可以在前端單獨請求
    
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
