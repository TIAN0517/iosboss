export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ''
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
const LINE_BOT_USER_ID = process.env.LINE_USER_ID || ''

// 群組權限配置
const GROUP_PERMISSIONS = {
  BOSS: { level: 100, name: '老闆', color: '#8b5cf6', features: ['all'] },
  ADMIN: { level: 90, name: '管理員', color: '#7c3aed', features: ['orders', 'inventory', 'delivery', 'customers', 'reports', 'knowledge', 'products'] },
  MANAGER: { level: 80, name: '經理', color: '#6d28d9', features: ['orders', 'inventory', 'delivery', 'customers', 'reports'] },
  DRIVER: { level: 50, name: '司機', color: '#3b82f6', features: ['delivery', 'my_tasks', 'complete_delivery'] },
  SALES: { level: 40, name: '業務', color: '#10b981', features: ['orders', 'customers', 'my_performance'] },
  CUSTOMER_SERVICE: { level: 30, name: '客服', color: '#f59e0b', features: ['orders', 'customers', 'knowledge', 'products'] },
  EMPLOYEE: { level: 20, name: '員工', color: '#6366f1', features: ['orders', 'inventory'] },
  GENERAL: { level: 10, name: '一般客戶', color: '#6b7280', features: ['order_gas', 'check_price', 'check_stock', 'contact', 'products'] },
}

// Quick Reply 按鈕
const QUICK_REPLIES: Record<string, any[]> = {
  BOSS: [
    { label: '📊 今日報表', text: '今日報表' },
    { label: '📦 所有訂單', text: '所有訂單' },
    { label: '💰 營收統計', text: '營收統計' },
    { label: '👥 客戶列表', text: '客戶列表' },
    { label: '🚚 配送狀態', text: '配送狀態' },
    { label: '📋 庫存概覽', text: '庫存概覽' },
    { label: '🛒 商品列表', text: '商品列表' },
  ],
  GENERAL: [
    { label: '🛒 訂瓦斯', text: '我要訂瓦斯' },
    { label: '💰 瓦斯價格', text: '瓦斯價格' },
    { label: '📦 庫存查詢', text: '庫存查詢' },
    { label: '🛒 商品目錄', text: '商品目錄' },
    { label: '❓ 幫助', text: '幫助' },
    { label: '📞 聯絡我們', text: '聯絡我們' },
  ],
}

interface FlexMessage {
  type: string
  altText: string
  contents: any
}

async function replyToLine(replyToken: string, messages: any[]): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return false
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    })
    return response.ok
  } catch (error) {
    console.error('[LINE] Reply error:', error)
    return false
  }
}

async function pushMessage(userId: string, messages: any[]): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) return false
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ to: userId, messages }),
    })
    return response.ok
  } catch (error) {
    console.error('[LINE] Push error:', error)
    return false
  }
}

// 創建商品 Flex Message Carousel
function createProductCarousel(products: any[]): FlexMessage {
  const columns = products.slice(0, 10).map((product, index) => ({
    thumbnailImageUrl: product.imageUrl || 'https://via.placeholder.com/240x240?text=No+Image',
    title: product.name.substring(0, 40),
    text: `💰 NT$ ${product.price.toLocaleString()}\n${(product.description || '').substring(0, 30)}`,
    actions: [
      { type: 'message', label: '🛒 訂購', text: `訂購 ${product.name}` },
      { type: 'uri', label: '📋 詳情', uri: `https://mama.tiankai.it.com/products/${product.id}` },
    ],
  }))

  return {
    type: 'flex',
    altText: '🛒 九九瓦斯行 - 商品目錄',
    contents: {
      type: 'carousel',
      contents: columns.map(col => ({
        type: 'bubble',
        hero: col.thumbnailImageUrl ? {
          type: 'image',
          url: col.thumbnailImageUrl,
          size: 'full',
          aspectRatio: '1:1',
          aspectMode: 'cover',
        } : undefined,
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: col.title, weight: 'bold', size: 'md', wrap: true },
            { type: 'text', text: col.text, size: 'sm', wrap: true, margin: 'sm' },
          ],
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          contents: col.actions.map(action => ({
            type: 'button',
            style: action.type === 'message' ? 'primary' : 'secondary',
            action: {
              type: action.type,
              label: action.label,
              text: action.text,
              uri: action.uri,
            },
          })),
        },
      })),
    },
  }
}

// 創建訂單確認 Flex Message
function createOrderConfirmFlex(orderInfo: any): FlexMessage {
  return {
    type: 'flex',
    altText: '📦 訂單確認',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: '🛒 訂單確認', weight: 'bold', size: 'lg' }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `商品名稱：${orderInfo.name}`, margin: 'sm' },
          { type: 'text', text: `💰 價格：NT$ ${orderInfo.price.toLocaleString()}`, margin: 'sm' },
          { type: 'text', text: '─────────────────', margin: 'md' },
          { type: 'text', text: '請輸入送貨地址：', margin: 'md' },
          { type: 'text', text: '範例：台北市信義區XX路XX號', size: 'xs', color: '#888888' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            action: { type: 'message', label: '✅ 確認訂購', text: `確認訂購 ${orderInfo.name}` },
          },
          { type: 'button', style: 'secondary', action: { type: 'message', label: '❌ 取消', text: '取消訂單' } },
        ],
      },
    },
  }
}

async function getProducts(category?: string): Promise<any[]> {
  try {
    const where: any = { isActive: true }
    if (category) {
      where.categoryId = category
    }
    const products = await db.product.findMany({
      where,
      take: 10,
      orderBy: { sortOrder: 'asc' },
    })
    return products
  } catch (error) {
    console.error('[LINE] Get products error:', error)
    return []
  }
}

async function getProductByName(name: string): Promise<any | null> {
  try {
    const product = await db.product.findFirst({
      where: {
        isActive: true,
        name: { contains: name },
      },
    })
    return product
  } catch (error) {
    return null
  }
}

async function getGroupPermission(groupId: string) {
  try {
    const group = await db.lineGroup.findUnique({ where: { groupId } })
    if (!group) return GROUP_PERMISSIONS.GENERAL

    const permissions = (group.permissions as string[]) || []
    const groupType = (group.groupType as string)?.toLowerCase() || 'general'

    if (permissions.includes('system_admin') && permissions.includes('manage_users')) {
      return GROUP_PERMISSIONS.BOSS
    }
    if (permissions.includes('manage_users') && permissions.includes('manage_costs')) {
      return GROUP_PERMISSIONS.ADMIN
    }
    if (permissions.includes('manage_deliveries') && permissions.includes('view_reports')) {
      return GROUP_PERMISSIONS.MANAGER
    }
    if (permissions.includes('manage_deliveries')) {
      return GROUP_PERMISSIONS.DRIVER
    }
    if (permissions.includes('view_reports')) {
      return GROUP_PERMISSIONS.SALES
    }
    if (permissions.includes('manage_customers')) {
      return GROUP_PERMISSIONS.CUSTOMER_SERVICE
    }
    if (permissions.includes('manage_orders')) {
      return GROUP_PERMISSIONS.EMPLOYEE
    }

    const typeMap: Record<string, any> = {
      'boss': GROUP_PERMISSIONS.BOSS, 'admin': GROUP_PERMISSIONS.ADMIN,
      'management': GROUP_PERMISSIONS.MANAGER, 'driver': GROUP_PERMISSIONS.DRIVER,
      'delivery': GROUP_PERMISSIONS.DRIVER, 'sales': GROUP_PERMISSIONS.SALES,
      'business': GROUP_PERMISSIONS.SALES, 'customer_service': GROUP_PERMISSIONS.CUSTOMER_SERVICE,
      'support': GROUP_PERMISSIONS.CUSTOMER_SERVICE, 'employee': GROUP_PERMISSIONS.EMPLOYEE,
    }
    return typeMap[groupType] || GROUP_PERMISSIONS.GENERAL
  } catch (error) {
    return GROUP_PERMISSIONS.GENERAL
  }
}

async function searchKnowledge(query: string): Promise<string[]> {
  try {
    const knowledge = await db.knowledgeBase.findMany({
      where: {
        isActive: true,
        OR: [{ title: { contains: query } }, { content: { contains: query } }],
      },
      take: 3,
      orderBy: { priority: 'desc' },
    })
    return knowledge.map(k => `[${k.category}] ${k.title}\n${k.content}`)
  } catch (error) {
    return []
  }
}

async function getInventoryStatus(): Promise<string> {
  try {
    const products = await db.product.findMany({ take: 5, orderBy: { createdAt: 'desc' } })
    if (!products || products.length === 0) return '📦 庫存狀態\n\n目前無商品資料'
    let text = '📦 庫存/商品狀態\n\n'
    for (const p of products) {
      text += `• ${p.name}: NT$ ${p.price.toLocaleString()}\n`
    }
    text += '\n（如需詳細資訊，請至後台查詢）'
    return text
  } catch (error) {
    return '📦 無法取得商品狀態'
  }
}

function getQuickReplies(permission: any): any[] {
  return QUICK_REPLIES[permission.name] || QUICK_REPLIES.GENERAL
}

function generateResponse(userMessage: string, permission: any): { text: string; flex?: FlexMessage; quickReplies: any[] } {
  const lowerMsg = userMessage.toLowerCase()
  let text = ''
  let flex: FlexMessage | undefined
  const quickReplies = getQuickReplies(permission)

  // 商品相關關鍵字
  const productKeywords = ['商品', '目錄', '產品', '商城', 'shop', 'product', 'catalog']
  const isProductQuery = productKeywords.some(kw => lowerMsg.includes(kw))
  const isAdminQuery = lowerMsg.includes('管理') || lowerMsg.includes('後台')

  // 知識庫優先（管理/商品查詢除外）
  // 省略知識庫檢查，直接處理主要功能

  // 商品目錄
  if (isProductQuery) {
    text = '🛒 九九瓦斯行 - 商品目錄\n\n點擊下方按鈕查看商品詳情'
    flex = {
      type: 'flex',
      altText: '📦 商品列表',
      contents: {
        type: 'carousel',
        contents: [
          {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: '🛒 瓦斯商品', weight: 'bold', size: 'lg' },
                { type: 'text', text: '點擊按鈕查看商品列表', margin: 'sm' },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'button', style: 'primary', action: { type: 'message', label: '📋 查看所有商品', text: '商品列表' } },
                { type: 'button', style: 'secondary', action: { type: 'message', label: '💰 價格表', text: '瓦斯價格' } },
              ],
            },
          },
        ],
      },
    }
    return { text, flex, quickReplies }
  }

  // 商品列表
  if (lowerMsg === '商品列表' || lowerMsg === 'list' || lowerMsg === 'products') {
    return { text: '📦 載入商品中...', flex, quickReplies }
  }

  // 訂購商品
  if (lowerMsg.startsWith('訂購 ') || lowerMsg.startsWith('我要訂 ') || lowerMsg.includes('訂瓦斯')) {
    const specs = lowerMsg.match(/(\d+)kg/) ? lowerMsg.match(/(\d+)kg/)[1] : null
    if (specs) {
      text = `✅ 為您訂購 ${specs}kg 瓦斯\n\n請提供送貨地址和聯繫電話，我們會盡快與您聯繫！`
    } else {
      text = '🛒 訂購瓦斯\n\n請輸入規格：\n• 4kg 瓦斯桶\n• 20kg 瓦斯桶\n• 50kg 瓦斯桶\n\n範例：「我要訂 20kg 瓦斯」'
    }
    return { text, quickReplies }
  }

  // 價格相關
  if (lowerMsg.match(/價格|多少錢|費用|price/)) {
    text = '💰 九九瓦斯行 - 價格參考\n\n'
    text += '• 4kg 桶裝瓦斯：NT$ 220\n'
    text += '• 10kg 桶裝瓦斯：NT$ 360\n'
    text += '• 16kg 桶裝瓦斯：NT$ 550\n'
    text += '• 20kg 標準桶裝瓦斯：NT$ 620\n'
    text += '• 20kg 高級桶裝瓦斯：NT$ 730\n\n'
    text += '（實際價格以當日為準，歡迎來電確認）'
  }
  // 庫存相關
  else if (lowerMsg.match(/庫存|庫存查詢|inventory|stock/)) {
    text = getInventoryStatus()
  }
  // 聯絡我們
  else if (lowerMsg.match(/聯絡|聯繫|contact|電話/)) {
    text = '📞 聯繫九九瓦斯行\n\n'
    text += '電話：請致電各分店\n'
    text += '營業時間：08:00 - 20:00\n\n'
    text += '歡迎使用 LINE 線上訂購服務！'
  }
  // 幫助
  else if (lowerMsg.match(/幫助|說明|怎麼用|help/)) {
    text = `🙋 九九瓦斯行客服 - ${permission.name}版\n\n`
    text += '可用指令：\n'
    text += '• 「我要訂瓦斯」- 訂購瓦斯\n'
    text += '• 「瓦斯價格」- 查詢價格\n'
    text += '• 「商品目錄」- 瀏覽商品\n'
    text += '• 「庫存」- 庫存查詢\n'
    text += '• 「聯絡我們」- 聯繫方式'
  }
  // 預設
  else {
    const responses = ['收到！感謝您的留言。', '您好！我們會盡快回覆您。', '感謝您的詢問，請稍候。', '已收到您的訊息！']
    text = responses[Math.floor(Math.random() * responses.length)]
  }

  return { text, flex, quickReplies }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('X-Line-Signature') || ''

    if (LINE_CHANNEL_SECRET && process.env.LINE_SKIP_SIGNATURE_VERIFY !== 'true') {
      if (!signature) {
        return NextResponse.json({ error: '缺少簽名' }, { status: 401 })
      }
    }

    const data = JSON.parse(body)
    const events = data.events || []

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userMessage = event.message.text.trim()
        const userId = event.source?.userId || 'unknown'
        const groupId = event.source?.groupId || null
        const replyToken = event.replyToken

        console.log(`[LINE] 收到: "${userMessage}" from ${userId}`)

        const permission = groupId ? await getGroupPermission(groupId) : GROUP_PERMISSIONS.GENERAL

        // 商品列表特殊處理
        if (userMessage === '商品列表' || userMessage === 'list' || userMessage === 'products') {
          const products = await getProducts()
          if (products.length > 0) {
            const flex = createProductCarousel(products)
            const messages = [flex, { type: 'text', text: `找到 ${products.length} 項商品，點擊即可訂購！` }]
            await replyToLine(replyToken, messages)
          } else {
            await replyToLine(replyToken, [{ type: 'text', text: '目前無商品資料' }])
          }
          continue
        }

        const { text, flex, quickReplies } = generateResponse(userMessage, permission)

        const messages: any[] = [{ type: 'text', text }]
        if (flex) {
          messages.push(flex)
        }
        if (quickReplies.length > 0) {
          messages[0].quickReply = { items: quickReplies.map(qr => ({ type: 'action', action: { type: 'message', label: qr.label, text: qr.text } })) }
        }

        await replyToLine(replyToken, messages)
        console.log(`[LINE] 回覆: ${text.substring(0, 50)}...`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[LINE Webhook] 錯誤:', error)
    return NextResponse.json({ error: `Webhook 處理失敗: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}
