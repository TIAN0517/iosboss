import { NextResponse } from 'next/server'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, conversationHistory } = body

    console.log('=== AI API 收到請求 ===')
    console.log('Message:', message)

    const apiKey = process.env.GLM_API_KEY || process.env.GLM_API_KEYS?.split(',')[0]
    console.log('API Key exists:', !!apiKey)

    if (!apiKey) {
      console.log('未配置 GLM API Key，使用本地回應')
      return NextResponse.json({ content: getLocalResponse(message), source: 'local' })
    }

    console.log('使用 GLM-4-Flash API')

    const messages: any[] = [{ role: 'system', content: NATURAL_SYSTEM_PROMPT }]
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.slice(-10).forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') messages.push({ role: msg.role, content: msg.content })
      })
    }
    messages.push({ role: 'user', content: message })

    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages,
        stream: false,
        temperature: 0.8,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GLM API error:', response.status, errorText)
      return NextResponse.json({ content: getLocalResponse(message), source: 'local', fallback: true })
    }

    const data = await response.json()
    const aiMessage = data.choices?.[0]?.message?.content

    console.log('GLM API 回應成功:', aiMessage?.substring(0, 50))

    return NextResponse.json({
      content: aiMessage || getLocalResponse(message),
      source: 'glm-api',
      model: data.model,
    })
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json({ content: '抱歉，AI 服務暫時無法使用。', source: 'local', error: true })
  }
}
