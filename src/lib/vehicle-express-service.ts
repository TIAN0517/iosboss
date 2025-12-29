/**
 * 車訊快遞整合服務
 * 中華電訊信車訊快遞系統整合
 * 支援：SMS 通知、配送狀態追蹤、司機位置查詢
 */

import { db } from './db'

// ========================================
// 車訊快遞配置
// ========================================

export interface VehicleExpressConfig {
  enabled: boolean
  // SMS 配置
  smsEnabled: boolean
  smsSenderId: string
  smsTemplate: {
    onWay: string      // 配送中簡訊模板
    arrived: string    // 已到達簡訊模板
    completed: string  // 配送完成簡訊模板
  }
  // API 配置
  apiEndpoint?: string
  apiKey?: string
  // 追蹤配置
  trackingEnabled: boolean
  trackingInterval: number  // 追蹤間隔（秒）
}

// ========================================
// 配送狀態
// ========================================

export enum DeliveryStatus {
  PENDING = 'pending',       // 待配送
  ASSIGNED = 'assigned',     // 已指派司機
  ON_WAY = 'on_way',        // 配送中
  ARRIVED = 'arrived',       // 已到達
  COMPLETED = 'completed',   // 配送完成
  FAILED = 'failed',         // 配送失敗
  CANCELLED = 'cancelled',   // 已取消
}

// ========================================
// SMS 模板變數
// ========================================

interface SMSTemplateVariables {
  customerName: string
  orderNo: string
  driverName?: string
  driverPhone?: string
  estimatedTime?: string
  trackingUrl?: string
}

// ========================================
// 車訊快遞服務
// ========================================

export class VehicleExpressService {
  private config: VehicleExpressConfig

  constructor() {
    // 從環境變量或資料庫讀取配置
    this.config = this.loadConfig()
  }

  /**
   * 載入配置
   */
  private loadConfig(): VehicleExpressConfig {
    return {
      enabled: process.env.VEHICLE_EXPRESS_ENABLED === 'true',
      smsEnabled: process.env.VEHICLE_EXPRESS_SMS_ENABLED === 'true',
      smsSenderId: process.env.VEHICLE_EXPRESS_SENDER_ID || 'JY99GAS',
      smsTemplate: {
        onWay: process.env.VEHICLE_EXPRESS_SMS_ON_WAY || '九九瓦斯行：您的訂單 {orderNo} 正在配送中，預計 {estimatedTime} 送達。司機：{driverName}，電話：{driverPhone}',
        arrived: process.env.VEHICLE_EXPRESS_SMS_ARRIVED || '九九瓦斯行：您的訂單 {orderNo} 已抵達，司機正在送貨中。',
        completed: process.env.VEHICLE_EXPRESS_SMS_COMPLETED || '九九瓦斯行：您的訂單 {orderNo} 已配送完成。感謝您的訂購！',
      },
      apiEndpoint: process.env.VEHICLE_EXPRESS_API_ENDPOINT,
      apiKey: process.env.VEHICLE_EXPRESS_API_KEY,
      trackingEnabled: process.env.VEHICLE_EXPRESS_TRACKING_ENABLED === 'true',
      trackingInterval: parseInt(process.env.VEHICLE_EXPRESS_TRACKING_INTERVAL || '300'),
    }
  }

  /**
   * 發送 SMS 通知
   */
  async sendSMS(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.config.enabled || !this.config.smsEnabled) {
      return { success: false, error: 'Vehicle Express SMS is disabled' }
    }

    try {
      // 車訊快遞 SMS API
      const smsEndpoint = 'https://smsgateway.twsms.com/sms/send'

      // 構建請求
      const params = new URLSearchParams({
        username: process.env.VEHICLE_EXPRESS_SMS_USERNAME || '',
        password: process.env.VEHICLE_EXPRESS_SMS_PASSWORD || '',
        sender: this.config.smsSenderId,
        mobile: this.formatPhoneNumber(phoneNumber),
        message: message,
      })

      const response = await fetch(smsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      const result = await response.json()

      if (result.SUCCESS === 'ok' || result.success === true) {
        console.log(`[VehicleExpress] SMS sent to ${phoneNumber}`)
        return {
          success: true,
          messageId: result.msgid || result.messageId,
        }
      } else {
        console.error('[VehicleExpress] SMS failed:', result)
        return {
          success: false,
          error: result.message || 'SMS send failed',
        }
      }
    } catch (error: any) {
      console.error('[VehicleExpress] SMS error:', error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 格式化電話號碼（去掉 0，加 +886）
   */
  private formatPhoneNumber(phone: string): string {
    // 移除所有非數字字符
    let cleaned = phone.replace(/\D/g, '')

    // 如果是 09 開頭，轉換為 +886-9...
    if (cleaned.startsWith('09')) {
      return '+886-' + cleaned.substring(1)
    }

    // 如果是 0 開頭，去掉 0
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1)
    }

    return '+886-' + cleaned
  }

  /**
   * 生成簡訊內容
   */
  private generateSMSMessage(
    template: string,
    variables: SMSTemplateVariables
  ): string {
    let message = template

    message = message.replace('{customerName}', variables.customerName)
    message = message.replace('{orderNo}', variables.orderNo)
    message = message.replace('{driverName}', variables.driverName || '司機')
    message = message.replace('{driverPhone}', variables.driverPhone || '請致電客服')
    message = message.replace('{estimatedTime}', variables.estimatedTime || '尽快')
    message = message.replace('{trackingUrl}', variables.trackingUrl || '')

    return message
  }

  // ========================================
  // 配送狀態通知
  // ========================================

  /**
   * 通知配送中
   */
  async notifyOnWay(orderId: string, driverId: string): Promise<void> {
    const order = await db.gasOrder.findUnique({
      where: { id: orderId },
      include: { customer: true, driver: true },
    })

    if (!order || !order.customer) return

    const variables: SMSTemplateVariables = {
      customerName: order.customer.name,
      orderNo: order.orderNo,
      driverName: order.driver?.name,
      driverPhone: order.driver?.phone,
    }

    const message = this.generateSMSMessage(this.config.smsTemplate.onWay, variables)

    await this.sendSMS(order.customer.phone, message)

    // 更新配送狀態
    await this.updateDeliveryStatus(orderId, DeliveryStatus.ON_WAY)
  }

  /**
   * 通知已到達
   */
  async notifyArrived(orderId: string): Promise<void> {
    const order = await db.gasOrder.findUnique({
      where: { id: orderId },
      include: { customer: true },
    })

    if (!order || !order.customer) return

    const variables: SMSTemplateVariables = {
      customerName: order.customer.name,
      orderNo: order.orderNo,
    }

    const message = this.generateSMSMessage(this.config.smsTemplate.arrived, variables)

    await this.sendSMS(order.customer.phone, message)

    await this.updateDeliveryStatus(orderId, DeliveryStatus.ARRIVED)
  }

  /**
   * 通知配送完成
   */
  async notifyCompleted(orderId: string): Promise<void> {
    const order = await db.gasOrder.findUnique({
      where: { id: orderId },
      include: { customer: true },
    })

    if (!order || !order.customer) return

    const variables: SMSTemplateVariables = {
      customerName: order.customer.name,
      orderNo: order.orderNo,
    }

    const message = this.generateSMSMessage(this.config.smsTemplate.completed, variables)

    await this.sendSMS(order.customer.phone, message)

    // 更新訂單狀態為已完成
    await db.gasOrder.update({
      where: { id: orderId },
      data: { status: 'completed' },
    })

    await this.updateDeliveryStatus(orderId, DeliveryStatus.COMPLETED)
  }

  /**
   * 更新配送狀態
   */
  private async updateDeliveryStatus(
    orderId: string,
    status: DeliveryStatus
  ): Promise<void> {
    try {
      await db.deliveryRecord.upsert({
        where: { orderId },
        create: {
          orderId,
          customerId: (await db.gasOrder.findUnique({ where: { id: orderId } }))?.customerId || '',
          status,
          deliveryDate: new Date(),
        },
        update: {
          status,
          ...(status === DeliveryStatus.COMPLETED && {
            completedAt: new Date(),
          }),
        },
      })
    } catch (error) {
      console.error('[VehicleExpress] updateDeliveryStatus error:', error)
    }
  }

  // ========================================
  // 追蹤 URL 生成
  // ========================================

  /**
   * 生成配送追蹤 URL
   */
  generateTrackingUrl(orderNo: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
    return `${baseUrl}/track/${orderNo}`
  }

  // ========================================
  // 批量通知
  // ========================================

  /**
   * 批量通知今日配送客戶
   */
  async notifyTodayDeliveries(): Promise<{ sent: number; failed: number }> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const orders = await db.gasOrder.findMany({
      where: {
        deliveryDate: { gte: today },
        status: { in: ['pending', 'delivering'] },
      },
      include: { customer: true, driver: true },
    })

    let sent = 0
    let failed = 0

    for (const order of orders) {
      if (order.driverId && order.status === 'pending') {
        const result = await this.notifyOnWay(order.id, order.driverId)
        if (result.success) {
          sent++
        } else {
          failed++
        }
      }
    }

    return { sent, failed }
  }

  // ========================================
  // 配置管理
  // ========================================

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<VehicleExpressConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 獲取配置
   */
  getConfig(): VehicleExpressConfig {
    return { ...this.config }
  }

  /**
   * 測試 SMS 發送
   */
  async testSMS(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    const testMessage = `【九九瓦斯行】車訊快遞整合測試簡訊 - ${new Date().toLocaleString('zh-TW')}`
    const result = await this.sendSMS(phoneNumber, testMessage)
    return result
  }
}

// ========================================
// 導出單例
// ========================================

let vehicleExpressInstance: VehicleExpressService | null = null

export function getVehicleExpressService(): VehicleExpressService {
  if (!vehicleExpressInstance) {
    vehicleExpressInstance = new VehicleExpressService()
  }
  return vehicleExpressInstance
}

// ========================================
// 環境變量配置說明
// ========================================

/**
 * 在 .env 或 .env.docker 中添加以下配置：
 *
 * # 車訊快遞整合
 * VEHICLE_EXPRESS_ENABLED=true                    # 啟用車訊快遞
 * VEHICLE_EXPRESS_SMS_ENABLED=true                # 啟用 SMS 通知
 * VEHICLE_EXPRESS_SENDER_ID=JY99GAS              # 簡訽發送者 ID
 * VEHICLE_EXPRESS_SMS_USERNAME=your_username     # SMS 帳號
 * VEHICLE_EXPRESS_SMS_PASSWORD=your_password     # SMS 密碼
 *
 * # SMS 模板（可選，有預設值）
 * VEHICLE_EXPRESS_SMS_ON_WAY=九九瓦斯行：您的訂單 {orderNo} 正在配送中...
 * VEHICLE_EXPRESS_SMS_ARRIVED=九九瓦斯行：您的訂單 {orderNo} 已抵達...
 * VEHICLE_EXPRESS_SMS_COMPLETED=九九瓦斯行：您的訂單 {orderNo} 已配送完成...
 *
 * # 追蹤設定
 * VEHICLE_EXPRESS_TRACKING_ENABLED=true          # 啟用追蹤功能
 * VEHICLE_EXPRESS_TRACKING_INTERVAL=300          # 追蹤間隔（秒）
 */
