/**
 * LINE Bot 對話狀態管理器
 * 支持多輪對話、狀態追蹤、個人化體驗
 */

import { db } from './db'
import { LineIntent, GroupType } from './line-bot-intent'

// ========================================
// 對話狀態定義
// ========================================

export enum ConversationState {
  IDLE = 'idle',                          // 閒置狀態
  AWAITING_PHONE = 'awaiting_phone',      // 等待手機號碼（綁定帳戶）
  AWAITING_NAME = 'awaiting_name',        // 等待姓名（新客戶）
  AWAITING_ADDRESS = 'awaiting_address',  // 等待地址
  AWAITING_ORDER_SIZE = 'awaiting_order_size',    // 等待選擇瓦斯規格
  AWAITING_ORDER_QTY = 'awaiting_order_qty',      // 等待確認數量
  AWAITING_ORDER_CONFIRM = 'awaiting_order_confirm', // 等待訂單確認
  AWAITING_FEEDBACK = 'awaiting_feedback', // 等待反饋
}

export interface ConversationContext {
  userId: string
  groupId?: string
  state: ConversationState
  data: Record<string, any>
  lastMessage: string
  lastMessageTime: Date
  retryCount: number
}

export interface CustomerPreference {
  preferredSize?: string      // 偏好規格
  preferredQty?: number       // 偏好數量
  lastOrderDate?: Date        // 最後訂購日期
  orderCount?: number         // 訂購次數
  averageOrderQty?: number    // 平均訂購數量
}

// ========================================
// 對話狀態管理器
// ========================================

export class ConversationStateManager {
  // 用戶對話狀態快取（實際生產應使用 Redis）
  private states: Map<string, ConversationContext> = new Map()
  // 客戶偏好快取
  private preferences: Map<string, CustomerPreference> = new Map()

  // 狀態逾時設定（毫秒）
  private readonly STATE_TIMEOUT = 15 * 60 * 1000 // 15 分鐘

  /**
   * 獲取用戶當前對話狀態
   */
  getState(userId: string): ConversationContext | undefined {
    const context = this.states.get(userId)
    if (!context) return undefined

    // 檢查是否逾時
    const now = new Date()
    const elapsed = now.getTime() - context.lastMessageTime.getTime()
    if (elapsed > this.STATE_TIMEOUT) {
      this.clearState(userId)
      return undefined
    }

    return context
  }

  /**
   * 設置用戶對話狀態
   */
  setState(userId: string, state: ConversationState, data: Record<string, any> = {}, groupId?: string): void {
    const existing = this.getState(userId)

    this.states.set(userId, {
      userId,
      groupId,
      state,
      data: { ...existing?.data, ...data },
      lastMessage: '',
      lastMessageTime: new Date(),
      retryCount: 0,
    })
  }

  /**
   * 更新對話數據
   */
  updateData(userId: string, data: Record<string, any>): void {
    const context = this.getState(userId)
    if (!context) return

    context.data = { ...context.data, ...data }
    context.lastMessageTime = new Date()
  }

  /**
   * 記錄用戶訊息
   */
  recordMessage(userId: string, message: string): void {
    const context = this.getState(userId)
    if (!context) return

    context.lastMessage = message
    context.lastMessageTime = new Date()
  }

  /**
   * 增加重試次數
   */
  incrementRetry(userId: string): number {
    const context = this.getState(userId)
    if (!context) return 0

    context.retryCount++
    return context.retryCount
  }

  /**
   * 清除用戶狀態
   */
  clearState(userId: string): void {
    this.states.delete(userId)
  }

  /**
   * 獲取客戶偏好（從資料庫或快取）
   */
  async getCustomerPreference(lineUserId: string): Promise<CustomerPreference | null> {
    // 先檢查快取
    if (this.preferences.has(lineUserId)) {
      return this.preferences.get(lineUserId)!
    }

    try {
      // 從資料庫查詢
      const customer = await db.customer.findUnique({
        where: { lineUserId },
      })

      if (!customer) return null

      // 查詢歷史訂單
      const orders = await db.gasOrder.findMany({
        where: { customerId: customer.id },
        include: {
          items: {
            include: { product: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      // 分析偏好
      const preference: CustomerPreference = {
        lastOrderDate: orders[0]?.createdAt,
        orderCount: orders.length,
      }

      // 找出最常訂的規格
      const sizeCount = new Map<string, number>()
      let totalQty = 0

      for (const order of orders) {
        for (const item of order.items) {
          const size = item.product?.capacity || '20kg'
          sizeCount.set(size, (sizeCount.get(size) || 0) + item.quantity)
          totalQty += item.quantity
        }
      }

      // 最常訂的規格
      let maxSize = ''
      let maxCount = 0
      for (const [size, count] of sizeCount.entries()) {
        if (count > maxCount) {
          maxCount = count
          maxSize = size
        }
      }
      preference.preferredSize = maxSize
      preference.averageOrderQty = orders.length > 0 ? Math.round(totalQty / orders.length * 10) / 10 : 1

      // 快取結果
      this.preferences.set(lineUserId, preference)
      return preference
    } catch (error) {
      console.error('[ConversationStateManager] getCustomerPreference error:', error)
      return null
    }
  }

  /**
   * 更新客戶偏好
   */
  updateCustomerPreference(lineUserId: string, data: Partial<CustomerPreference>): void {
    const existing = this.preferences.get(lineUserId) || {}
    this.preferences.set(lineUserId, { ...existing, ...data })
  }

  /**
   * 生成個人化問候語
   */
  getPersonalizedGreeting(lineUserId: string, userName?: string): string {
    const hour = new Date().getHours()
    let timeGreeting = ''

    if (hour >= 5 && hour < 11) {
      timeGreeting = '早安'
    } else if (hour >= 11 && hour < 14) {
      timeGreeting = '午安'
    } else if (hour >= 14 && hour < 18) {
      timeGreeting = '下午好'
    } else if (hour >= 18 && hour < 22) {
      timeGreeting = '晚上好'
    } else {
      timeGreeting = '夜深了'
    }

    if (userName) {
      return `${timeGreeting}，${userName}！`
    }
    return `${timeGreeting}！`
  }

  /**
   * 生成個人化推薦訊息
   */
  async getPersonalizedRecommendation(lineUserId: string): Promise<string | null> {
    const preference = await this.getCustomerPreference(lineUserId)
    if (!preference || !preference.preferredSize) return null

    const { preferredSize, averageOrderQty = 1, lastOrderDate } = preference

    // 計算距離上次訂購的天數
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999

    let message = ''

    if (daysSinceLastOrder > 30 && preference.orderCount && preference.orderCount > 0) {
      // 超過 30 天沒訂購
      message = `👋 好久不見！距離上次訂購已經 ${daysSinceLastOrder} 天了。\n\n`
      message += `根據您的記錄，通常訂購 ${preferredSize} 瓦斯。`
    } else if (preference.orderCount && preference.orderCount > 3) {
      // 老客戶
      message = `📦 根據您的習慣，推薦 ${preferredSize} 瓦斯。`
    }

    return message || null
  }

  /**
   * 生成友善的錯誤引導訊息
   */
  getFriendlyErrorPrompt(state: ConversationState, retryCount: number): string {
    const prompts: Record<ConversationState, string[]> = {
      [ConversationState.IDLE]: ['不好意思，我不太理解您的意思。可以說得更清楚一點嗎？'],
      [ConversationState.AWAITING_PHONE]: [
        '請提供您的手機號碼，例如：09xxxxxxxxx',
        '手機號碼格式像是 0912345678，請試試看！',
        '您可以用「手機 09xxxxxxxxx」這種格式告訴我喔！',
      ],
      [ConversationState.AWAITING_NAME]: [
        '請告訴我您的姓名，方便我們為您服務。',
        '請問怎麼稱呼您呢？',
      ],
      [ConversationState.AWAITING_ADDRESS]: [
        '請提供您的配送地址。',
        '請問要送到哪裡呢？',
      ],
      [ConversationState.AWAITING_ORDER_SIZE]: [
        '我們有 4kg、20kg、50kg 瓦斯桶，請問您需要哪一種？',
        '請選擇瓦斯規格：4kg、20kg 或 50kg？',
        '最熱門的是 20kg 瓦斯喔！需要嗎？',
      ],
      [ConversationState.AWAITING_ORDER_QTY]: [
        '請問需要幾桶呢？',
        '請輸入數量，例如：1 桶或 2 桶',
      ],
      [ConversationState.AWAITING_ORDER_CONFIRM]: [
        '請確認訂單，回覆「確認」或「取消」',
        '請告訴我要確認還是取消這個訂單？',
      ],
      [ConversationState.AWAITING_FEEDBACK]: [
        '有什麼建議嗎？您的意見對我們很重要！',
        '請分享您的使用經驗，幫助我們改進！',
      ],
    }

    const statePrompts = prompts[state] || []
    const index = Math.min(retryCount, statePrompts.length - 1)
    return statePrompts[index] || '不好意思，請再試一次！'
  }

  /**
   * 生成後續追蹤訊息
   */
  getFollowUpMessage(intent: LineIntent, success: boolean = true): string | null {
    if (!success) return '還有其他我可以幫您的嗎？'

    const followUps: Record<LineIntent, string[]> = {
      [LineIntent.CREATE_ORDER]: [
        '還需要其他服務嗎？',
        '需要加購其他產品嗎？',
        '還有什麼我可以幫您的？',
      ],
      [LineIntent.CHECK_ORDER]: [
        '需要查詢其他訂單嗎？',
        '要訂購瓦斯嗎？',
      ],
      [LineIntent.CHECK_INVENTORY]: [
        '需要訂購瓦斯嗎？',
        '還有其他問題嗎？',
      ],
      [LineIntent.LINK_ACCOUNT]: [
        '現在可以開始訂購瓦斯了！',
        '有什麼想問的嗎？',
      ],
      [LineIntent.GREETING]: [],
      [LineIntent.HELP]: [],
      [LineIntent.UNKNOWN]: [],
      // 其他意圖的預設值
      [LineIntent.CHECK_PRICE]: ['還有其他問題嗎？'],
      [LineIntent.CHECK_REVENUE]: ['需要其他報表嗎？'],
      [LineIntent.CHECK_COST]: ['還有什麼可以幫您的？'],
      [LineIntent.DELIVERY_STATUS]: ['需要查詢其他訂單嗎？'],
      [LineIntent.CREATE_CUSTOMER]: [],
      [LineIntent.SEARCH_CUSTOMER]: [],
      [LineIntent.CUSTOMER_INFO]: [],
      [LineIntent.DRIVER_ASSIGN]: [],
      [LineIntent.DRIVER_TASKS]: [],
      [LineIntent.CANCEL_ORDER]: [],
      [LineIntent.MODIFY_ORDER]: [],
      [LineIntent.ADD_CHECK]: [],
      [LineIntent.CHECK_STATUS]: [],
      [LineIntent.ADMIN_REPORT]: [],
      [LineIntent.ADMIN_EXPORT]: [],
      [LineIntent.DRIVER_MY_TASKS]: [],
      [LineIntent.DRIVER_COMPLETE]: [],
      [LineIntent.SALES_TARGET]: [],
      [LineIntent.SALES_PERFORMANCE]: [],
      [LineIntent.CS_INQUIRY]: [],
      [LineIntent.PROMOTION_LIST]: [],
      [LineIntent.PROMOTION_CREATE]: [],
    }

    const messages = followUps[intent] || ['還有其他可以幫您的嗎？']
    return messages[Math.floor(Math.random() * messages.length)]
  }

  /**
   * 清理過期狀態（定時任務）
   */
  cleanupExpiredStates(): number {
    const now = new Date()
    let cleaned = 0

    for (const [userId, context] of this.states.entries()) {
      const elapsed = now.getTime() - context.lastMessageTime.getTime()
      if (elapsed > this.STATE_TIMEOUT) {
        this.states.delete(userId)
        cleaned++
      }
    }

    return cleaned
  }
}

// ========================================
// 導出單例
// ========================================

let conversationStateInstance: ConversationStateManager | null = null

export function getConversationStateManager(): ConversationStateManager {
  if (!conversationStateInstance) {
    conversationStateInstance = new ConversationStateManager()

    // 定時清理過期狀態（每 5 分鐘）
    setInterval(() => {
      conversationStateInstance!.cleanupExpiredStates()
    }, 5 * 60 * 1000)
  }
  return conversationStateInstance
}
