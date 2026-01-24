'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAIManager } from '@/lib/ai-provider-unified'
import { AIActionExecutor } from '@/lib/ai-action-executor'

// POST /api/ai/chat - AI 對話
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory = [], stream = false } = body

    if (!message) {
      return NextResponse.json(
        { error: '訊息內容為必填項' },
        { status: 400 }
      )
    }

    const aiManager = getAIManager()

    if (stream) {
      // 串流回應
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const response = await aiManager.chat(message, conversationHistory, {
              onChunk: (chunk: string) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`))
              }
            })

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, content: response })}\n\n`))
            controller.close()
          } catch (error) {
            controller.error(error)
          }
        }
      })

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      })
    } else {
      // 非串流回應
      const response = await aiManager.chat(message, conversationHistory)

      // 嘗試解析 AI 回應中的 action
      const parsedAction = AIActionExecutor.parseAction(response)

      if (parsedAction) {
        // 如果有 action，執行並返回結果
        const result = await AIActionExecutor.executeAction(parsedAction)

        return NextResponse.json({
          action: parsedAction.action,
          data: result.data || {},
          message: result.message,
          success: result.success
        })
      }

      // 如果沒有 action，返回普通回應
      return NextResponse.json({
        action: 'chat',
        data: {},
        message: response,
        provider: aiManager.getCurrentProviderName()
      })
    }
  } catch (error) {
    console.error('AI 對話失敗:', error)
    return NextResponse.json(
      {
        action: 'error',
        data: {},
        message: `AI 對話失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
        success: false
      },
      { status: 500 }
    )
  }
}
