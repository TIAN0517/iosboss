/**
 * 外部系統整合服務
 * 支持與外部會計/ERP 系統的數據同步
 * 透過 Webhook 推送數據到外部系統
 */

import { db } from './db'

// ========================================
// 整合配置類型
// ========================================

export enum SyncEventType {
  // 客戶相關
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',

  // 訂單相關
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_COMPLETED = 'order.completed',

  // 支票相關
  CHECK_CREATED = 'check.created',
  CHECK_CLEARED = 'check.cleared',

  // 庫存相關
  INVENTORY_UPDATED = 'inventory.updated',
  INVENTORY_LOW = 'inventory.low',

  // 結算相關
  PAYMENT_RECEIVED = 'payment.received',
  MONTHLY_STATEMENT = 'statement.generated',
}

export interface ExternalSystemConfig {
  id: string
  name: string
  webhookUrl: string
  apiKey?: string
  apiSecret?: string
  isActive: boolean
  events: SyncEventType[]  // 訂閱的事件
  headers?: Record<string, string>
  retryCount: number
  timeout: number
}

export interface WebhookPayload {
  event: SyncEventType
  eventId: string
  timestamp: string
  data: any
  signature?: string
}

export interface SyncResult {
  success: boolean
  systemId: string
  eventName: string
  status: number
  message: string
  retried?: boolean
}

// ========================================
// 外部系統整合服務
// ========================================

export class ExternalSystemSyncService {
  private readonly MAX_RETRY = 3
  private readonly TIMEOUT = 30000  // 30 秒

  /**
   * 發送 webhook 到外部系統
   */
  async sendWebhook(
    systemConfig: ExternalSystemConfig,
    payload: WebhookPayload
  ): Promise<SyncResult> {
    const startTime = Date.now()

    try {
      // 構建請求 headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'JY99-Gas-Integration/1.0',
        ...systemConfig.headers,
      }

      // 添加 API Key
      if (systemConfig.apiKey) {
        headers['X-API-Key'] = systemConfig.apiKey
        headers['Authorization'] = `Bearer ${systemConfig.apiKey}`
      }

      // 生成簽名
      if (systemConfig.apiSecret) {
        payload.signature = this.generateSignature(payload, systemConfig.apiSecret)
        headers['X-Signature'] = payload.signature
      }

      // 發送請求
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), systemConfig.timeout || this.TIMEOUT)

      const response = await fetch(systemConfig.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const elapsed = Date.now() - startTime

      if (response.ok) {
        console.log(`[ExternalSystemSync] Webhook sent successfully: ${systemConfig.name} - ${payload.event} (${elapsed}ms)`)

        // 記錄同步成功
        await this.recordSyncLog({
          systemId: systemConfig.id,
          eventType: payload.event,
          recordId: payload.eventId,
          status: 'success',
          payload: payload,
          responseData: await response.text().catch(() => null),
          duration: elapsed,
        })

        return {
          success: true,
          systemId: systemConfig.id,
          eventName: payload.event,
          status: response.status,
          message: 'Webhook sent successfully',
        }
      } else {
        const errorText = await response.text()

        // 記錄同步失敗
        await this.recordSyncLog({
          systemId: systemConfig.id,
          eventType: payload.event,
          recordId: payload.eventId,
          status: 'failed',
          payload: payload,
          errorMessage: `HTTP ${response.status}: ${errorText}`,
          duration: elapsed,
        })

        return {
          success: false,
          systemId: systemConfig.id,
          eventName: payload.event,
          status: response.status,
          message: errorText || 'HTTP error',
        }
      }
    } catch (error: any) {
      const elapsed = Date.now() - startTime

      // 記錄同步失敗
      await this.recordSyncLog({
        systemId: systemConfig.id,
        eventType: payload.event,
        recordId: payload.eventId,
        status: 'failed',
        payload: payload,
        errorMessage: error.message || String(error),
        duration: elapsed,
      })

      return {
        success: false,
        systemId: systemConfig.id,
        eventName: payload.event,
        status: 0,
        message: error.message || 'Network error',
      }
    }
  }

  /**
   * 發送事件到所有訂閱的外部系統
   */
  async syncEvent(
    eventType: SyncEventType,
    data: any,
    eventId: string
  ): Promise<SyncResult[]> {
    // 獲取所有啟用且訂閱此事件的外部系統
    const systems = await this.getActiveSystemsForEvent(eventType)

    if (systems.length === 0) {
      console.log(`[ExternalSystemSync] No external systems subscribed to event: ${eventType}`)
      return []
    }

    const payload: WebhookPayload = {
      event: eventType,
      eventId,
      timestamp: new Date().toISOString(),
      data,
    }

    const results: SyncResult[] = []

    for (const system of systems) {
      const result = await this.sendWebhook(system, payload)
      results.push(result)

      // 失敗重試
      if (!result.success && system.retryCount > 0) {
        for (let i = 1; i <= system.retryCount; i++) {
          console.log(`[ExternalSystemSync] Retrying (${i}/${system.retryCount}): ${system.name}`)
          await new Promise(resolve => setTimeout(resolve, 1000 * i))  // 指數退避

          const retryResult = await this.sendWebhook(system, payload)
          if (retryResult.success) {
            results.push({ ...retryResult, retried: true })
            break
          }
        }
      }
    }

    return results
  }

  /**
   * 獲取訂閱特定事件的外部系統
   */
  private async getActiveSystemsForEvent(eventType: SyncEventType): Promise<ExternalSystemConfig[]> {
    try {
      const systems = await db.externalSystem.findMany({
        where: {
          isActive: true,
          events: { has: eventType },
        },
      })

      return systems.map(s => ({
        id: s.id,
        name: s.name,
        webhookUrl: s.webhookUrl,
        apiKey: s.apiKey || undefined,
        apiSecret: s.apiSecret || undefined,
        isActive: s.isActive,
        events: s.events as SyncEventType[],
        headers: (s.headers as Record<string, string>) || undefined,
        retryCount: s.retryCount,
        timeout: s.timeout,
      }))
    } catch (error) {
      console.error('[ExternalSystemSync] getActiveSystemsForEvent error:', error)
      return []
    }
  }

  /**
   * 生成 HMAC 簽名
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const crypto = require('crypto')
    const payloadString = JSON.stringify(payload.data) + payload.timestamp
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')
  }

  /**
   * 驗證 webhook 簽名
   */
  static verifySignature(payload: any, signature: string, secret: string): boolean {
    const crypto = require('crypto')
    const payloadString = JSON.stringify(payload.data) + payload.timestamp
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')
    return signature === expectedSignature
  }

  /**
   * 記錄同步日誌
   */
  private async recordSyncLog(data: {
    systemId: string
    eventType: string
    recordId: string
    status: string
    payload?: any
    responseData?: string | null
    errorMessage?: string
    duration?: number
  }): Promise<void> {
    try {
      await db.webhookLog.create({
        data: {
          systemId: data.systemId,
          eventType: data.eventType,
          recordId: data.recordId,
          status: data.status,
          payload: data.payload || {},
          response: data.responseData,
          errorMessage: data.errorMessage,
          duration: data.duration,
        },
      })

      // 同時更新系統最後狀態
      await db.externalSystem.update({
        where: { id: data.systemId },
        data: {
          lastStatus: data.status === 'success' ? 'success' : 'failed',
          lastSyncAt: new Date(),
        },
      })
    } catch (error) {
      console.error('[ExternalSystemSync] recordSyncLog error:', error)
    }
  }

  // ========================================
  // 便捷方法 - 觸發特定事件的同步
  // ========================================

  /**
   * 客戶創建同步
   */
  async syncCustomerCreated(customer: any): Promise<SyncResult[]> {
    return await this.syncEvent(
      SyncEventType.CUSTOMER_CREATED,
      {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        paymentType: customer.paymentType,
        groupId: customer.groupId,
        createdAt: customer.createdAt,
      },
      customer.id
    )
  }

  /**
   * 訂單創建同步
   */
  async syncOrderCreated(order: any, includeItems = true): Promise<SyncResult[]> {
    const orderData = {
      id: order.id,
      orderNo: order.orderNo,
      customerId: order.customerId,
      customerName: order.customer?.name,
      customerPhone: order.customer?.phone,
      orderDate: order.orderDate,
      deliveryDate: order.deliveryDate,
      status: order.status,
      subtotal: order.subtotal,
      discount: order.discount,
      deliveryFee: order.deliveryFee,
      total: order.total,
      note: order.note,
      ...(includeItems && {
        items: order.items?.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })) || [],
      }),
    }

    return await this.syncEvent(
      SyncEventType.ORDER_CREATED,
      orderData,
      order.id
    )
  }

  /**
   * 訂單完成同步
   */
  async syncOrderCompleted(order: any): Promise<SyncResult[]> {
    return await this.syncEvent(
      SyncEventType.ORDER_COMPLETED,
      {
        id: order.id,
        orderNo: order.orderNo,
        customerId: order.customerId,
        completedAt: new Date().toISOString(),
        total: order.total,
        paidAmount: order.paidAmount,
      },
      order.id
    )
  }

  /**
   * 支票創建同步
   */
  async syncCheckCreated(check: any): Promise<SyncResult[]> {
    return await this.syncEvent(
      SyncEventType.CHECK_CREATED,
      {
        id: check.id,
        checkNo: check.checkNo,
        customerId: check.customerId,
        customerName: check.customer?.name,
        bankName: check.bankName,
        checkDate: check.checkDate,
        amount: check.amount,
        status: check.status,
        orderId: check.orderId,
      },
      check.id
    )
  }

  /**
   * 庫存不足同步
   */
  async syncInventoryLow(inventory: any): Promise<SyncResult[]> {
    return await this.syncEvent(
      SyncEventType.INVENTORY_LOW,
      {
        productId: inventory.productId,
        productName: inventory.product?.name,
        currentQuantity: inventory.quantity,
        minStock: inventory.minStock,
      },
      inventory.productId
    )
  }

  /**
   * 月度結算單同步
   */
  async syncMonthlyStatement(statement: any): Promise<SyncResult[]> {
    return await this.syncEvent(
      SyncEventType.MONTHLY_STATEMENT,
      {
        id: statement.id,
        customerId: statement.customerId,
        customerName: statement.customer?.name,
        month: statement.month,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        totalOrders: statement.totalOrders,
        totalAmount: statement.totalAmount,
        paidAmount: statement.paidAmount,
        balance: statement.balance,
        status: statement.status,
      },
      statement.id
    )
  }

  /**
   * 測試連接
   */
  async testConnection(system: ExternalSystemConfig): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now()

    try {
      const testPayload: WebhookPayload = {
        event: 'test.connection' as any,
        eventId: 'test-' + Date.now(),
        timestamp: new Date().toISOString(),
        data: { message: 'Connection test from JY99 Gas System' },
      }

      const result = await this.sendWebhook(system, testPayload)
      const latency = Date.now() - startTime

      return {
        success: result.success,
        message: result.success
          ? `連接成功！延遲 ${latency}ms`
          : `連接失敗：${result.message}`,
        latency,
      }
    } catch (error: any) {
      return {
        success: false,
        message: `連接錯誤：${error.message}`,
      }
    }
  }
}

// ========================================
// 導出單例
// ========================================

let syncServiceInstance: ExternalSystemSyncService | null = null

export function getExternalSystemSyncService(): ExternalSystemSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new ExternalSystemSyncService()
  }
  return syncServiceInstance
}
