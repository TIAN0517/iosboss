/**
 * LINE Bot Customer Linking Service
 * Manages linking between LINE userId and Customer records
 */

import { db } from './db'

// ========================================
// Types
// ========================================

export interface LINEProfile {
  userId: string
  displayName?: string
  pictureUrl?: string
  statusMessage?: string
}

export interface LinkResult {
  success: boolean
  customer?: any
  message: string
  isNewCustomer?: boolean
}

// ========================================
// Customer Linking Service
// ========================================

export class LineCustomerLinker {
  /**
   * Get customer by LINE userId
   */
  async getCustomerByLineId(lineUserId: string): Promise<any | null> {
    try {
      const customer = await db.customer.findUnique({
        where: { lineUserId },
      })
      return customer
    } catch (error) {
      console.error('[LineCustomerLinker] getCustomerByLineId error:', error)
      return null
    }
  }

  /**
   * Link LINE user to existing customer by phone
   */
  async linkByPhone(lineUserId: string, phone: string): Promise<LinkResult> {
    try {
      // Find customer by phone
      const customer = await db.customer.findUnique({
        where: { phone },
      })

      if (!customer) {
        return {
          success: false,
          message: `找不到手機號碼 ${phone} 對應的客戶。\n\n請確認號碼是否正確，或使用「我是新客戶」建立新帳戶。`,
        }
      }

      // Check if already linked to another LINE user
      if (customer.lineUserId && customer.lineUserId !== lineUserId) {
        return {
          success: false,
          message: `此客戶已綁定其他 LINE 帳號。\n\n如需變更，請聯繫客服。`,
        }
      }

      // Link the customer
      await db.customer.update({
        where: { id: customer.id },
        data: { lineUserId },
      })

      return {
        success: true,
        customer,
        message: `✅ 綁定成功！\n\n客戶：${customer.name}\n電話：${customer.phone}\n\n現在可以使用 LINE Bot 訂購瓦斯了！`,
        isNewCustomer: false,
      }
    } catch (error) {
      console.error('[LineCustomerLinker] linkByPhone error:', error)
      return {
        success: false,
        message: '綁定時發生錯誤，請稍後再試。',
      }
    }
  }

  /**
   * Create new customer from LINE profile
   */
  async createCustomerFromLINE(
    lineUserId: string,
    data: { name: string; phone: string; address: string }
  ): Promise<LinkResult> {
    try {
      // Check if phone already exists
      const existing = await db.customer.findUnique({
        where: { phone: data.phone },
      })

      if (existing) {
        // Just link to existing customer
        return await this.linkByPhone(lineUserId, data.phone)
      }

      // Check if LINE user already linked
      const existingByLine = await this.getCustomerByLineId(lineUserId)
      if (existingByLine) {
        return {
          success: false,
          customer: existingByLine,
          message: `此 LINE 帳號已綁定客戶：${existingByLine.name}`,
        }
      }

      // Create new customer
      const customer = await db.customer.create({
        data: {
          name: data.name,
          phone: data.phone,
          address: data.address,
          lineUserId,
          paymentType: 'cash',
        },
      })

      return {
        success: true,
        customer,
        message: `✅ 新客戶建立成功！\n\n姓名：${customer.name}\n電話：${customer.phone}\n地址：${customer.address}\n\n歡迎使用九九瓦斯行 LINE Bot！`,
        isNewCustomer: true,
      }
    } catch (error) {
      console.error('[LineCustomerLinker] createCustomerFromLINE error:', error)
      return {
        success: false,
        message: '建立客戶時發生錯誤，請稍後再試。',
      }
    }
  }

  /**
   * Unlink LINE user from customer (admin only)
   */
  async unlink(lineUserId: string): Promise<boolean> {
    try {
      const customer = await this.getCustomerByLineId(lineUserId)
      if (!customer) return false

      await db.customer.update({
        where: { id: customer.id },
        data: { lineUserId: null },
      })

      return true
    } catch (error) {
      console.error('[LineCustomerLinker] unlink error:', error)
      return false
    }
  }

  /**
   * Update customer info from LINE
   */
  async updateCustomer(
    lineUserId: string,
    updates: { name?: string; phone?: string; address?: string }
  ): Promise<LinkResult> {
    try {
      const customer = await this.getCustomerByLineId(lineUserId)
      if (!customer) {
        return {
          success: false,
          message: '找不到綁定的客戶，請先綁定帳戶。',
        }
      }

      // Check if phone is being changed and already exists
      if (updates.phone && updates.phone !== customer.phone) {
        const existing = await db.customer.findUnique({
          where: { phone: updates.phone },
        })
        if (existing && existing.id !== customer.id) {
          return {
            success: false,
            message: '此電話號碼已被其他客戶使用。',
          }
        }
      }

      // Update customer
      const updated = await db.customer.update({
        where: { id: customer.id },
        data: updates,
      })

      return {
        success: true,
        customer: updated,
        message: '✅ 客戶資料更新成功！',
      }
    } catch (error) {
      console.error('[LineCustomerLinker] updateCustomer error:', error)
      return {
        success: false,
        message: '更新客戶資料時發生錯誤，請稍後再試。',
      }
    }
  }

  /**
   * Get customer order history
   */
  async getCustomerOrders(lineUserId: string, limit = 5): Promise<any[]> {
    try {
      const customer = await this.getCustomerByLineId(lineUserId)
      if (!customer) return []

      const orders = await db.gasOrder.findMany({
        where: { customerId: customer.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })

      return orders
    } catch (error) {
      console.error('[LineCustomerLinker] getCustomerOrders error:', error)
      return []
    }
  }
}

// ========================================
// Export singleton
// ========================================

let linkerInstance: LineCustomerLinker | null = null

export function getLineCustomerLinker(): LineCustomerLinker {
  if (!linkerInstance) {
    linkerInstance = new LineCustomerLinker()
  }
  return linkerInstance
}
