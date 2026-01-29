import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'

export const dynamic = 'force-dynamic'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_USER_ID = process.env.LINE_USER_ID || ''
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID || ''
const LINE_EMPLOYEE_GROUP_ID = process.env.LINE_EMPLOYEE_GROUP_ID || ''

// 知識庫類型定義
interface KnowledgeBase {
  id: string
  title: string
  content: string
  category: string
}

// 選單類型
interface QuickReplyItem {
  type: 'action'
  action: {
    type: 'message'
    label: string
    text: string
  }
}

// 權限等級
type PermissionLevel = 'admin' | 'employee' | 'public'

function getPermissionLevel(groupId: string, userId: string): PermissionLevel {
  if (groupId === LINE_ADMIN_GROUP_ID || userId === LINE_USER_ID) {
    return 'admin'
  }
  if (groupId === LINE_EMPLOYEE_GROUP_ID) {
    return 'employee'
  }
  return 'public'
}

/**
 * 發送訊息到 LINE
 */
async function replyToLine(replyToken: string, messages: any[]): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('[LINE Webhook] No access token configured')
    return false
  }

  if (!replyToken) {
    console.error('[LINE Webhook] No reply token provided')
    return false
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[LINE Webhook] Reply API error:', errorText)
      return false
    }
    return true
  } catch (error) {
    console.error('[LINE Webhook] Reply error:', error)
    return false
  }
}

/**
 * 從資料庫查詢資料
 */
async function queryDatabase(table: string, filters?: Record<string, string>): Promise<any[]> {
  try {
    let url = `http://localhost:9999/api/database/${table}`
    if (filters) {
      const params = new URLSearchParams(filters)
      url += `?${params.toString()}`
    }
    const response = await fetch(url, {
      headers: { 'x-user-id': 'bot', 'x-user-username': 'line-bot' },
    })
    if (!response.ok) return []
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('[LINE Webhook] DB query error:', error)
    return []
  }
}

/**
 * 獲取 AI 回覆（繁體中文）
 */
async function getAIResponse(message: string): Promise<string> {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:14b',
        messages: [
          {
            role: 'system',
            content: `你是九九瓦斯行的 AI 助手。
            **重要規則：**
            1. 你必須使用「繁體中文」回覆（台灣用語），絕對不可以使用簡體中文
            2. 回答要簡短明瞭，每句話不超過 30 個中文字
            3. 使用自然的口語對話風格
            4. 如果用戶用繁體中文提問，你也要用繁體中文回答

            **錯誤示範（不要這樣說）：**
            - "好的，我了解了"（簡體中文）
            - "收到，謝謝"（簡體中文）

            **正確示範（要這樣說）：**
            - "好的，我了解了！"（繁體中文）
            - "收到，謝謝！"（繁體中文）
            - "了解，我會處理！"（繁體中文）
            - "沒問題！"（繁體中文）
            `
          },
          { role: 'user', content: message }
        ],
        stream: false,
      }),
    })

    if (!response.ok) throw new Error('Ollama error')
    const data = await response.json()
    return data.message?.content || '好的，我了解了！'
  } catch (error) {
    console.error('[LINE Webhook] AI error:', error)
    const fallback = ['好的，我了解了！', '收到，謝謝！', '了解，我會處理！', '沒問題！']
    return fallback[Math.floor(Math.random() * fallback.length)]
  }
}

// ============ 管理員功能 ============

async function getTodayOrders(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const orders = await queryDatabase('gas_orders', { createdAt: today })

  if (orders.length === 0) return '📦 今日尚未有訂單'

  const pending = orders.filter((o: any) => o.status === 'pending').length
  const completed = orders.filter((o: any) => o.status === 'completed').length

  return `📦 今日訂單統計\n\n總訂單：${orders.length} 筆\n待處理：${pending} 筆\n已完成：${completed} 筆`
}

async function getInventory(): Promise<string> {
  const inventory = await queryDatabase('inventory')

  if (inventory.length === 0) return '📊 無庫存資料'

  const items = inventory.slice(0, 5).map((i: any) => {
    const product = i.product || {}
    const name = product.name || '未知商品'
    const qty = i.quantity || 0
    const minStock = i.minStock || 10
    const status = qty < minStock ? '⚠️' : '✅'
    return `${status} ${name}：${qty} 個`
  }).join('\n')

  return `📊 庫存狀況\n\n${items}\n\n庫存不足會顯示 ⚠️`
}

async function getCustomerBills(phone?: string): Promise<string> {
  const customers = phone
    ? await queryDatabase('customers', { phone: `%${phone}%` })
    : (await queryDatabase('customers')).slice(0, 3)

  if (customers.length === 0) return '💰 查無此客戶'

  if (customers.length === 1) {
    const customer = customers[0]
    return `💰 ${customer.name}\n電話：${customer.phone}\n地址：${customer.address || '無'}\n結欠：${customer.balance || 0} 元`
  }

  return `找到 ${customers.length} 位客戶，請輸入完整電話號碼查詢帳單`
}

async function getMeterReadings(customerPhone?: string): Promise<string> {
  if (customerPhone) {
    const customers = await queryDatabase('customers', { phone: `%${customerPhone}%` })
    if (customers.length === 0) return '📖 查無客戶'

    const customer = customers[0]
    const readings = await queryDatabase('meter_readings', { customerId: customer.id })

    if (readings.length === 0) return `📖 ${customer.name} 尚無抄表記錄`

    const latest = readings[0]
    return `📖 ${customer.name} 最新抄表\n\n日期：${new Date(latest.readingDate).toLocaleDateString()}\n上期：${latest.previousReading}\n本期：${latest.currentReading}\n用量：${latest.usage}`
  }

  const recent = (await queryDatabase('meter_readings')).slice(0, 3)
  if (recent.length === 0) return '📖 無抄表記錄'

  return `📖 最近抄表記錄\n\n共 ${recent.length} 筆，請輸入客戶電話查詢詳情`
}

async function getRevenue(): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const orders = await queryDatabase('gas_orders', { createdAt: today })

  if (orders.length === 0) return '💵 今日尚無營收'

  const total = orders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
  const cash = orders.filter((o: any) => o.paymentType === 'cash').reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0)
  const transfer = total - cash

  return `💵 今日營收\n\n總營收：${total.toLocaleString()} 元\n現金：${cash.toLocaleString()} 元\n轉帳：${transfer.toLocaleString()} 元\n訂單數：${orders.length} 筆`
}

async function getPendingDeliveries(): Promise<string> {
  const deliveries = await queryDatabase('delivery_records', { status: 'pending' })

  if (deliveries.length === 0) return '🛵 無待配送訂單'

  return `🛵 待配送訂單 (${deliveries.length} 筆)\n\n請盡快安排配送！`
}

async function getChecks(): Promise<string> {
  const checks = await queryDatabase('checks', { status: 'pending' })

  if (checks.length === 0) return '💳 無待兌現支票'

  const total = checks.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)

  return `💳 待兌現支票\n\n數量：${checks.length} 張\n總額：${total.toLocaleString()} 元\n\n請盡快兌現！`
}

// ============ 休假管理功能 ============

async function getPendingLeaveRequests(): Promise<string> {
  const leaves = await queryDatabase('leave_records', { status: 'pending' })

  if (leaves.length === 0) return '📋 目前無待審核的假單'

  const list = leaves.map((l: any) =>
    `• ${l.userName}：${l.leaveType}\n  ${l.startDate} ~ ${l.endDate}\n  原因：${l.reason || '無'}`
  ).join('\n\n')

  return `📋 待審核假單（共 ${leaves.length} 筆）\n\n${list}`
}

async function getMonthlyLeaves(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const monthStr = `${year}-${month}`

  const leaves = await queryDatabase('leave_records', { startDate: monthStr })

  if (leaves.length === 0) return `📅 ${year}年${month}月 無休假紀錄`

  const approved = leaves.filter((l: any) => l.status === 'approved')
  const totalDays = approved.reduce((sum: number, l: any) => {
    const start = new Date(l.startDate)
    const end = new Date(l.endDate)
    return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, 0)

  const list = approved.slice(0, 5).map((l: any) =>
    `• ${l.userName}：${l.startDate} ~ ${l.endDate} (${l.leaveType})`
  ).join('\n')

  return `📅 ${year}年${month}月 休假紀錄\n\n已核准：${approved.length} 筆\n總天數：${totalDays} 天\n\n${list}`
}

async function getLeaveRecords(userName?: string): Promise<string> {
  if (userName) {
    const customers = await queryDatabase('customers', { name: `%${userName}%` })
    // 查詢休假記錄
    const leaves = await queryDatabase('leave_records')
    const userLeaves = leaves.filter((l: any) =>
      l.userName?.includes(userName) || l.userId?.includes(userName)
    )

    if (userLeaves.length === 0) return `📋 無「${userName}」的休假紀錄`

    const approved = userLeaves.filter((l: any) => l.status === 'approved').length
    const pending = userLeaves.filter((l: any) => l.status === 'pending').length
    const rejected = userLeaves.filter((l: any) => l.status === 'rejected').length

    return `📋 ${userName} 休假統計\n\n已核准：${approved} 筆\n待審核：${pending} 筆\n已駁回：${rejected} 筆`
  }

  const leaves = await queryDatabase('leave_records')
  if (leaves.length === 0) return '📋 尚無休假紀錄'

  return `📋 休假紀錄共 ${leaves.length} 筆\n輸入姓名可查詢個人紀錄`
}

// ============ 員工功能 ============

async function getMyDeliveries(): Promise<string> {
  const deliveries = await queryDatabase('delivery_records', { status: 'pending' })

  if (deliveries.length === 0) return '🛵 目前無待配送訂單'

  const list = deliveries.slice(0, 5).map((d: any) =>
    `• 訂單：${d.orderNo || '無'}\n  客戶：${d.customerName || '無'}\n  地址：${d.address || '無'}`
  ).join('\n\n')

  return `🛵 待配送訂單（共 ${deliveries.length} 筆）\n\n${list}`
}

async function applyLeave(userName: string, message: string): Promise<string> {
  // 解析休假資訊
  // 格式：請假 姓名 類型 開始日期 結束日期 原因
  // 例如：請假 張三 特休 2026-01-30 2026-02-01 家事

  const parts = message.split(' ')
  if (parts.length < 4) {
    return `📅 請假格式範例：\n\n請假 姓名 類型 開始日期 結束日期 原因\n\n假別：特休、病假、事假、無薪假\n\n例如：\n請假 張三 特休 2026-01-30 2026-02-01`
  }

  const [, name, leaveType, startDate, endDate, ...reasonParts] = parts
  const reason = reasonParts.join(' ')

  try {
    // 創建休假記錄
    const response = await fetch('http://localhost:9999/api/database/leave_records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'bot',
        'x-user-username': 'line-bot',
      },
      body: JSON.stringify({
        userId: `line_${name}`,
        userName: name,
        leaveType: mapLeaveType(leaveType),
        startDate,
        endDate,
        reason: reason || '無',
        status: 'pending',
      }),
    })

    if (response.ok) {
      return `📅 請假申請已送出！\n\n姓名：${name}\n假別：${mapLeaveType(leaveType)}\n期間：${startDate} ~ ${endDate}\n原因：${reason || '無'}\n\n等待老闆審核...`
    }

    return '❌ 請假申請失敗，請稍後再試'
  } catch (error) {
    console.error('[LINE Webhook] Apply leave error:', error)
    return '❌ 請假申請失敗，請稍後再試'
  }
}

function mapLeaveType(type: string): string {
  const map: Record<string, string> = {
    '特休': 'annual',
    '年假': 'annual',
    '病假': 'sick',
    '事假': 'personal',
    '無薪假': 'unpaid',
    '休假': 'vacation',
  }
  return map[type] || 'personal'
}

function getLeaveTypeText(type: string): string {
  const map: Record<string, string> = {
    'annual': '特休',
    'sick': '病假',
    'personal': '事假',
    'unpaid': '無薪假',
    'vacation': '休假',
  }
  return map[type] || type
}

// ============ 選單功能 ============

function getQuickReplyItems(permission: PermissionLevel): QuickReplyItem[] {
  if (permission === 'admin') {
    return [
      { type: 'action', action: { type: 'message', label: '📦 今日訂單', text: '今日訂單' } },
      { type: 'action', action: { type: 'message', label: '💰 今日營收', text: '今日營收' } },
      { type: 'action', action: { type: 'message', label: '📊 庫存', text: '庫存' } },
      { type: 'action', action: { type: 'message', label: '🛵 待配送', text: '待配送' } },
      { type: 'action', action: { type: 'message', label: '💳 支票', text: '支票' } },
      { type: 'action', action: { type: 'message', label: '📅 休假', text: '休假' } },
    ]
  }
  if (permission === 'employee') {
    return [
      { type: 'action', action: { type: 'message', label: '📦 我的配送', text: '我的配送' } },
      { type: 'action', action: { type: 'message', label: '📅 請假', text: '請假' } },
      { type: 'action', action: { type: 'message', label: '📅 查休假', text: '查休假' } },
      { type: 'action', action: { type: 'message', label: '📞 聯絡老闆', text: '聯絡老闆' } },
      { type: 'action', action: { type: 'message', label: '📖 功能', text: '功能' } },
    ]
  }
  return [
    { type: 'action', action: { type: 'message', label: '📦 訂購瓦斯', text: '我要訂瓦斯' } },
    { type: 'action', action: { type: 'message', label: '💰 價格', text: '瓦斯價格' } },
    { type: 'action', action: { type: 'message', label: '📞 聯繫我們', text: '聯繫方式' } },
    { type: 'action', action: { type: 'message', label: '📖 功能', text: '功能' } },
  ]
}

function getAdminCarousel() {
  return {
    type: 'template',
    altText: '管理員功能選單',
    template: {
      type: 'carousel',
      columns: [
        {
          title: '📦 訂單管理',
          text: '查詢今日訂單與狀態',
          actions: [
            { type: 'message', label: '今日訂單', text: '今日訂單' },
            { type: 'message', label: '待配送', text: '待配送' },
            { type: 'message', label: '配送清單', text: '配送清單' }
          ]
        },
        {
          title: '💰 帳務',
          text: '營收、帳單、支票',
          actions: [
            { type: 'message', label: '今日營收', text: '今日營收' },
            { type: 'message', label: '待兌支票', text: '支票' },
            { type: 'message', label: '查帳單', text: '查帳單' }
          ]
        },
        {
          title: '📊 庫存&抄表',
          text: '庫存查詢與抄表紀錄',
          actions: [
            { type: 'message', label: '庫存', text: '庫存' },
            { type: 'message', label: '抄表', text: '抄表' },
            { type: 'message', label: '最近抄表', text: '最近抄表' }
          ]
        },
        {
          title: '👥 客戶管理',
          text: '客戶資料查詢',
          actions: [
            { type: 'message', label: '所有客戶', text: '客戶列表' },
            { type: 'message', label: '新增客戶', text: '新增客戶' },
          ]
        },
        {
          title: '📅 休假管理',
          text: '員工休假申請與審核',
          actions: [
            { type: 'message', label: '待審核假單', text: '待審核假單' },
            { type: 'message', label: '本月休假', text: '本月休假' },
            { type: 'message', label: '休假紀錄', text: '休假紀錄' }
          ]
        }
      ]
    }
  }
}

function getEmployeeCarousel() {
  return {
    type: 'template',
    altText: '員工功能選單',
    template: {
      type: 'carousel',
      columns: [
        {
          title: '🛵 配送任務',
          text: '查看今日配送任務',
          actions: [
            { type: 'message', label: '我的配送', text: '我的配送' },
            { type: 'message', label: '待配送', text: '待配送' },
            { type: 'message', label: '完成配送', text: '完成配送' }
          ]
        },
        {
          title: '📅 休假申請',
          text: '申請特休、病假、事假',
          actions: [
            { type: 'message', label: '我要請假', text: '請假' },
            { type: 'message', label: '查休假天數', text: '查休假' },
            { type: 'message', label: '待審核', text: '假單狀態' }
          ]
        },
        {
          title: '📞 聯絡方式',
          text: '聯繫老闆或同事',
          actions: [
            { type: 'message', label: '聯絡老闆', text: '聯絡老闆' },
            { type: 'message', label: '聯絡同事', text: '聯絡同事' },
            { type: 'message', label: '公司電話', text: '公司電話' }
          ]
        }
      ]
    }
  }
}

function createTextWithQuickReply(text: string, permission: PermissionLevel) {
  return {
    type: 'text',
    text,
    quickReply: { items: getQuickReplyItems(permission) }
  }
}

// GET - Health check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    message: 'LINE Bot Webhook',
    timestamp: new Date().toISOString(),
  })
}

// POST - LINE Webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')

    const data = JSON.parse(body)
    const events = data.events || []

    console.log(`[LINE Webhook] 收到 ${events.length} 個事件`)

    if (events.length === 0) {
      return NextResponse.json({ status: 'ok', message: 'No events' })
    }

    // 直接處理，不使用異步（確保消息被處理）
    for (const event of events) {
      const replyToken = event.replyToken
      const source = event.source || {}
      const userId = source.userId || ''
      const groupId = source.groupId || ''

      if (!replyToken) {
        continue
      }

      // 直接調用處理函數
      await processLineEvent(event, replyToken, userId, groupId)
    }

    return NextResponse.json({ status: 'ok', processed: events.length })
  } catch (error: any) {
    console.error('[LINE Webhook] Error:', error)
    return NextResponse.json({ status: 'error', message: error.message }, { status: 200 })
  }
}

// 處理單個事件的函數
async function processLineEvent(event: any, replyToken: string, userId: string, groupId: string) {
  const permission = getPermissionLevel(groupId, userId)
  const isAdmin = permission === 'admin'
  const isEmployee = permission === 'employee'
  const isAuthorizedGroup = isAdmin || isEmployee

  // 處理文字訊息
  if (event.type === 'message' && event.message?.type === 'text') {
    const userMessage = event.message.text.trim()
    const lowerMessage = userMessage.toLowerCase()

    console.log(`[LINE Webhook] [${permission.toUpperCase()}] 收到：「${userMessage}」`)

    // === 非授權群組回覆 ===
    if (!isAuthorizedGroup) {
      if (lowerMessage === '功能' || lowerMessage === '選單' || lowerMessage === 'menu') {
        await replyToLine(replyToken, [createTextWithQuickReply('您好！我是九九瓦斯行 AI 助手，以下可以幫您：', 'public')])
        return
      }
      if (lowerMessage.includes('訂') && lowerMessage.includes('瓦斯')) {
        await replyToLine(replyToken, [createTextWithQuickReply('請問要訂購多少公斤呢？\n5公斤、10公斤、20公斤', 'public')])
        return
      }
      if (lowerMessage.includes('價') || lowerMessage.includes('多少錢') || lowerMessage === '價格') {
        await replyToLine(replyToken, [createTextWithQuickReply('📋 瓦斯價格參考\n\n5公斤小罐：請電洽\n20公斤大罐：請電洽\n\n實際價格請電話確認，謝謝！', 'public')])
        return
      }
      if (lowerMessage.includes('電話') || lowerMessage.includes('聯絡') || lowerMessage.includes('地址') || lowerMessage.includes('營業')) {
        await replyToLine(replyToken, [createTextWithQuickReply('📞 九九瓦斯行\n\n電話：請電洽\n\n需要專人服務嗎？', 'public')])
        return
      }
      // 預設回覆
      const aiResponse = await getAIResponse(userMessage)
      await replyToLine(replyToken, [createTextWithQuickReply(aiResponse, 'public')])
      return
    }

    // === 管理員功能 ===
    if (isAdmin) {
      if (lowerMessage === '功能' || lowerMessage === '管理' || lowerMessage === 'admin' || lowerMessage === '選單') {
        await replyToLine(replyToken, [getAdminCarousel()])
        return
      }
      if (lowerMessage.includes('今日') && lowerMessage.includes('訂單')) {
        const response = await getTodayOrders()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
      if (lowerMessage.includes('營收') || lowerMessage === '今日收入' || lowerMessage === '收入') {
        const response = await getRevenue()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
      if (lowerMessage === '庫存' || lowerMessage.includes('庫存')) {
        const response = await getInventory()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
      if (lowerMessage.includes('待配送') || lowerMessage.includes('配送')) {
        const response = await getPendingDeliveries()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
      if (lowerMessage.includes('支票') || lowerMessage.includes('票據')) {
        const response = await getChecks()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
      if (lowerMessage.includes('抄表') || lowerMessage.includes('讀表')) {
        const phoneMatch = userMessage.match(/\d+/)
        const phone = phoneMatch ? phoneMatch[0] : undefined
        const response = await getMeterReadings(phone)
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
      if (lowerMessage.includes('帳單') || lowerMessage.includes('帳')) {
        const phoneMatch = userMessage.match(/\d+/)
        const response = phoneMatch
          ? await getCustomerBills(phoneMatch[0])
          : await getCustomerBills()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
      if (lowerMessage === '休假' || lowerMessage === '假單' || lowerMessage.includes('請假')) {
        await replyToLine(replyToken, [getAdminCarousel()])
        return
      }
      if (lowerMessage.includes('待審核') || lowerMessage.includes('待核准')) {
        const response = await getPendingLeaveRequests()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
      if (lowerMessage.includes('本月') && lowerMessage.includes('休假')) {
        const response = await getMonthlyLeaves()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
      if (lowerMessage.includes('休假紀錄') || lowerMessage.includes('休假記錄')) {
        const nameMatch = userMessage.match(/[\u4e00-\u9fa5]+/)
        const name = nameMatch ? nameMatch[0] : undefined
        const response = await getLeaveRecords(name)
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'admin')])
        return
      }
    }

    // === 員工功能 ===
    if (isEmployee) {
      if (lowerMessage === '功能' || lowerMessage === '員工' || lowerMessage === '選單') {
        await replyToLine(replyToken, [getEmployeeCarousel()])
        return
      }
      if (lowerMessage.includes('我的') && lowerMessage.includes('配送')) {
        const response = await getMyDeliveries()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'employee')])
        return
      }
      if (lowerMessage === '待配送' || lowerMessage.includes('待配送訂單')) {
        const response = await getPendingDeliveries()
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'employee')])
        return
      }
      if (lowerMessage === '請假' || lowerMessage === '我要請假' || lowerMessage.includes('假申請')) {
        const response = `📅 請假申請\n\n請輸入：請假 姓名 假別 開始日期 結束日期 原因\n\n假別選擇：\n• 特休（年假）\n• 病假\n• 事假\n• 無薪假\n\n範例：\n請假 張三 特休 2026-01-30 2026-02-01 春節返鄉`
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'employee')])
        return
      }
      if (lowerMessage.includes('查休假') || lowerMessage.includes('休假天數') || lowerMessage.includes('假單狀態')) {
        const nameMatch = userMessage.match(/[\u4e00-\u9fa5]+/)
        const name = nameMatch ? nameMatch[0] : undefined
        const response = await getLeaveRecords(name)
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'employee')])
        return
      }
      if (lowerMessage.includes('聯絡老闆') || lowerMessage.includes('聯繫老闆')) {
        await replyToLine(replyToken, [createTextWithQuickReply('📞 聯絡老闆\n\n請致電：請電洽', 'employee')])
        return
      }
      if (lowerMessage.startsWith('請假 ')) {
        const response = await applyLeave('', userMessage)
        await replyToLine(replyToken, [createTextWithQuickReply(response, 'employee')])
        return
      }
    }

    // === 預設回覆 ===
    const defaultText = isAdmin
      ? '👋 管理員您好！\n輸入「管理」開啟完整功能選單'
      : '👋 您好！\n輸入「功能」查看服務項目'
    const aiResponse = await getAIResponse(userMessage)
    await replyToLine(replyToken, [createTextWithQuickReply(aiResponse, permission)])
    return
  }

  // === 加入群組 ===
  if (event.type === 'join' || event.type === 'memberJoined') {
    const welcome = isAdmin
      ? '👋 管理員你好！\n輸入「管理」開啟管理員功能'
      : isEmployee
        ? '👋 員工你好！\n輸入「功能」開啟員工功能'
        : '你好！我是九九瓦斯行 AI 助手「BossJy-99」🤖\n輸入「功能」查看服務項目'
    await replyToLine(replyToken, [createTextWithQuickReply(welcome, permission)])
    return
  }

  // === 加好友 ===
  if (event.type === 'follow') {
    const welcome = '你好！歡迎加入九九瓦斯行！🎉\n我是 AI 助手「BossJy-99」，隨時為您服務！\n輸入「功能」查看所有服務'
    await replyToLine(replyToken, [createTextWithQuickReply(welcome, 'public')])
    return
  }
}
