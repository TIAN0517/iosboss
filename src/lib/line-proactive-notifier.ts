/**
 * LINE Bot 主動通知服務
 * 發送庫存提醒、配送進度、促銷通知等
 */

import { db } from './db'

// ========================================
// 通知類型定義
// ========================================

export enum NotificationType {
  INVENTORY_LOW = 'inventory_low',        // 庫存不足
  INVENTORY_RESTOCKED = 'inventory_restocked', // 庫存補貨
  ORDER_STATUS_UPDATE = 'order_status',   // 訂單狀態更新
  ORDER_DELIVERED = 'order_delivered',    // 配送完成
  PROMOTION = 'promotion',                // 促銷活動
  FOLLOW_UP_REMINDER = 'follow_up',       // 後續訂購提醒
  PAYMENT_REMINDER = 'payment_reminder',  // 付款提醒
}

export interface NotificationMessage {
  type: NotificationType
  text: string
  recipientType: 'admin' | 'driver' | 'customer'
  recipientId?: string
  priority: 'low' | 'normal' | 'high'
  data?: Record<string, any>
}

// ========================================
// 主動通知服務
// ========================================

export class LineProactiveNotifier {
  private LINE_API = 'https://api.line.me/v2/bot/message/push'
  private accessToken: string

  constructor() {
    this.accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
  }

  /**
   * 發送通知到 LINE
   */
  private async sendToLine(userId: string, text: string, quickReply?: any): Promise<boolean> {
    if (!this.accessToken) {
      console.warn('[LineProactiveNotifier] No LINE access token configured')
      return false
    }

    try {
      const message: any = {
        type: 'text',
        text,
      }

      if (quickReply) {
        message.quickReply = quickReply
      }

      const response = await fetch(this.LINE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [message],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[LineProactiveNotifier] LINE API error:', errorText)
        return false
      }

      return true
    } catch (error) {
      console.error('[LineProactiveNotifier] Send error:', error)
      return false
    }
  }

  /**
   * 發送通知到群組
   */
  private async sendToGroup(groupId: string, text: string): Promise<boolean> {
    if (!this.accessToken) return false

    try {
      const response = await fetch(this.LINE_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          to: groupId,
          messages: [{ type: 'text', text }],
        }),
      })

      return response.ok
    } catch (error) {
      console.error('[LineProactiveNotifier] Send to group error:', error)
      return false
    }
  }

  // ========================================
  // 庫存相關通知
  // ========================================

  /**
   * 發送庫存不足通知給管理員
   */
  async notifyLowStock(productName: string, currentStock: number, minStock: number): Promise<boolean> {
    const adminGroupId = process.env.LINE_ADMIN_GROUP_ID
    if (!adminGroupId) return false

    const text = `⚠️ 庫存不足警報

產品：${productName}
目前庫存：${currentStock} 桶
最低庫存：${minStock} 桶

請及時補貨！`

    return await this.sendToGroup(adminGroupId, text)
  }

  /**
   * 批量檢查並發送庫存不足通知
   */
  async checkAndNotifyLowStock(): Promise<number> {
    try {
      const lowStockItems = await db.inventory.findMany({
        where: {
          quantity: { lte: db.inventory.fields.minStock },
        },
        include: { product: true },
      })

      let notified = 0
      for (const item of lowStockItems) {
        const success = await this.notifyLowStock(
          item.product?.name || item.product?.capacity || '未知',
          item.quantity,
          item.minStock
        )
        if (success) notified++
      }

      return notified
    } catch (error) {
      console.error('[LineProactiveNotifier] checkAndNotifyLowStock error:', error)
      return 0
    }
  }

  // ========================================
  // 訂單相關通知
  // ========================================

  /**
   * 通知客戶訂單狀態更新
   */
  async notifyOrderStatusUpdate(customerId: string, orderNo: string, status: string): Promise<boolean> {
    try {
      const customer = await db.customer.findUnique({
        where: { id: customerId },
      })

      if (!customer?.lineUserId) return false

      const statusMessages: Record<string, string> = {
        pending: '⏳ 訂單已接收',
        delivering: '🚚 訂單配送中',
        completed: '✅ 訂單已配送完成',
        cancelled: '❌ 訂單已取消',
      }

      const text = `${statusMessages[status] || '訂單狀態更新'}

📋 訂單編號：${orderNo}

感謝您的支持！`

      const quickReply = status === 'delivering' ? {
        items: [
          { type: 'message', label: '查看進度', text: `查詢訂單 ${orderNo}` },
          { type: 'message', label: '聯絡客服', text: '聯絡客服' },
        ],
      } : undefined

      return await this.sendToLine(customer.lineUserId, text, quickReply)
    } catch (error) {
      console.error('[LineProactiveNotifier] notifyOrderStatusUpdate error:', error)
      return false
    }
  }

  /**
   * 通知配送完成
   */
  async notifyDeliveryComplete(customerId: string, orderNo: string): Promise<boolean> {
    try {
      const customer = await db.customer.findUnique({
        where: { id: customerId },
      })

      if (!customer?.lineUserId) return false

      const text = `✅ 配送完成！

📋 訂單編號：${orderNo}
👤 客戶：${customer.name}

感謝您的訂購！

還有其他需要嗎？😊`

      const quickReply = {
        items: [
          { type: 'message', label: '🛒 繼續訂購', text: '我要訂瓦斯' },
          { type: 'message', label: '📦 查庫存', text: '查庫存' },
          { type: 'message', label: '⭐ 評價', text: '我要評價' },
        ],
      }

      return await this.sendToLine(customer.lineUserId, text, quickReply)
    } catch (error) {
      console.error('[LineProactiveNotifier] notifyDeliveryComplete error:', error)
      return false
    }
  }

  // ========================================
  // 促銷相關通知
  // ========================================

  /**
   * 發送促銷通知給所有客戶
   */
  async notifyPromotion(promotionTitle: string, promotionDetails: string): Promise<number> {
    try {
      const customers = await db.customer.findMany({
        where: {
          lineUserId: { not: null },
          isActive: true,
        },
        select: { lineUserId: true, name: true },
      })

      let sent = 0
      for (const customer of customers) {
        if (!customer.lineUserId) continue

        const text = `🎉 ${promotionTitle}

${promotionDetails}

歡迎訂購！感謝您的支持💚`

        const quickReply = {
          items: [
            { type: 'message', label: '🛒 立即訂購', text: '我要訂瓦斯' },
            { type: 'message', label: '📞 聯絡客服', text: '聯絡客服' },
          ],
        }

        const success = await this.sendToLine(customer.lineUserId, text, quickReply)
        if (success) sent++

        // 避免發送太快
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      return sent
    } catch (error) {
      console.error('[LineProactiveNotifier] notifyPromotion error:', error)
      return 0
    }
  }

  // ========================================
  // 後續訂購提醒
  // ========================================

  /**
   * 發送後續訂購提醒
   * 根據客戶訂購週期主動提醒
   */
  async notifyFollowUpOrder(customerId: string, daysSinceLastOrder: number): Promise<boolean> {
    try {
      const customer = await db.customer.findUnique({
        where: { id: customerId },
      })

      if (!customer?.lineUserId) return false

      const text = `👋 好久不見！

距離上次訂購已經 ${daysSinceLastOrder} 天了。

瓦斯還夠用嗎？需要我們為您配送嗎？😊`

      const quickReply = {
        items: [
          { type: 'message', label: '🛒 立即訂購', text: '我要訂瓦斯' },
          { type: 'message', label: '📦 查庫存', text: '查庫存' },
          { type: 'message', label: '💰 查價格', text: '瓦斯多少錢' },
          { type: 'message', label: '❌ 暫不需要', text: '暫不需要' },
        ],
      }

      return await this.sendToLine(customer.lineUserId, text, quickReply)
    } catch (error) {
      console.error('[LineProactiveNotifier] notifyFollowUpOrder error:', error)
      return false
    }
  }

  /**
   * 批量檢查並發送後續訂購提醒
   * 找出超過 30 天未訂購的客戶
   */
  async checkAndNotifyFollowUp(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const customers = await db.customer.findMany({
        where: {
          lineUserId: { not: null },
          isActive: true,
        },
        select: { id: true, lineUserId: true, name: true },
      })

      let notified = 0

      for (const customer of customers) {
        if (!customer.lineUserId) continue

        // 查詢最後一筆訂單
        const lastOrder = await db.gasOrder.findFirst({
          where: { customerId: customer.id },
          orderBy: { createdAt: 'desc' },
        })

        if (!lastOrder) continue

        const daysSinceLastOrder = Math.floor(
          (Date.now() - lastOrder.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )

        // 超過 30 天且少於 45 天（避免重複通知）
        if (daysSinceLastOrder >= 30 && daysSinceLastOrder <= 45) {
          const success = await this.notifyFollowUpOrder(customer.id, daysSinceLastOrder)
          if (success) notified++
        }
      }

      return notified
    } catch (error) {
      console.error('[LineProactiveNotifier] checkAndNotifyFollowUp error:', error)
      return 0
    }
  }

  // ========================================
  // 司機任務通知
  // ========================================

  /**
   * 通知司機新任務
   */
  async notifyDriverNewTask(driverGroupId: string, orderNo: string, customerName: string, address: string): Promise<boolean> {
    const text = `📋 新配送任務

訂單編號：${orderNo}
客戶：${customerName}
地址：${address}

請安排配送，安全行駛！🛵`

    const quickReply = {
      items: [
        { type: 'message', label: '✅ 已收到', text: '收到任務' },
        { type: 'message', label: '📋 查看任務', text: '我的任務' },
      ],
    }

    return await this.sendToGroup(driverGroupId, text)
  }

  // ========================================
  // 管理員報告通知
  // ========================================

  /**
   * 發送每日營運摘要給管理員
   */
  async sendDailySummary(adminGroupId: string): Promise<boolean> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const orders = await db.gasOrder.findMany({
        where: { createdAt: { gte: today } },
      })

      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
      const completedCount = orders.filter(o => o.status === 'completed').length
      const pendingCount = orders.filter(o => o.status === 'pending').length

      const text = `📊 今日營運摘要

📦 訂單數：${orders.length} 單
  ✅ 已完成：${completedCount}
  ⏳ 待處理：${pendingCount}

💰 營業額：NT$${totalRevenue.toLocaleString()}

⏰ 更新時間：${new Date().toLocaleString('zh-TW')}

美好的一天！💪`

      return await this.sendToGroup(adminGroupId, text)
    } catch (error) {
      console.error('[LineProactiveNotifier] sendDailySummary error:', error)
      return false
    }
  }
}

// ========================================
// 導出單例
// ========================================

let notifierInstance: LineProactiveNotifier | null = null

export function getLineProactiveNotifier(): LineProactiveNotifier {
  if (!notifierInstance) {
    notifierInstance = new LineProactiveNotifier()
  }
  return notifierInstance
}
