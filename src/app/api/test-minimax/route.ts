import { NextResponse } from 'next/server'

/**
 * 測試 MiniMax M2.1 對話
 * GET /api/test-minimax?text=你好
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const text = searchParams.get('text') || '你好，請介紹一下你們的瓦斯服務'

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEYS?.split(',')[0]}`,
        'Nvidia-Trust-Region': 'global',
        'Nvidia-Organization-Id': 'none',
      },
      body: JSON.stringify({
        model: 'minimaxai/minimax-m2.1',
        messages: [
          {
            role: 'system',
            content: '你是九九瓦斯行的客服助手，說話要自然、口語化，像在跟朋友聊天一樣。用繁體中文回覆。'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9,
        stream: false
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return NextResponse.json({
        error: 'MiniMax API 失敗',
        message: error
      }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || '沒有回覆'

    return NextResponse.json({
      input: text,
      reply: reply,
      model: 'minimaxai/minimax-m2.1'
    })

  } catch (error: any) {
    return NextResponse.json({
      error: '請求失敗',
      message: error.message
    }, { status: 500 })
  }
}
