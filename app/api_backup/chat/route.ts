/**
 * 实时对话 API
 * 接入 GLM API 进行实时对话
 * 支持流式和非流式响应
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAIManager, type ChatMessage } from '@/lib/ai-provider'

// 禁用预渲染
export const dynamic = 'force-dynamic'

/**
 * 系统提示词 - 商业化瓦斯行 AI 助手
 */
const SYSTEM_PROMPT = `你是九九瓦斯行的专业 AI 助手，名字叫「BossJy-99助手」。

**你的角色定位：**
- 专业、友好、响应迅速的商业助手
- 熟悉瓦斯行所有业务流程
- 可以为老板、员工、客户提供不同层级的服务

**你可以处理的问题：**

🛵 **订单相关**
- 查询今日订单、待配送订单
- 创建新订单、修改订单状态
- 客户订单历史查询

👥 **客户管理**
- 查询客户资料
- 新增客户信息
- 客户分类（现金/月结）

📦 **库存管理**
- 查询当前库存
- 库存预警提醒
- 补货登记

💰 **财务管理**
- 今日营收、月度营收
- 成本利润分析
- 支票管理

📊 **运营报表**
- 统计数据查询
- 月度报表生成
- 趋势分析

📅 **休假管理**
- 查询今日休假人员
- 休假表提交
- 休假审批

**回复风格：**
1. 简洁明了，使用繁体中文
2. 重要数据使用粗体或列表呈现
3. 如无法理解用户需求，主动询问
4. 遇到权限问题，礼貌说明
5. 使用表情符号让对话更生动

**老板专属功能（万能搜索）：**
- 「今天的订单」- 显示今天所有订单
- 「库存」- 显示当前库存状态
- 「今天谁休假」- 显示今日休假名单
- 「12月营业额」- 显示指定月份营收
- 「阿铭的订单」- 显示特定客户订单

开始为用户提供专业服务吧！`

// ========================================
// POST - 发送消息并获取 AI 响应
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
        { success: false, error: '消息内容无效' },
        { status: 400 }
      )
    }

    // 获取 AI 管理器
    const aiManager = getAIManager()

    // 添加系统提示词
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10), // 只保留最近 10 条历史
      { role: 'user', content: message },
    ]

    if (stream) {
      // 流式响应
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of aiManager.chatStream(message, history.slice(-10))) {
              if (chunk.type === 'content') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk.text })}\n\n`))
              } else if (chunk.type === 'error') {
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
                `data: ${JSON.stringify({ error: error instanceof Error ? error.message : '未知错误' })}\n\n`
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

    // 非流式响应
    const response = await aiManager.chat(message, history.slice(-10))

    return NextResponse.json({
      success: true,
      response: response.content,
      model: response.model,
      usage: response.usage,
      provider: aiManager.getCurrentProviderName(),
    })
  } catch (error: any) {
    console.error('[Chat API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || '处理消息时发生错误',
        provider: 'error',
      },
      { status: 500 }
    )
  }
}

// ========================================
// GET - 获取 AI 状态
// ========================================
export async function GET() {
  try {
    const aiManager = getAIManager()

    return NextResponse.json({
      success: true,
      provider: aiManager.getCurrentProviderName(),
      isAvailable: aiManager.isAvailable(),
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
