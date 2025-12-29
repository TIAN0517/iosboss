/**
 * 統一 AI 助手服務
 * 整合語音助手、LINE Bot、Web 聊天的 AI 處理
 * 增强版：支持权限系统和商业级功能
 */

import { db } from './db'
import { BossJy99Assistant } from './boss-jy-99-api'
import { LineBotIntentAnalyzer, LineIntent, GroupType } from './line-bot-intent'
import { LineBotResponseGenerator } from './line-bot-response'
import { LineGroupManager } from './line-group-manager'
import { getLineCustomerLinker } from './line-customer-linker'
import {
  detectScheduleSheet,
  parseScheduleSheet,
  saveScheduleSheet,
} from './schedule-parser'
import { sendScheduleNotification } from './notification-service'
import {
  getUserContext,
  hasPermission,
  isAdmin,
  getPermissionError,
  type UserContext,
  type Permission,
} from './permission-system'

// ========================================
// 訊息上下文
// ========================================

export interface MessageContext {
  platform: 'web' | 'line' | 'voice'
  userId?: string
  groupId?: string
  groupType?: GroupType
  conversationHistory?: Message[]
  userRole?: string
  // 新增：用户权限上下文
  userContext?: UserContext
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface AIResponse {
  text: string
  intent?: LineIntent
  flex?: any
  quickReply?: any
  actions?: any[]
  shouldSpeak?: boolean
}

// ========================================
// 統一 AI 助手類別
// ========================================

export class UnifiedAIAssistant {
  private bossJy99: BossJy99Assistant
  private intentAnalyzer: LineBotIntentAnalyzer
  private responseGenerator: LineBotResponseGenerator
  private groupManager: LineGroupManager
  private customerLinker = getLineCustomerLinker()

  // 對話歷史（按用戶ID存儲）
  private conversationHistory: Map<string, Message[]> = new Map()

  constructor() {
    this.bossJy99 = new BossJy99Assistant()
    this.intentAnalyzer = new LineBotIntentAnalyzer()
    this.responseGenerator = new LineBotResponseGenerator()
    this.groupManager = new LineGroupManager()
  }

  /**
   * 處理訊息（統一入口 - 增强版）
   * 集成权限系统和万能搜索
   */
  async processMessage(
    message: string,
    context: MessageContext
  ): Promise<AIResponse> {
    const {
      platform,
      groupId,
      groupType,
      userId,
    } = context

    // 1. 加載用戶權限上下文
    let userContext: UserContext
    if (!context.userContext) {
      userContext = await getUserContext(groupId, userId)
      context.userContext = userContext
    } else {
      userContext = context.userContext
    }

    // 2. 識別群組類型
    let finalGroupType = groupType as GroupType
    if (!finalGroupType) {
      finalGroupType = userContext.groupType === 'general' ? GroupType.GENERAL :
                      userContext.groupType === 'admin' ? GroupType.ADMIN :
                      userContext.groupType === 'driver' ? GroupType.DRIVER :
                      userContext.groupType === 'sales' ? GroupType.SALES :
                      userContext.groupType === 'staff' ? GroupType.STAFF :
                      userContext.groupType === 'cs' ? GroupType.CS :
                      GroupType.GENERAL
    }

    // 3. 老板專屬：萬能搜索（權限：search_all）
    if (hasPermission(userContext, 'search_all')) {
      const searchResult = await this.executeUniversalSearch(message, userContext)
      if (searchResult) {
        return searchResult
      }
    }

    // 4. 分析意圖
    const intentResult = await this.intentAnalyzer.analyze(message, finalGroupType)

    // 5. 檢查權限
    const requiredPermission = this.getRequiredPermission(intentResult.intent)
    if (requiredPermission && !hasPermission(userContext, requiredPermission)) {
      return {
        text: getPermissionError(userContext, requiredPermission),
        intent: intentResult.intent,
      }
    }

    // 6. 執行意圖操作
    const actionResponse = await this.executeIntent(intentResult, context)

    // 7. 生成回應
    const lineResponse = this.responseGenerator.generateResponse(
      intentResult.intent,
      intentResult.entities,
      actionResponse,
      finalGroupType
    )

    // 8. 記錄對話歷史
    this.recordToHistory(userId || 'anonymous', {
      role: 'user',
      content: message,
      timestamp: new Date(),
    })

    this.recordToHistory(userId || 'anonymous', {
      role: 'assistant',
      content: actionResponse || lineResponse.text || '',
      timestamp: new Date(),
    })

    // 7. 返回統一格式回應
    return {
      text: actionResponse || lineResponse.text || '',
      intent: intentResult.intent,
      flex: lineResponse.flex,
      quickReply: lineResponse.quickReply,
      actions: intentResult.suggestedResponse ? [{ type: 'info', data: intentResult.suggestedResponse }] : undefined,
      shouldSpeak: platform === 'voice' || platform === 'web', // 語音和 Web 需要語音輸出
    }
  }

  /**
   * 處理語音訊息（語音轉文字後處理）
   * 支持 Deepgram ASR + ElevenLabs/Azure/GLM TTS（多提供商輪替）
   */
  async processVoiceMessage(
    audioUrl: string,
    context: MessageContext
  ): Promise<AIResponse & { audioResponse?: Buffer }> {
    try {
      console.log('[Voice] Starting voice message processing...')
      console.log('[Voice] Audio URL:', audioUrl?.substring(0, 60) + '...')

      // 動態導入語音服務
      const {
        transcribeLineAudioWithDeepgram,
        synthesizeWithElevenLabs,
        synthesizeWithAzure,
      } = await import('./voice-service')

      // 1. ASR: 語音轉文字
      console.log('[Voice] Step 1: Starting ASR (Deepgram)...')
      const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
      const asrResult = await transcribeLineAudioWithDeepgram(audioUrl, lineToken)

      console.log('[Voice] ASR completed:', {
        text: asrResult.text,
        confidence: asrResult.confidence,
      })

      if (!asrResult.text || asrResult.text.trim().length === 0) {
        console.log('[Voice] Empty transcript, returning error')
        return {
          text: '（無法識別語音內容，請重試或使用文字輸入）',
          shouldSpeak: false,
        }
      }

      console.log('[Voice] Transcript:', asrResult.text)

      // 2. AI: 處理文字，獲取回復
      console.log('[Voice] Step 2: Processing with AI...')
      const aiResponse = await this.processMessage(asrResult.text, {
        ...context,
        platform: 'voice',
      })

      console.log('[Voice] AI response:', aiResponse.text?.substring(0, 50) + '...')

      // 3. TTS: 如果需要語音回復，生成音頻（多提供商輪替：ElevenLabs → Azure）
      let audioResponse: Buffer | undefined
      if (aiResponse.shouldSpeak && aiResponse.text) {
        console.log('[Voice] Step 3: Starting TTS (ElevenLabs)...')
        try {
          // 優先使用 ElevenLabs（最高品質）
          console.log('[Voice] TTS: Trying ElevenLabs...')
          const ttsResult = await synthesizeWithElevenLabs(aiResponse.text)
          audioResponse = ttsResult.audioBuffer
          console.log('[Voice] TTS: ElevenLabs success, from cache:', ttsResult.fromCache)
        } catch (elevenLabsError) {
          console.warn('[Voice] ElevenLabs failed, trying Azure:', elevenLabsError)
          try {
            // 降級到 Azure TTS
            const ttsResult = await synthesizeWithAzure(aiResponse.text)
            audioResponse = ttsResult.audioBuffer
            console.log('[Voice] TTS: Azure success, from cache:', ttsResult.fromCache)
          } catch (azureError) {
            console.warn('[Voice] Azure TTS also failed, returning text only:', azureError)
            // TTS 完全失敗時仍然返回文字
          }
        }
      }

      console.log('[Voice] Processing complete!')
      return {
        ...aiResponse,
        audioResponse,
      }
    } catch (error) {
      console.error('[Voice] processVoiceMessage error:', error)

      // 降級：返回錯誤提示
      return {
        text: '語音處理暫時無法使用，請稍後再試或使用文字輸入。',
        shouldSpeak: false,
      }
    }
  }

  /**
   * 執行意圖對應的操作
   */
  private async executeIntent(
    intentResult: { intent: LineIntent; entities: any; confidence: number },
    context: MessageContext
  ): Promise<string | null> {
    const { intent, entities } = intentResult

    switch (intent) {
      case LineIntent.CREATE_ORDER:
        return await this.executeCreateOrder(entities, context)

      case LineIntent.CHECK_ORDER:
        return await this.executeCheckOrder(entities, context)

      case LineIntent.CHECK_INVENTORY:
        return await this.executeCheckInventory(context)

      case LineIntent.CHECK_PRICE:
        return await this.executeCheckPrice(context)

      case LineIntent.CREATE_CUSTOMER:
        return await this.executeCreateCustomer(entities, context)

      case LineIntent.SEARCH_CUSTOMER:
        return await this.executeSearchCustomer(entities, context)

      case LineIntent.DRIVER_MY_TASKS:
        return await this.executeGetDriverTasks(context)

      case LineIntent.DRIVER_COMPLETE:
        return await this.executeDriverComplete(entities, context)

      case LineIntent.ADMIN_REPORT:
        return await this.executeGetAdminReport(context)

      case LineIntent.CHECK_REVENUE:
        return await this.executeCheckRevenue(context)

      case LineIntent.SUBMIT_SCHEDULE:
        return await this.executeSubmitSchedule(entities, context)

      case LineIntent.SHEET_STATUS:
        return await this.executeSheetStatus(context)

      case LineIntent.APPROVE_SCHEDULE:
        return await this.executeApproveSchedule(entities, context)

      case LineIntent.GREETING:
        return `你好！我是九九瓦斯行的助手～ 💚\n\n可以幫您：\n• 訂瓦斯\n• 查庫存\n• 查訂單\n• 搜尋客戶\n\n需要什麼幫忙嗎？`

      case LineIntent.HELP:
        return `📖 **功能說明**\n\n🛒 **訂購瓦斯**\n「我要訂 20kg 瓦斯 2桶」\n\n📦 **查詢功能**\n「庫存」- 查看瓦斯庫存\n「價格」- 查看瓦斯價格\n「任務」- 查看配送任務\n\n👥 **客戶管理**\n「找客戶 [名字/電話]」- 搜尋客戶\n「加客戶 名字 電話 地址」- 新增客戶\n\n💪 **其他功能**\n「報表」- 查看營運報表（管理群）\n「完成 [訂單號]」- 標記配送完成`

      default:
        return null
    }
  }

  /**
   * 執行創建訂單
   */
  private async executeCreateOrder(data: any, context: MessageContext): Promise<string> {
    try {
      const { size, quantity, phone } = data.entities || {}

      // 1. Find customer by LINE userId or phone
      let customer
      if (context.userId) {
        customer = await this.customerLinker.getCustomerByLineId(context.userId)
      }
      if (!customer && phone) {
        customer = await db.customer.findUnique({ where: { phone } })
      }

      // 2. If no customer, prompt for account linking
      if (!customer) {
        return '💁‍♀️ 為了提供更好的服務，請先綁定您的手機號碼。\n\n請回覆「綁定手機 09xxxxxxxxx」'
      }

      // 3. Find product by size
      const product = await db.product.findFirst({
        where: {
          capacity: size || '20kg',
          isActive: true,
        },
        include: { category: true },
      })

      if (!product) {
        return `⚠️ 抱歉，我們沒有 ${size || '20kg'} 的瓦斯規格。\n\n目前有：4kg, 20kg, 50kg`
      }

      // 4. Check inventory
      const inventory = await db.inventory.findUnique({
        where: { productId: product.id },
      })

      const qty = quantity || 1
      if (!inventory || inventory.quantity < qty) {
        return `⚠️ 抱歉，${product.capacity} 瓦斯目前庫存不足。\n\n現有庫存：${inventory?.quantity || 0} 桶\n\n請稍後再試或致電客服。`
      }

      // 5. Calculate pricing
      const customerGroup = customer.groupId
        ? await db.customerGroup.findUnique({ where: { id: customer.groupId } })
        : null
      const discount = customerGroup?.discount || 0
      const unitPrice = product.price * (1 - discount)
      const subtotal = unitPrice * qty

      // 6. Generate order number
      const orderNo = `SO${Date.now().toString().slice(-8)}`

      // 7. Create order with transaction
      const order = await db.$transaction(async (tx) => {
        // Create order
        const newOrder = await tx.gasOrder.create({
          data: {
            orderNo,
            customerId: customer.id,
            orderDate: new Date(),
            deliveryDate: new Date(),
            status: 'pending',
            subtotal,
            discount: subtotal * discount,
            deliveryFee: 0,
            total: subtotal,
            note: `來自 ${context.platform} 的訂單`,
          },
        })

        // Create order item
        await tx.gasOrderItem.create({
          data: {
            orderId: newOrder.id,
            productId: product.id,
            quantity: qty,
            unitPrice,
            subtotal,
          },
        })

        // Update inventory
        await tx.inventory.update({
          where: { productId: product.id },
          data: { quantity: { decrement: qty } },
        })

        // Create inventory transaction
        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'delivery',
            quantity: -qty,
            quantityBefore: inventory.quantity,
            quantityAfter: inventory.quantity - qty,
            reason: `訂單 ${orderNo}`,
          },
        })

        return newOrder
      })

      // 8. Format response
      const statusEmoji = order.status === 'pending' ? '⏳' : '✅'
      return `${statusEmoji} 訂單已建立！

📋 訂單編號：${orderNo}
👤 客戶：${customer.name}
📦 商品：${product.name}
📊 數量：${qty} 桶
💰 金額：NT$${subtotal.toLocaleString()}
📅 預計配送：今日下午

感謝您的訂購！`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeCreateOrder error:', error)
      return '⚠️ 建立訂單時發生錯誤，請稍後再試或致電客服。'
    }
  }

  /**
   * 執行查詢訂單
   */
  private async executeCheckOrder(data: any, context: MessageContext): Promise<string> {
    try {
      // 1. Get customer by LINE userId
      const customer = context.userId
        ? await this.customerLinker.getCustomerByLineId(context.userId)
        : null

      if (!customer) {
        return '💁‍♀️ 請先綁定您的帳戶才能查詢訂單喔！\n\n請回覆「綁定手機 09xxxxxxxxx」'
      }

      // 2. Fetch recent orders (last 5)
      const orders = await db.gasOrder.findMany({
        where: { customerId: customer.id },
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

      if (orders.length === 0) {
        return `📋 ${customer.name} 您目前沒有訂單記錄。\n\n需要訂瓦斯嗎？請說「我要訂瓦斯」`
      }

      // 3. Format orders with status emojis
      const statusEmojis: Record<string, string> = {
        pending: '⏳',
        delivering: '🚚',
        completed: '✅',
        cancelled: '❌',
      }

      const orderList = orders.map((order, i) => {
        const statusEmoji = statusEmojis[order.status] || '📋'
        const itemSummary = order.items.map(item => `${item.product?.name || '瓦斯'} x${item.quantity}`).join(', ')
        const dateStr = new Date(order.createdAt).toLocaleDateString('zh-TW')

        return `${statusEmoji} 訂單 #${i + 1}
編號：${order.orderNo}
日期：${dateStr}
商品：${itemSummary}
金額：NT$${order.total.toLocaleString()}
狀態：${order.status === 'pending' ? '待處理' : order.status === 'delivering' ? '配送中' : order.status === 'completed' ? '已完成' : '已取消'}`
      })

      return `📋 ${customer.name} 的訂單記錄 (${orders.length} 筆)

${orderList.join('\n\n---\n\n')}

還有其他需要嗎？`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeCheckOrder error:', error)
      return '⚠️ 查詢訂單時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行查詢庫存
   */
  private async executeCheckInventory(context: MessageContext): Promise<string> {
    try {
      // 1. Fetch all inventory with products
      const inventories = await db.inventory.findMany({
        include: { product: true },
        where: { product: { isActive: true } },
      })

      // 2. Filter and group gas products only
      const gasInventories = inventories.filter(inv => {
        const category = inv.product?.category?.name || ''
        const capacity = inv.product?.capacity || ''
        return category === '瓦斯' || capacity.includes('kg')
      })

      if (gasInventories.length === 0) {
        return '📦 目前沒有庫存資訊。\n\n請致電客服詢問。'
      }

      // 3. Format inventory with status indicators
      const lines = gasInventories.map(inv => {
        const status = inv.quantity <= inv.minStock ? '⚠️' : '✅'
        const name = inv.product?.capacity || inv.product?.name || '瓦斯'
        return `${status} ${name}: ${inv.quantity} 桶${inv.quantity <= inv.minStock ? ' (庫存不足)' : ''}`
      })

      // 4. Calculate total gas inventory
      const totalGas = gasInventories.reduce((sum, inv) => sum + inv.quantity, 0)
      const lowStockCount = gasInventories.filter(inv => inv.quantity <= inv.minStock).length

      return `📦 目前瓦斯庫存 (總計 ${totalGas} 桶)

${lines.join('\n')}

${lowStockCount > 0 ? `⚠️ 注意：${lowStockCount} 項產品庫存不足，請及時補貨！` : '✅ 所有產品庫存充足'}

需要訂購嗎？請說「我要訂瓦斯」`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeCheckInventory error:', error)
      return '⚠️ 查詢庫存時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行查詢司機任務
   */
  private async executeGetDriverTasks(context: MessageContext): Promise<string> {
    try {
      // Staff, Driver, and Admin groups can access
      if (context.groupType !== GroupType.STAFF &&
          context.groupType !== GroupType.DRIVER &&
          context.groupType !== GroupType.ADMIN) {
        return '⛔ 此功能僅供員工使用。'
      }

      // Get pending/delivering orders
      const tasks = await db.gasOrder.findMany({
        where: { status: { in: ['pending', 'delivering'] } },
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      })

      if (tasks.length === 0) {
        return '📋 目前沒有待配送的任務。\n\n好好休息！☕'
      }

      // Format tasks
      const taskList = tasks.slice(0, 10).map((task, i) => {
        const itemSummary = task.items.map(item => `${item.product?.capacity || '瓦斯'} x${item.quantity}`).join(', ')
        const statusEmoji = task.status === 'pending' ? '⏳' : '🚚'
        return `${statusEmoji} 任務 ${i + 1}
客戶：${task.customer.name}
電話：${task.customer.phone}
地址：${task.customer.address}
商品：${itemSummary}
訂單編號：${task.orderNo}`
      })

      return `🚚 今日配送任務 (${tasks.length} 單)

${taskList.join('\n\n---\n\n')}

${tasks.length > 10 ? `...還有 ${tasks.length - 10} 單\n\n` : ''}安全行駛！🛵`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeGetDriverTasks error:', error)
      return '⚠️ 查詢任務時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行查詢管理報表
   */
  private async executeGetAdminReport(context: MessageContext): Promise<string> {
    try {
      // Only for admin groups
      if (context.groupType !== GroupType.ADMIN) {
        return '⛔ 此功能僅供管理員使用。'
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get today's orders
      const orders = await db.gasOrder.findMany({
        where: { createdAt: { gte: today } },
        include: { customer: true },
      })

      // Calculate statistics
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
      const completedCount = orders.filter(o => o.status === 'completed').length
      const pendingCount = orders.filter(o => o.status === 'pending').length
      const deliveringCount = orders.filter(o => o.status === 'delivering').length
      const uniqueCustomers = new Set(orders.map(o => o.customerId)).size

      // Get total customers count
      const totalCustomers = await db.customer.count()

      // Get inventory summary
      const inventories = await db.inventory.findMany({
        include: { product: true },
      })
      const totalInventory = inventories.reduce((sum, inv) => sum + inv.quantity, 0)
      const lowStockCount = inventories.filter(inv => inv.quantity <= inv.minStock).length

      // Format report
      return `📊 今日營運報表

📦 訂單數：${orders.length} 單
  ✅ 已完成：${completedCount}
  🚚 配送中：${deliveringCount}
  ⏳ 待處理：${pendingCount}

💰 營業額：NT$${totalRevenue.toLocaleString()}

👥 客戶數：${uniqueCustomers} 人 (總客戶：${totalCustomers} 人)

📦 庫存：${totalInventory} 桶${lowStockCount > 0 ? ` (⚠️ ${lowStockCount} 項低庫存)` : ''}

⏰ 更新時間：${new Date().toLocaleString('zh-TW')}

還需要其他報表嗎？`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeGetAdminReport error:', error)
      return '⚠️ 生成報表時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行查詢價格
   */
  private async executeCheckPrice(context: MessageContext): Promise<string> {
    try {
      const products = await db.product.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { capacity: 'asc' },
      })

      if (products.length === 0) {
        return '💰 目前沒有瓦斯價格資訊。請致電客服詢問。'
      }

      const lines = products.map(p => {
        const price = p.price ? `NT$${p.price.toLocaleString()}` : '詢問價格'
        return `• ${p.name || p.capacity || '瓦斯'}：${price}`
      })

      return `💰 **瓦斯價格表**

${lines.join('\n')}

⏰ 更新時間：${new Date().toLocaleDateString('zh-TW')}

需要訂購瓦斯嗎？請說「我要訂瓦斯」`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeCheckPrice error:', error)
      return '⚠️ 查詢價格時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行創建客戶
   */
  private async executeCreateCustomer(entities: any, context: MessageContext): Promise<string> {
    try {
      const { phone, customer: customerName, address } = entities

      if (!phone) {
        return '📝 **新增客戶**\n\n請提供以下資訊：\n• 客戶姓名\n• 電話號碼（必填）\n• 地址\n\n格式：加客戶 [姓名] [電話] [地址]\n例：加客戶 王小姐 0912345678 台中市xx路xx號'
      }

      // Check if customer already exists
      const existing = await db.customer.findUnique({ where: { phone } })
      if (existing) {
        return `⚠️ 電話 ${phone} 已經是客戶了！\n\n客戶：${existing.name}\n地址：${existing.address || '未設定'}`
      }

      const name = customerName || '客戶'
      const newCustomer = await db.customer.create({
        data: {
          name,
          phone,
          address: address || '',
          paymentType: 'cash',
          isActive: true,
        },
      })

      return `✅ **客戶已新增！**

👤 姓名：${newCustomer.name}
📱 電話：${newCustomer.phone}
📍 地址：${newCustomer.address || '未設定'}

現在可以使用這位客戶的電話來訂購瓦斯了！`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeCreateCustomer error:', error)
      return '⚠️ 新增客戶時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行搜尋客戶
   */
  private async executeSearchCustomer(entities: any, context: MessageContext): Promise<string> {
    try {
      const { phone, customer: searchQuery } = entities

      if (!phone && !searchQuery) {
        return '🔍 **搜尋客戶**\n\n請提供：\n• 電話號碼\n• 或客戶姓名\n\n例：找客戶 0912345678\n例：找客戶 王小姐'
      }

      let customers

      if (phone) {
        // Search by phone
        customers = await db.customer.findMany({
          where: { phone: { contains: phone }, isActive: true },
          take: 5,
        })
      } else {
        // Search by name
        customers = await db.customer.findMany({
          where: { name: { contains: searchQuery }, isActive: true },
          take: 5,
        })
      }

      if (customers.length === 0) {
        return `🔍 找不到符合的客戶。\n\n請確認：\n• 電話/姓名是否正確\n• 或使用「加客戶」新增客戶`
      }

      if (customers.length === 1) {
        const c = customers[0]
        return `👤 **客戶資料**

姓名：${c.name}
電話：${c.phone}
地址：${c.address || '未設定'}
付款方式：${c.paymentType === 'cash' ? '現金' : '月結'}
狀態：${c.isActive ? '啟用' : '停用'}

需要訂購瓦斯嗎？請說「訂瓦斯 [規格] [數量] 給 ${c.name}」`
      }

      const list = customers.map(c =>
        `• ${c.name} - ${c.phone} - ${c.address || '無地址'}`
      ).join('\n')

      return `🔍 **找到 ${customers.length} 位客戶**

${list}

${customers.length >= 5 ? '\n僅顯示前 5 筆，請提供更精確的搜尋條件。' : ''}`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeSearchCustomer error:', error)
      return '⚠️ 搜尋客戶時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行完成配送
   */
  private async executeDriverComplete(entities: any, context: MessageContext): Promise<string> {
    try {
      const { orderNo } = entities

      if (!orderNo) {
        return '✅ **完成配送**\n\n請提供訂單編號。\n\n格式：完成 [訂單編號]\n例：完成 SO12345678'
      }

      // Find order by orderNo
      const order = await db.gasOrder.findFirst({
        where: {
          orderNo: { contains: orderNo.toUpperCase() },
          status: { in: ['pending', 'delivering'] },
        },
        include: { customer: true },
      })

      if (!order) {
        return `⚠️ 找不到訂單：${orderNo}\n\n可能原因：\n• 訂單編號錯誤\n• 訂單已完成或不存在\n\n請說「任務」查看待配送列表`
      }

      // Update order status
      await db.gasOrder.update({
        where: { id: order.id },
        data: { status: 'completed', deliveryDate: new Date() },
      })

      return `✅ **配送已完成！**

📋 訂單編號：${order.orderNo}
👤 客戶：${order.customer.name}
📍 地址：${order.customer.address || '無地址'}
💰 金額：NT$${order.total?.toLocaleString() || '0'}

感謝您的辛苦工作！💪`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeDriverComplete error:', error)
      return '⚠️ 完成配送時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行查詢營收
   */
  private async executeCheckRevenue(context: MessageContext): Promise<string> {
    try {
      // Only for admin and staff groups
      if (context.groupType !== GroupType.ADMIN && context.groupType !== GroupType.STAFF) {
        return '⛔ 此功能僅供員工使用。'
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

      // Get today's revenue
      const todayOrders = await db.gasOrder.findMany({
        where: { createdAt: { gte: today } },
      })
      const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0)

      // Get this month's revenue
      const monthOrders = await db.gasOrder.findMany({
        where: { createdAt: { gte: thisMonth } },
      })
      const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0)

      // Get yesterday's for comparison
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)

      const yesterdayEnd = new Date(today)
      yesterdayEnd.setHours(0, 0, 0, 0)

      const yesterdayOrders = await db.gasOrder.findMany({
        where: {
          createdAt: {
            gte: yesterday,
            lt: yesterdayEnd,
          },
        },
      })
      const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + (o.total || 0), 0)

      const growth = yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(1)
        : '0.0'

      return `💰 **營收報告**

📅 **今日營收**：NT$${todayRevenue.toLocaleString()}
📊 **本月營收**：NT$${monthRevenue.toLocaleString()}
📉 **昨日營收**：NT$${yesterdayRevenue.toLocaleString()}

📈 **成長率**：${parseFloat(growth) >= 0 ? '+' : ''}${growth}%

${parseFloat(growth) >= 0 ? '🌟 比昨天好！繼續加油！' : '💪 明天會更好！'}`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeCheckRevenue error:', error)
      return '⚠️ 查詢營收時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行提交休假表
   */
  private async executeSubmitSchedule(entities: any, context: MessageContext): Promise<string> {
    try {
      const { text } = entities

      if (!text || !detectScheduleSheet(text)) {
        return `📋 **休假表格式說明**

請按照以下格式提交休假表：

114年12月

吉安站
阿銘 12/12、12/19、12/26、12/30
阿樂 12/7（半天上午）12/10、12/16 12/23

美崙站
小魏 12/2、12/3、12/15、12/29
美美 12/6、12/7、12/13、12/27（半天）

• 站點名稱以「站」結尾
• 日期格式：月/日（如 12/12）
• 半天標記：（半天上午）或（半天下午）

請將完整的休假表內容發送過來！`
      }

      // 解析休假表
      const parsed = parseScheduleSheet(text)
      if (!parsed) {
        return '⚠️ 解析休假表失敗，請確認格式正確。'
      }

      // 檢查是否已存在相同年月的休假表
      const existing = await db.scheduleSheet.findUnique({
        where: {
          year_month: {
            year: parsed.year,
            month: parsed.month,
          },
        },
      })

      if (existing) {
        // 更新現有休假表
        await db.scheduleStation.deleteMany({
          where: { sheetId: existing.id },
        })

        await db.scheduleSheet.update({
          where: { id: existing.id },
          data: {
            rawText: parsed.rawText,
            status: 'pending',
            submittedBy: context.userId,
            submittedAt: new Date(),
          },
        })

        // 保存新的休假資料
        await saveScheduleSheet(parsed)

        const totalDays = parsed.stations.reduce((sum, s) => sum + s.employees.reduce((e, emp) => e + emp.dates.length, 0), 0)

        return `✅ **休假表已更新！**

📅 年月：${parsed.year}年${parsed.month}月
📊 總休假天數：${totalDays} 天
🏢 站點數：${parsed.stations.length} 個
👥 員工數：${parsed.stations.reduce((sum, s) => sum + s.employees.length, 0)} 人

狀態：待審核 ⏳

請聯絡老闆娘審核。`
      }

      // 保存新的休假表
      const saved = await saveScheduleSheet({
        ...parsed,
        submittedBy: context.userId,
      } as any)

      const totalDays = parsed.stations.reduce((sum, s) => sum + s.employees.reduce((e, emp) => e + emp.dates.length, 0), 0)

      // 發送通知到 LINE 管理員群組和 APP
      await sendScheduleNotification({
        type: 'schedule_submitted',
        sheetId: saved.id,
        year: parsed.year,
        month: parsed.month,
        submittedBy: context.userId,
        status: 'pending',
      })

      return `✅ **休假表已提交！**

📅 年月：${parsed.year}年${parsed.month}月
📊 總休假天數：${totalDays} 天
🏢 站點數：${parsed.stations.length} 個
👥 員工數：${parsed.stations.reduce((sum, s) => sum + s.employees.length, 0)} 人

狀態：待審核 ⏳

已通知老闆娘審核。`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeSubmitSchedule error:', error)
      return '⚠️ 提交休假表時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行查詢休假表狀態
   */
  private async executeSheetStatus(context: MessageContext): Promise<string> {
    try {
      // 獲取最新的休假表
      const sheets = await db.scheduleSheet.findMany({
        orderBy: { submittedAt: 'desc' },
        take: 3,
        include: {
          stations: {
            include: {
              employees: true,
            },
          },
        },
      })

      if (sheets.length === 0) {
        return '📋 目前沒有休假表記錄。\n\n請先提交休假表。'
      }

      const statusEmojis: Record<string, string> = {
        pending: '⏳',
        approved: '✅',
        rejected: '❌',
      }

      const statusTexts: Record<string, string> = {
        pending: '待審核',
        approved: '已通過',
        rejected: '已拒絕',
      }

      const sheetList = sheets.map((sheet) => {
        const totalDays = sheet.stations.reduce((sum, s) => sum + s.employees.length, 0)
        return `${statusEmojis[sheet.status]} ${sheet.title}
狀態：${statusTexts[sheet.status]}
提交時間：${new Date(sheet.submittedAt).toLocaleDateString('zh-TW')}
休假天數：${totalDays} 天
${sheet.note ? `備註：${sheet.note}` : ''}`
      })

      return `📋 **休假表狀態**\n\n${sheetList.join('\n\n---\n\n')}`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeSheetStatus error:', error)
      return '⚠️ 查詢休假表狀態時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 執行審核休假表（管理員）
   */
  private async executeApproveSchedule(entities: any, context: MessageContext): Promise<string> {
    try {
      // 只有管理員可以審核
      if (context.groupType !== GroupType.ADMIN) {
        return '⛔ 此功能僅供管理員使用。'
      }

      const { year, month, action, note } = entities

      if (!year || !month) {
        return `📋 **審核休假表**

請提供要審核的年月和動作。

格式：
• 「審核通過 114年12月」
• 「審核拒絕 114年12月」

或直接說「審核休假表」查看待審核列表。`
      }

      // 解析年份和月份
      let targetYear = parseInt(year)
      if (targetYear < 200) {
        targetYear += 1911 // 民國年轉西元年
      }
      const targetMonth = parseInt(month)

      // 查找休假表
      const sheet = await db.scheduleSheet.findUnique({
        where: {
          year_month: {
            year: targetYear,
            month: targetMonth,
          },
        },
      })

      if (!sheet) {
        return `⚠️ 找不到 ${targetYear}年${targetMonth}月 的休假表。`
      }

      if (sheet.status !== 'pending') {
        const statusText = sheet.status === 'approved' ? '已通過' : '已拒絕'
        return `⚠️ 此休假表${statusText}，無法再次審核。`
      }

      // 確定審核動作
      let newStatus: 'approved' | 'rejected' = 'approved'
      if (action && (action.includes('拒') || action.includes('reject') || action.includes('否'))) {
        newStatus = 'rejected'
      }

      // 更新休假表狀態
      const updated = await db.scheduleSheet.update({
        where: { id: sheet.id },
        data: {
          status: newStatus,
          reviewedBy: context.userId,
          reviewedAt: new Date(),
          note: note || entities.note,
        },
      })

      const statusText = newStatus === 'approved' ? '已通過 ✅' : '已拒絕 ❌'

      // 發送通知到 LINE 管理員群組和 APP
      await sendScheduleNotification({
        type: newStatus === 'approved' ? 'schedule_approved' : 'schedule_rejected',
        sheetId: sheet.id,
        year: updated.year,
        month: updated.month,
        reviewedBy: context.userId,
        status: newStatus,
        note,
      })

      return `✅ **休假表審核完成**

年月：${updated.year}年${updated.month}月
結果：${statusText}
${note ? `備註：${note}` : ''}

已通知相關人員。`
    } catch (error) {
      console.error('[UnifiedAIAssistant] executeApproveSchedule error:', error)
      return '⚠️ 審核休假表時發生錯誤，請稍後再試。'
    }
  }

  /**
   * 記錄到對話歷史
   */
  private recordToHistory(userId: string, message: Message): void {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, [])
    }

    const history = this.conversationHistory.get(userId)!
    history.push(message)

    // 保留最近 20 條訊息
    if (history.length > 20) {
      history.shift()
    }
  }

  /**
   * 獲取對話歷史
   */
  getConversationHistory(userId: string): Message[] {
    return this.conversationHistory.get(userId) || []
  }

  /**
   * 清空對話歷史
   */
  clearConversationHistory(userId: string): void {
    this.conversationHistory.delete(userId)
  }

  /**
   * 廣播訊息到群組
   */
  async broadcastToGroups(
    groupIds: string[],
    message: string
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [], failed: [] } as { success: string[]; failed: string[] }

    for (const groupId of groupIds) {
      try {
        const groupType = this.groupManager.getGroupType(groupId)
        const response = await this.processMessage(message, {
          platform: 'line',
          groupId,
          groupType,
        })

        // TODO: 實際發送到 LINE 群組
        results.success.push(groupId)
      } catch (error) {
        console.error(`Failed to send to group ${groupId}:`, error)
        results.failed.push(groupId)
      }
    }

    return results
  }

  /**
   * 獲取群組歡迎訊息
   */
  getGroupWelcomeMessage(groupType: GroupType): string {
    return this.intentAnalyzer.getGroupWelcomeMessage(groupType)
  }

  // ========================================
  // 新增：权限系统和万能搜索
  // ========================================

  /**
   * 根據意圖獲取所需權限
   */
  private getRequiredPermission(intent: LineIntent): Permission | null {
    const permissionMap: Record<LineIntent, Permission | null> = {
      [LineIntent.CREATE_ORDER]: 'order_create',
      [LineIntent.QUERY_ORDER]: 'order_view_own',
      [LineIntent.QUERY_ALL_ORDERS]: 'order_view_all',
      [LineIntent.CANCEL_ORDER]: 'order_edit',
      [LineIntent.CREATE_CUSTOMER]: 'customer_create',
      [LineIntent.QUERY_CUSTOMER]: 'customer_view_own',
      [LineIntent.QUERY_ALL_CUSTOMERS]: 'customer_view_all',
      [LineIntent.QUERY_INVENTORY]: 'inventory_view',
      [LineIntent.SUBMIT_SCHEDULE]: 'schedule_create',
      [LineIntent.QUERY_SCHEDULE]: 'schedule_view_own',
      [LineIntent.QUERY_ALL_SCHEDULES]: 'schedule_view_all',
      [LineIntent.APPROVE_SCHEDULE]: 'schedule_approve',
      [LineIntent.QUERY_FINANCE]: 'finance_view',
      [LineIntent.UNKNOWN]: null,
    }

    return permissionMap[intent] || null
  }

  /**
   * 老板專屬：萬能搜索功能
   * 支持自然語言查詢任何數據
   */
  private async executeUniversalSearch(
    query: string,
    userContext: UserContext
  ): Promise<AIResponse | null> {
    // 只在老板群組啟用
    if (!hasPermission(userContext, 'search_all')) {
      return null
    }

    const lowerQuery = query.toLowerCase()

    try {
      // 訂單搜索
      if (lowerQuery.includes('訂單') || lowerQuery.includes('订单')) {
        if (lowerQuery.includes('今天')) {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)

          const orders = await db.gasOrder.findMany({
            where: {
              createdAt: {
                gte: today,
                lt: tomorrow,
              },
            },
            include: {
              customer: true,
              items: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          })

          return {
            text: this.formatOrderSearchResult('今天', orders),
          }
        }

        // 搜尋客戶訂單
        const customerMatch = query.match(/(?:查詢)?(?:[\s\S]*?)([^\s]+?)(?:的|的訂單|订单)/)
        if (customerMatch) {
          const customerName = customerMatch[1]
          const orders = await db.gasOrder.findMany({
            where: {
              customer: {
                name: {
                  contains: customerName,
                },
              },
            },
            include: {
              customer: true,
              items: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })

          return {
            text: this.formatOrderSearchResult(customerName, orders),
          }
        }
      }

      // 庫存搜索
      if (lowerQuery.includes('庫存') || lowerQuery.includes('库存')) {
        const stationMatch = query.match(/(?:[\s\S]*?)([^\s]+?站)/)
        const station = stationMatch ? stationMatch[1] : null

        const inventories = await db.inventory.findMany({
          where: station ? { station } : undefined,
          include: {
            product: true,
          },
        })

        const lowStock = inventories.filter(i => i.quantity <= i.minStock)

        return {
          text: this.formatInventorySearchResult(inventories, lowStock),
        }
      }

      // 休假搜索
      if (lowerQuery.includes('休假') || lowerQuery.includes('今天誰') || lowerQuery.includes('今天谁')) {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

        const schedule = await db.scheduleSheet.findUnique({
          where: {
            year_month: {
              year: now.getFullYear(),
              month: now.getMonth() + 1,
            },
            status: 'approved',
          },
          include: {
            stations: {
              include: {
                employees: {
                  where: {
                    scheduleDate: {
                      gte: today,
                      lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                    },
                  },
                },
              },
            },
          },
        })

        if (schedule) {
          const todayEmployees: Array<{name: string, station: string, note?: string}> = []
          for (const station of schedule.stations) {
            for (const emp of station.employees) {
              todayEmployees.push({
                name: emp.employeeName,
                station: station.stationName,
                note: emp.isHalfDay ? emp.note : undefined,
              })
            }
          }

          if (todayEmployees.length === 0) {
            return { text: '✅ 今天沒有人休假' }
          }

          let text = '📅 **今日休假名單**\n\n'
          for (const emp of todayEmployees) {
            text += `🏠 ${emp.station}站：${emp.name}${emp.note ? `（${emp.note}）` : ''}\n`
          }
          return { text }
        }

        return { text: '📅 本月還沒有審核通過的休假表' }
      }

      // 營業額統計
      if (lowerQuery.includes('營業額') || lowerQuery.includes('营业额') || lowerQuery.includes('业绩')) {
        const monthMatch = query.match(/(\d+)月/)
        const targetMonth = monthMatch ? parseInt(monthMatch[1]) : new Date().getMonth() + 1
        const targetYear = new Date().getFullYear()

        // 該月的第一天和最後一天
        const startOfMonth = new Date(targetYear, targetMonth - 1, 1)
        const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59)

        const orders = await db.gasOrder.findMany({
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
            status: {
              in: ['pending', 'delivering', 'completed'],
            },
          },
          include: {
            items: true,
          },
        })

        const totalOrders = orders.length
        const totalRevenue = orders.reduce((sum, order) => {
          const orderTotal = order.items.reduce((itemSum, item) => {
            return itemSum + (item.price * item.quantity)
          }, 0)
          return sum + orderTotal
        }, 0)

        const completedOrders = orders.filter(o => o.status === 'completed').length

        return {
          text: `📊 **${targetYear}年${targetMonth}月營業額報告**

📦 總訂單：${totalOrders} 單
✅ 已完成：${completedOrders} 單
💰 總營業額：$${totalRevenue.toLocaleString()}
📈 完成率：${totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0}%

數據更新於：${new Date().toLocaleString('zh-TW')}`,
        }
      }

      // 沒有匹配的搜索模式，返回 null 讓後續流程處理
      return null
    } catch (error) {
      console.error('[Universal Search] Error:', error)
      return {
        text: '⚠️ 搜索時發生錯誤，請稍後再試。',
      }
    }
  }

  /**
   * 格式化訂單搜索結果
   */
  private formatOrderSearchResult(keyword: string, orders: any[]): string {
    if (orders.length === 0) {
      return `🔍 **訂單搜索結果**

關鍵字：${keyword}
結果：找不到相關訂單`
    }

    let text = `🔍 **訂單搜索結果**

關鍵字：${keyword}
找到 ${orders.length} 筆訂單

---
`

    for (let i = 0; i < Math.min(orders.length, 10); i++) {
      const order = orders[i]
      const itemsStr = order.items.map((item: any) =>
        `${item.product?.name || '商品'} x${item.quantity}`
      ).join('、')

      text += `📦 訂單 #${order.id.slice(-6)}
👤 客戶：${order.customer?.name || '未知'}
📝 內容：${itemsStr}
📊 狀態：${order.status}
📅 時間：${new Date(order.createdAt).toLocaleDateString('zh-TW')}

`
    }

    if (orders.length > 10) {
      text += `\n... 還有 ${orders.length - 10} 筆訂單未顯示`
    }

    return text
  }

  /**
   * 格式化庫存搜索結果
   */
  private formatInventorySearchResult(inventories: any[], lowStock: any[]): string {
    let text = `📊 **庫存查詢結果**

總商品數：${inventories.length} 項

`

    if (lowStock.length > 0) {
      text += `⚠️ **低庫存預警**（${lowStock.length}項）

`
      for (const inv of lowStock) {
        const status = inv.quantity === 0 ? '❌ 缺貨' : '⚠️ 低庫存'
        text += `${status} ${inv.product?.name || '未知'}：${inv.quantity}/${inv.minStock}\n`
      }
      text += '\n'
    }

    text += `---\n`
    text += `詳細庫存列表：\n\n`

    for (const inv of inventories) {
      const status = inv.quantity <= inv.minStock ? '⚠️' : '✅'
      text += `${status} ${inv.product?.name || '未知'}：${inv.quantity}${inv.station ? `（${inv.station}）` : ''}\n`
    }

    return text
  }
}

// ========================================
// 導出單例
// ========================================

let unifiedAssistantInstance: UnifiedAIAssistant | null = null

export function getUnifiedAIAssistant(): UnifiedAIAssistant {
  if (!unifiedAssistantInstance) {
    unifiedAssistantInstance = new UnifiedAIAssistant()
  }
  return unifiedAssistantInstance
}

/**
 * 根據平台獲取助手實例
 */
export function getAssistantForPlatform(platform: MessageContext['platform']): UnifiedAIAssistant {
  return getUnifiedAIAssistant()
}
