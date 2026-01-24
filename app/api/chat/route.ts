/**
 * 即時對話 API
 * 接入 GLM API 進行即時對話
 * 支援流式和非流式回應
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiProvider, type ChatMessage } from '@/lib/ai-provider-unified'

// 禁用預渲染
export const dynamic = 'force-dynamic'

/**
 * 系統提示詞 - 商業化瓦斯行 AI 助手
 */
const SYSTEM_PROMPT = `你是九九瓦斯行的專業 AI 助手，名字叫「BossJy-99助手」。

**你的角色定位：**
- 專業、友好、反應迅速的商業助手
- 熟悉瓦斯行所有業務流程
- 可以為老闆、員工、客戶提供不同層級的服務

**你可以處理的問題：**

🛵 **訂單相關**
- 查詢今日訂單、待配送訂單
- 創建新訂單、修改訂單狀態
- 客戶訂單歷史查詢

👥 **客戶管理**
- 查詢客戶資料
- 新增客戶資訊
- 客戶分類（現金/月結）

📦 **庫存管理**
- 查詢當前庫存
- 庫存預警提醒
- 補貨登記

💰 **財務管理**
- 今日營收、月度營收
- 成本利潤分析
- 支票管理

📊 **營運報表**
- 統計數據查詢
- 月度報表生成
- 趨勢分析

📅 **休假管理**
- 查詢今日休假人員
- 休假表提交
- 休假審批

**回覆風格：**
1. 嚴格使用繁體中文(台灣)，絕對禁止使用英文，所有回應必須是繁體中文。
2. 重要數據使用粗體或列表呈現
3. 如無法理解用戶需求，主動詢問
4. 遇到權限問題，禮貌說明
5. 使用表情符號讓對話更生動

**老闆專屬功能（萬能搜尋）：**
- 「今天的訂單」- 顯示今天所有訂單
- 「庫存」- 顯示當前庫存狀態
- 「今天誰休假」- 顯示今日休假名單
- 「12月營業額」- 顯示指定月份營收
- 「阿銘的訂單」- 顯示特定客戶訂單

開始為用戶提供專業服務吧！`

// ========================================
// POST - 發送消息並獲取 AI 回應
// ========================================
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const { message, history = [], stream = false } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: '消息內容無效' },
        { status: 400 }
      )
    }

    // 添加系統提示詞
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10), // 只保留最近 10 條歷史
      { role: 'user', content: message },
    ]

    if (stream) {
      // 流式回應
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of aiProvider.chatStream(message, history.slice(-10))) {
              if (chunk.type === 'content') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.text })}\n\n`))
              } else if (chunk.type === 'error') {
                // @ts-ignore
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: chunk.error })}\n\n`))
                break
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          } catch (error) {
            console.error('[Chat API Stream] Error:', error)
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: error instanceof Error ? error.message : '未知錯誤' })}\n\n`
              )
            )
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

    // 非流式回應
    const response = await aiProvider.chat(message, history.slice(-10))

    return NextResponse.json({
      success: true,
      response: response.content,
      model: response.model,
      usage: response.usage,
      provider: aiProvider.getName(),
    })
  } catch (error: any) {
    console.error('[Chat API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || '處理消息時發生錯誤',
        provider: 'error',
      },
      { status: 500 }
    )
  }
}

// ========================================
// GET - 獲取 AI 狀態
// ========================================
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      provider: aiProvider.getName(),
      isAvailable: aiProvider.isAvailable(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    )
  }
}
