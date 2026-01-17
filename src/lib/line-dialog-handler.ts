/**
 * LINE Bot 多輪對話處理器
 * 處理複雜的對話流程，如訂購、綁定帳戶等
 */

import { db } from './db'
import { ConversationStateManager, ConversationState, getConversationStateManager } from './line-conversation-state'
import { getLineCustomerLinker } from './line-customer-linker'
import { LineIntent } from './line-bot-intent'

// ========================================
// 對話處理結果
// ========================================

export interface DialogResult {
  response: string
  newState?: ConversationState
  shouldReply: boolean
  quickReply?: any
  endConversation?: boolean
}

// ========================================
// 多輪對話處理器
// ========================================

export class LineDialogHandler {
  private stateManager: ConversationStateManager
  private customerLinker = getLineCustomerLinker()

  constructor() {
    this.stateManager = getConversationStateManager()
  }

  /**
   * 處理多輪對話
   * 返回 null 表示不屬於多輪對話，應該使用單輪處理
   */
  async handleDialog(
    userId: string,
    message: string,
    groupId?: string
  ): Promise<DialogResult | null> {
    const state = this.stateManager.getState(userId)

    // 如果沒有狀態，檢查是否需要開始新的對話
    if (!state) {
      return await this.startNewDialog(userId, message, groupId)
    }

    // 記錄訊息
    this.stateManager.recordMessage(userId, message)

    // 根據當前狀態處理
    switch (state.state) {
      case ConversationState.AWAITING_PHONE:
        return await this.handlePhoneInput(userId, message, state)

      case ConversationState.AWAITING_NAME:
        return await this.handleNameInput(userId, message, state)

      case ConversationState.AWAITING_ADDRESS:
        return await this.handleAddressInput(userId, message, state)

      case ConversationState.AWAITING_ORDER_SIZE:
        return await this.handleOrderSizeInput(userId, message, state)

      case ConversationState.AWAITING_ORDER_QTY:
        return await this.handleOrderQtyInput(userId, message, state)

      case ConversationState.AWAITING_ORDER_CONFIRM:
        return await this.handleOrderConfirm(userId, message, state)

      case ConversationState.AWAITING_FEEDBACK:
        return await this.handleFeedback(userId, message, state)

      default:
        // 未知狀態，清除並返回 null
        this.stateManager.clearState(userId)
        return null
    }
  }

  /**
   * 開始新的對話流程
   */
  private async startNewDialog(
    userId: string,
    message: string,
    groupId?: string
  ): Promise<DialogResult | null> {
    const lowerMessage = message.toLowerCase()

    // 檢測綁定意圖
    if (this.isLinkingIntent(message)) {
      return await this.startLinkingFlow(userId, message, groupId)
    }

    // 檢測訂購意圖但沒有完整信息
    if (this.isOrderingIntent(message) && !this.hasCompleteOrderInfo(message)) {
      return await this.startOrderingFlow(userId, message, groupId)
    }

    // 不是多輪對話
    return null
  }

  // ========================================
  // 綁定帳戶流程
  // ========================================

  /**
   * 檢測是否是綁定意圖
   */
  private isLinkingIntent(message: string): boolean {
    const keywords = ['綁定', '綁定手機', '我是新客戶', '新客戶', '連結帳戶', '會員綁定']
    const lowerMessage = message.toLowerCase()
    return keywords.some(k => lowerMessage.includes(k))
  }

  /**
   * 開始綁定流程
   */
  private async startLinkingFlow(
    userId: string,
    message: string,
    groupId?: string
  ): Promise<DialogResult> {
    const isNewCustomer = message.toLowerCase().includes('新客戶')

    if (isNewCustomer) {
      // 新客戶流程
      this.stateManager.setState(userId, ConversationState.AWAITING_PHONE, {
        flow: 'new_customer',
      }, groupId)

      return {
        response: `🆕 歡迎成為我們的新客戶！

請提供以下資訊幫您建立帳戶：

📱 請輸入您的手機號碼（例如：0912345678）`,
        shouldReply: true,
      }
    } else {
      // 老客戶綁定流程
      this.stateManager.setState(userId, ConversationState.AWAITING_PHONE, {
        flow: 'link_existing',
      }, groupId)

      return {
        response: `🔗 帳戶綁定

請提供您的手機號碼，讓我們找到您的客戶資料：

📱 請輸入您的手機號碼（例如：0912345678）`,
        shouldReply: true,
      }
    }
  }

  /**
   * 處理手機號碼輸入
   */
  private async handlePhoneInput(
    userId: string,
    message: string,
    state: any
  ): Promise<DialogResult> {
    // 提取手機號碼
    const phoneMatch = message.match(/(09\d{8}|\d{10})/)
    if (!phoneMatch) {
      const retryCount = this.stateManager.incrementRetry(userId)
      const prompt = this.stateManager.getFriendlyErrorPrompt(ConversationState.AWAITING_PHONE, retryCount)

      return {
        response: `⚠️ 手機號碼格式不正確\n\n${prompt}`,
        shouldReply: true,
      }
    }

    const phone = phoneMatch[1]

    if (state.data.flow === 'new_customer') {
      // 新客戶流程，下一步詢問姓名
      this.stateManager.updateData(userId, { phone })
      this.stateManager.setState(userId, ConversationState.AWAITING_NAME, state.data, state.groupId)

      return {
        response: `✅ 收到手機號碼：${phone}

請問怎麼稱呼您？

👤 請輸入您的姓名`,
        shouldReply: true,
      }
    } else {
      // 老客戶綁定流程，嘗試綁定
      const result = await this.customerLinker.linkByPhone(userId, phone)

      if (result.success) {
        this.stateManager.clearState(userId)

        // 加上後續追蹤
        const followUp = this.stateManager.getFollowUpMessage(LineIntent.LINK_ACCOUNT, true)

        return {
          response: `${result.message}\n\n${followUp}`,
          shouldReply: true,
          quickReply: {
            items: [
              { type: 'message', label: '🛒 訂瓦斯', text: '我要訂瓦斯' },
              { type: 'message', label: '📦 查庫存', text: '查庫存' },
              { type: 'message', label: '💰 查價格', text: '瓦斯多少錢' },
            ],
          },
          endConversation: true,
        }
      } else {
        // 綁定失敗，可能是新客戶
        return {
          response: `${result.message}\n\n如果是新客戶，請說「我是新客戶」`,
          shouldReply: true,
        }
      }
    }
  }

  /**
   * 處理姓名輸入
   */
  private async handleNameInput(
    userId: string,
    message: string,
    state: any
  ): Promise<DialogResult> {
    const name = message.trim().replace(/姓名|名字|我是|我叫/g, '').trim()

    if (name.length < 2) {
      const retryCount = this.stateManager.incrementRetry(userId)
      const prompt = this.stateManager.getFriendlyErrorPrompt(ConversationState.AWAITING_NAME, retryCount)

      return {
        response: `⚠️ 請提供有效的姓名\n\n${prompt}`,
        shouldReply: true,
      }
    }

    // 更新數據，詢問地址
    this.stateManager.updateData(userId, { name })
    this.stateManager.setState(userId, ConversationState.AWAITING_ADDRESS, state.data, state.groupId)

    return {
      response: `✅ 收到！${name}

請提供您的配送地址：

📍 請輸入您的地址`,
      shouldReply: true,
    }
  }

  /**
   * 處理地址輸入
   */
  private async handleAddressInput(
    userId: string,
    message: string,
    state: any
  ): Promise<DialogResult> {
    const address = message.trim().replace(/地址|送到|配送/g, '').trim()

    if (address.length < 5) {
      const retryCount = this.stateManager.incrementRetry(userId)
      const prompt = this.stateManager.getFriendlyErrorPrompt(ConversationState.AWAITING_ADDRESS, retryCount)

      return {
        response: `⚠️ 請提供完整的地址\n\n${prompt}`,
        shouldReply: true,
      }
    }

    // 創建新客戶
    const { phone, name } = state.data
    const result = await this.customerLinker.createCustomerFromLINE(userId, {
      name,
      phone,
      address,
    })

    this.stateManager.clearState(userId)

    const followUp = this.stateManager.getFollowUpMessage(LineIntent.CREATE_CUSTOMER, result.success)

    return {
      response: `${result.message}\n\n${followUp}`,
      shouldReply: true,
      quickReply: result.success ? {
        items: [
          { type: 'message', label: '🛒 立即訂購', text: '我要訂瓦斯' },
          { type: 'message', label: '💰 查價格', text: '瓦斯多少錢' },
        ],
      } : undefined,
      endConversation: result.success,
    }
  }

  // ========================================
  // 訂購流程
  // ========================================

  /**
   * 檢測是否是訂購意圖
   */
  private isOrderingIntent(message: string): boolean {
    const keywords = ['訂', '買', '要瓦斯', '瓦斯桶', '桶', '購買', '下單']
    const lowerMessage = message.toLowerCase()
    return keywords.some(k => lowerMessage.includes(k))
  }

  /**
   * 檢查是否包含完整訂單信息
   */
  private hasCompleteOrderInfo(message: string): boolean {
    // 同時包含規格和數量
    const hasSize = /(\d+)\s*(kg|公斤)/i.test(message)
    const hasQty = /(\d+)\s*(桶|個|份)/i.test(message)
    return hasSize && hasQty
  }

  /**
   * 開始訂購流程
   */
  private async startOrderingFlow(
    userId: string,
    message: string,
    groupId?: string
  ): Promise<DialogResult> {
    // 檢查客戶是否存在
    const customer = await this.customerLinker.getCustomerByLineId(userId)

    if (!customer) {
      // 先綁定帳戶
      return await this.startLinkingFlow(userId, message, groupId)
    }

    // 提取可能的規格信息
    const sizeMatch = message.match(/(\d+)\s*(kg|公斤)/i)
    const size = sizeMatch ? `${sizeMatch[1]}kg` : null

    // 獲取客戶偏好
    const preference = await this.stateManager.getCustomerPreference(userId)
    const suggestedSize = size || preference?.preferredSize || '20kg'

    // 設置狀態
    this.stateManager.setState(userId, ConversationState.AWAITING_ORDER_SIZE, {
      customerId: customer.id,
      customerName: customer.name,
      suggestedSize,
    }, groupId)

    // 生成個人化訊息
    const greeting = this.stateManager.getPersonalizedGreeting(userId, customer.name)
    const recommendation = await this.stateManager.getPersonalizedRecommendation(userId)

    return {
      response: `${greeting}

${recommendation ? recommendation + '\n\n' : ''}請問您需要什麼規格的瓦斯？`,
      shouldReply: true,
      quickReply: {
        items: [
          { type: 'message', label: '4kg', text: '4kg' },
          { type: 'message', label: '20kg', text: '20kg' },
          { type: 'message', label: '50kg', text: '50kg' },
        ],
      },
    }
  }

  /**
   * 處理規格選擇
   */
  private async handleOrderSizeInput(
    userId: string,
    message: string,
    state: any
  ): Promise<DialogResult> {
    // 提取規格
    const sizeMatch = message.match(/(\d+)\s*(kg|公斤)/i)
    const size = sizeMatch ? `${sizeMatch[1]}kg` : message.trim()

    // 驗證規格
    const validSizes = ['4kg', '20kg', '50kg']
    if (!validSizes.includes(size)) {
      const retryCount = this.stateManager.incrementRetry(userId)
      const prompt = this.stateManager.getFriendlyErrorPrompt(ConversationState.AWAITING_ORDER_SIZE, retryCount)

      return {
        response: `⚠️ 我們只有 4kg、20kg、50kg 的瓦斯規格\n\n${prompt}`,
        shouldReply: true,
        quickReply: {
          items: [
            { type: 'message', label: '4kg', text: '4kg' },
            { type: 'message', label: '20kg', text: '20kg' },
            { type: 'message', label: '50kg', text: '50kg' },
          ],
        },
      }
    }

    // 更新數據，詢問數量
    this.stateManager.updateData(userId, { size })
    this.stateManager.setState(userId, ConversationState.AWAITING_ORDER_QTY, state.data, state.groupId)

    // 獲取客戶偏好
    const preference = await this.stateManager.getCustomerPreference(userId)
    const suggestedQty = preference?.averageOrderQty || 1

    return {
      response: `✅ 選擇規格：${size}

請問需要幾桶？`,
      shouldReply: true,
      quickReply: {
        items: [
          { type: 'message', label: '1桶', text: '1桶' },
          { type: 'message', label: '2桶', text: '2桶' },
          { type: 'message', label: `${suggestedQty}桶`, text: `${suggestedQty}桶` },
        ],
      },
    }
  }

  /**
   * 處理數量選擇
   */
  private async handleOrderQtyInput(
    userId: string,
    message: string,
    state: any
  ): Promise<DialogResult> {
    // 提取數量
    const qtyMatch = message.match(/(\d+)/)
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1

    if (qty < 1 || qty > 50) {
      const retryCount = this.stateManager.incrementRetry(userId)
      const prompt = this.stateManager.getFriendlyErrorPrompt(ConversationState.AWAITING_ORDER_QTY, retryCount)

      return {
        response: `⚠️ 數量必須在 1-50 桶之間\n\n${prompt}`,
        shouldReply: true,
      }
    }

    // 更新數據，生成訂單確認
    this.stateManager.updateData(userId, { quantity: qty })

    const { size, customerName } = state.data

    // 查詢產品價格
    const product = await db.product.findFirst({
      where: {
        capacity: size,
        isActive: true,
      },
    })

    const unitPrice = product?.price || 720
    const subtotal = unitPrice * qty

    // 設置確認狀態
    this.stateManager.setState(userId, ConversationState.AWAITING_ORDER_CONFIRM, state.data, state.groupId)

    return {
      response: `📋 訂單確認

客戶：${customerName}
規格：${size}
數量：${qty} 桶
單價：NT$${unitPrice}
總額：NT$${subtotal.toLocaleString()}

請確認訂單，回覆「確認」或「取消」`,
      shouldReply: true,
      quickReply: {
        items: [
          { type: 'message', label: '✅ 確認訂單', text: '確認' },
          { type: 'message', label: '❌ 取消', text: '取消' },
        ],
      },
    }
  }

  /**
   * 處理訂單確認
   */
  private async handleOrderConfirm(
    userId: string,
    message: string,
    state: any
  ): Promise<DialogResult> {
    const lowerMessage = message.toLowerCase()

    if (lowerMessage.includes('取消') || lowerMessage.includes('不要')) {
      this.stateManager.clearState(userId)
      return {
        response: `❌ 訂單已取消

還有其他可以幫您的嗎？`,
        shouldReply: true,
        quickReply: {
          items: [
            { type: 'message', label: '🛒 重新訂購', text: '我要訂瓦斯' },
            { type: 'message', label: '📦 查庫存', text: '查庫存' },
          ],
        },
        endConversation: true,
      }
    }

    if (!lowerMessage.includes('確認')) {
      const retryCount = this.stateManager.incrementRetry(userId)
      return {
        response: this.stateManager.getFriendlyErrorPrompt(ConversationState.AWAITING_ORDER_CONFIRM, retryCount),
        shouldReply: true,
      }
    }

    // 創建訂單
    const { customerId, size, quantity } = state.data

    try {
      // 查找產品
      const product = await db.product.findFirst({
        where: { capacity: size, isActive: true },
        include: { category: true },
      })

      if (!product) {
        this.stateManager.clearState(userId)
        return {
          response: `⚠️ 抱歉，找不到 ${size} 的產品。\n\n請致電客服協助。`,
          shouldReply: true,
        }
      }

      // 檢查庫存
      const inventory = await db.inventory.findUnique({
        where: { productId: product.id },
      })

      if (!inventory || inventory.quantity < quantity) {
        this.stateManager.clearState(userId)
        return {
          response: `⚠️ 抱歉，${size} 瓦斯目前庫存不足。\n\n現有庫存：${inventory?.quantity || 0} 桶\n\n請稍後再試或致電客服。`,
          shouldReply: true,
        }
      }

      // 生成訂單編號
      const orderNo = `SO${Date.now().toString().slice(-8)}`
      const unitPrice = product.price
      const subtotal = unitPrice * quantity

      // 創建訂單
      const order = await db.$transaction(async (tx) => {
        const newOrder = await tx.gasOrder.create({
          data: {
            orderNo,
            customerId,
            orderDate: new Date(),
            deliveryDate: new Date(),
            status: 'pending',
            subtotal,
            discount: 0,
            deliveryFee: 0,
            total: subtotal,
            note: '來自 LINE Bot 訂單',
          },
        })

        await tx.gasOrderItem.create({
          data: {
            orderId: newOrder.id,
            productId: product.id,
            quantity,
            unitPrice,
            subtotal,
          },
        })

        await tx.inventory.update({
          where: { productId: product.id },
          data: { quantity: { decrement: quantity } },
        })

        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'delivery',
            quantity: -quantity,
            quantityBefore: inventory.quantity,
            quantityAfter: inventory.quantity - quantity,
            reason: `LINE 訂單 ${orderNo}`,
          },
        })

        return newOrder
      })

      // 更新客戶偏好
      this.stateManager.updateCustomerPreference(userId, {
        preferredSize: size,
        lastOrderDate: new Date(),
      })

      this.stateManager.clearState(userId)

      const followUp = this.stateManager.getFollowUpMessage(LineIntent.CREATE_ORDER, true)

      return {
        response: `✅ 訂單已建立！

📋 訂單編號：${orderNo}
📦 商品：${product.name} x${quantity}
💰 金額：NT$${subtotal.toLocaleString()}
📅 預計配送：今日下午

感謝您的訂購！

${followUp}`,
        shouldReply: true,
        quickReply: {
          items: [
            { type: 'message', label: '📋 查訂單', text: '查訂單' },
            { type: 'message', label: '🛒 繼續訂購', text: '我要訂瓦斯' },
          ],
        },
        endConversation: true,
      }
    } catch (error) {
      console.error('[LineDialogHandler] handleOrderConfirm error:', error)
      this.stateManager.clearState(userId)
      return {
        response: `⚠️ 建立訂單時發生錯誤，請稍後再試或致電客服。`,
        shouldReply: true,
      }
    }
  }

  /**
   * 處理反饋
   */
  private async handleFeedback(
    userId: string,
    message: string,
    state: any
  ): Promise<DialogResult> {
    this.stateManager.clearState(userId)

    // TODO: 保存反饋到資料庫

    return {
      response: `感謝您的寶貴意見！我們會持續改進 💪

還有其他可以幫您的嗎？`,
      shouldReply: true,
      endConversation: true,
    }
  }

  /**
   * 取消當前對話
   */
  cancelDialog(userId: string): DialogResult {
    this.stateManager.clearState(userId)
    return {
      response: '已取消。還有其他需要嗎？',
      shouldReply: true,
    }
  }
}

// ========================================
// 導出單例
// ========================================

let dialogHandlerInstance: LineDialogHandler | null = null

export function getLineDialogHandler(): LineDialogHandler {
  if (!dialogHandlerInstance) {
    dialogHandlerInstance = new LineDialogHandler()
  }
  return dialogHandlerInstance
}
