/**
 * AI 操作執行器
 * 負責解析 AI 回應並執行實際的業務操作
 */

import { db } from '@/lib/db'
import { generateOrderNo } from '@/lib/order-utils'

export interface ParsedAction {
  action: string
  data: any
  message?: string
}

export class AIActionExecutor {
  /**
   * 解析 AI 回應中的 JSON 操作指令
   */
  static parseAction(response: string): ParsedAction | null {
    try {
      // 嘗試從回應中提取 JSON
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                       response.match(/```\s*([\s\S]*?)\s*```/) ||
                       response.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        const parsed = JSON.parse(jsonStr)
        
        if (parsed.action && parsed.data) {
          return {
            action: parsed.action,
            data: parsed.data,
            message: parsed.message,
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('[AIActionExecutor] Parse error:', error)
      return null
    }
  }

  /**
   * 執行操作
   */
  static async executeAction(action: ParsedAction, userId?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const { action: actionType, data } = action

    try {
      switch (actionType) {
        case 'create_order':
          return await this.executeCreateOrder(data, userId)

        case 'create_customer':
          return await this.executeCreateCustomer(data)

        case 'check_inventory':
          return await this.executeCheckInventory()

        case 'check_revenue':
          return await this.executeCheckRevenue()

        case 'check_order':
          return await this.executeCheckOrder(data)

        case 'add_cost':
          return await this.executeAddCost(data, userId)

        case 'add_check':
          return await this.executeAddCheck(data)

        case 'get_statistics':
          return await this.executeGetStatistics()

        default:
          return {
            success: false,
            message: '未知的操作類型',
          }
      }
    } catch (error: any) {
      console.error('[AIActionExecutor] Execute error:', error)
      return {
        success: false,
        message: `執行操作時發生錯誤：${error.message || '未知錯誤'}`,
      }
    }
  }

  /**
   * 執行創建訂單
   */
  private static async executeCreateOrder(data: any, userId?: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { customer: customerName, items, customerId } = data

      // 1. 查找客戶
      let customer
      if (customerId) {
        customer = await db.customer.findUnique({ where: { id: customerId } })
      } else if (customerName) {
        customer = await db.customer.findFirst({
          where: { name: { contains: customerName } },
        })
      }

      if (!customer) {
        return {
          success: false,
          message: `找不到客戶「${customerName || '未知'}」，請先新增客戶。`,
        }
      }

      // 2. 處理訂單項目
      const orderItems = []
      for (const item of items || []) {
        const { size, quantity = 1, productId } = item

        // 查找產品
        let product
        if (productId) {
          product = await db.product.findUnique({
            where: { id: productId },
            include: { inventory: true },
          })
        } else if (size) {
          product = await db.product.findFirst({
            where: {
              capacity: size,
              isActive: true,
            },
            include: { inventory: true },
          })
        }

        if (!product) {
          return {
            success: false,
            message: `找不到產品「${size || '未知'}」，請檢查產品規格。`,
          }
        }

        // 檢查庫存
        if (!product.inventory || product.inventory.quantity < quantity) {
          return {
            success: false,
            message: `${product.name} 庫存不足。現有庫存：${product.inventory?.quantity || 0} 桶，需要：${quantity} 桶`,
          }
        }

        orderItems.push({
          productId: product.id,
          quantity,
          unitPrice: product.price,
          subtotal: product.price * quantity,
        })
      }

      if (orderItems.length === 0) {
        return {
          success: false,
          message: '訂單項目不能為空',
        }
      }

      // 3. 計算總額
      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0)
      
      // 獲取客戶折扣
      const customerGroup = customer.groupId
        ? await db.customerGroup.findUnique({ where: { id: customer.groupId } })
        : null
      const discount = subtotal * (customerGroup?.discount || 0)
      const deliveryFee = subtotal >= 2000 ? 0 : 50
      const total = subtotal - discount + deliveryFee

      // 4. 生成訂單號
      const orderNo = generateOrderNo()

      // 5. 創建訂單（事務）
      const order = await db.$transaction(async (tx) => {
        // 創建訂單
        const newOrder = await tx.gasOrder.create({
          data: {
            orderNo,
            customerId: customer.id,
            orderDate: new Date(),
            deliveryDate: new Date(),
            status: 'pending',
            subtotal,
            discount,
            deliveryFee,
            total,
            note: '來自 AI 助手',
          },
        })

        // 創建訂單項目
        await tx.gasOrderItem.createMany({
          data: orderItems.map(item => ({
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        })

        // 扣除庫存並記錄變動
        for (const item of orderItems) {
          const inventory = await tx.inventory.findUnique({
            where: { productId: item.productId },
          })

          if (inventory) {
            const newQuantity = inventory.quantity - item.quantity
            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantity: newQuantity },
            })

            await tx.inventoryTransaction.create({
              data: {
                productId: item.productId,
                type: 'delivery',
                quantity: -item.quantity,
                quantityBefore: inventory.quantity,
                quantityAfter: newQuantity,
                reason: `訂單 ${orderNo}`,
              },
            })
          }
        }

        // 更新客戶最後訂單時間
        await tx.customer.update({
          where: { id: customer.id },
          data: { lastOrderAt: new Date() },
        })

        return newOrder
      })

      return {
        success: true,
        message: `✅ 訂單已建立！

📋 訂單編號：${orderNo}
👤 客戶：${customer.name}
💰 總額：NT$${total.toLocaleString()}
📅 狀態：待處理

訂單已成功建立並扣除庫存！`,
        data: { orderNo, orderId: order.id },
      }
    } catch (error: any) {
      console.error('[AIActionExecutor] Create order error:', error)
      return {
        success: false,
        message: `創建訂單失敗：${error.message || '未知錯誤'}`,
      }
    }
  }

  /**
   * 執行創建客戶
   */
  private static async executeCreateCustomer(data: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { name, phone, address, groupId } = data

      if (!name) {
        return {
          success: false,
          message: '客戶姓名不能為空',
        }
      }

      // 檢查電話是否已存在
      if (phone) {
        const existing = await db.customer.findUnique({
          where: { phone },
        })
        if (existing) {
          return {
            success: false,
            message: `電話 ${phone} 已存在，客戶：${existing.name}`,
          }
        }
      }

      // 創建客戶
      const customer = await db.customer.create({
        data: {
          name,
          phone: phone || '',
          address: address || '',
          groupId: groupId || null,
        },
      })

      return {
        success: true,
        message: `✅ 客戶已建立！

👤 姓名：${customer.name}
${phone ? `📞 電話：${phone}` : ''}
${address ? `📍 地址：${address}` : ''}

客戶資料已成功建立！`,
        data: { customerId: customer.id },
      }
    } catch (error: any) {
      console.error('[AIActionExecutor] Create customer error:', error)
      return {
        success: false,
        message: `創建客戶失敗：${error.message || '未知錯誤'}`,
      }
    }
  }

  /**
   * 執行查詢庫存
   */
  private static async executeCheckInventory(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const inventories = await db.inventory.findMany({
        include: {
          product: {
            include: { category: true },
          },
        },
        orderBy: {
          product: {
            name: 'asc',
          },
        },
      })

      const inventoryList = inventories.map(inv => ({
        name: inv.product.name,
        capacity: inv.product.capacity,
        quantity: inv.quantity,
        minStock: inv.minStock,
        status: inv.quantity < inv.minStock ? '⚠️ 低庫存' : '✅ 充足',
      }))

      const lowStockItems = inventoryList.filter(item => item.quantity < item.minStock)

      let message = `📦 **庫存狀況**\n\n`
      
      inventoryList.forEach(item => {
        message += `${item.status} ${item.name}：${item.quantity} 桶（安全庫存：${item.minStock} 桶）\n`
      })

      if (lowStockItems.length > 0) {
        message += `\n⚠️ **需要補貨**\n`
        lowStockItems.forEach(item => {
          message += `• ${item.name}：建議補貨 ${item.minStock * 2 - item.quantity} 桶\n`
        })
      }

      return {
        success: true,
        message,
        data: { inventories: inventoryList },
      }
    } catch (error: any) {
      console.error('[AIActionExecutor] Check inventory error:', error)
      return {
        success: false,
        message: `查詢庫存失敗：${error.message || '未知錯誤'}`,
      }
    }
  }

  /**
   * 執行查詢營收
   */
  private static async executeCheckRevenue(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // 查詢今日訂單
      const todayOrders = await db.gasOrder.findMany({
        where: {
          orderDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      })

      const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)
      const todayOrdersCount = todayOrders.length

      // 查詢本月訂單
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthOrders = await db.gasOrder.findMany({
        where: {
          orderDate: {
            gte: monthStart,
          },
        },
      })

      const monthRevenue = monthOrders.reduce((sum, order) => sum + order.total, 0)
      const monthOrdersCount = monthOrders.length

      // 查詢成本
      const monthCosts = await db.costRecord.findMany({
        where: {
          date: {
            gte: monthStart,
          },
        },
      })

      const totalCost = monthCosts.reduce((sum, cost) => sum + cost.amount, 0)
      const profit = monthRevenue - totalCost
      const profitRate = monthRevenue > 0 ? (profit / monthRevenue) * 100 : 0

      const message = `💰 **營收報告**

📅 **今日**
• 訂單數：${todayOrdersCount} 筆
• 營收：NT$${todayRevenue.toLocaleString()}

📊 **本月**
• 訂單數：${monthOrdersCount} 筆
• 營收：NT$${monthRevenue.toLocaleString()}
• 成本：NT$${totalCost.toLocaleString()}
• 淨利潤：NT$${profit.toLocaleString()}
• 利潤率：${profitRate.toFixed(1)}%

${profitRate > 30 ? '🌟 利潤率表現很好！' : profitRate > 20 ? '👍 利潤率正常' : '⚠️ 利潤率偏低，建議檢查成本'}`

      return {
        success: true,
        message,
        data: {
          today: { revenue: todayRevenue, orders: todayOrdersCount },
          month: { revenue: monthRevenue, orders: monthOrdersCount, cost: totalCost, profit, profitRate },
        },
      }
    } catch (error: any) {
      console.error('[AIActionExecutor] Check revenue error:', error)
      return {
        success: false,
        message: `查詢營收失敗：${error.message || '未知錯誤'}`,
      }
    }
  }

  /**
   * 執行查詢訂單
   */
  private static async executeCheckOrder(data: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { customerName, orderNo, status } = data

      let where: any = {}
      
      if (orderNo) {
        where.orderNo = { contains: orderNo }
      } else if (customerName) {
        const customer = await db.customer.findFirst({
          where: { name: { contains: customerName } },
        })
        if (customer) {
          where.customerId = customer.id
        } else {
          return {
            success: false,
            message: `找不到客戶「${customerName}」`,
          }
        }
      }

      if (status) {
        where.status = status
      }

      const orders = await db.gasOrder.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: { product: true },
          },
        },
        orderBy: { orderDate: 'desc' },
        take: 10,
      })

      if (orders.length === 0) {
        return {
          success: true,
          message: '沒有找到相關訂單',
        }
      }

      let message = `📋 **訂單查詢結果**（共 ${orders.length} 筆）\n\n`
      
      orders.forEach((order, index) => {
        message += `${index + 1}. 訂單 ${order.orderNo}\n`
        message += `   客戶：${order.customer.name}\n`
        message += `   金額：NT$${order.total.toLocaleString()}\n`
        message += `   狀態：${order.status}\n`
        message += `   日期：${order.orderDate.toLocaleDateString('zh-TW')}\n\n`
      })

      return {
        success: true,
        message,
        data: { orders },
      }
    } catch (error: any) {
      console.error('[AIActionExecutor] Check order error:', error)
      return {
        success: false,
        message: `查詢訂單失敗：${error.message || '未知錯誤'}`,
      }
    }
  }

  /**
   * 執行記錄成本
   */
  private static async executeAddCost(data: any, userId?: string): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { type, category, amount, description } = data

      if (!type || !category || !amount) {
        return {
          success: false,
          message: '成本記錄缺少必要信息（類型、類別、金額）',
        }
      }

      const costRecord = await db.costRecord.create({
        data: {
          type,
          category,
          amount: parseFloat(amount),
          description: description || '',
          date: new Date(),
          recordedBy: userId || null,
        },
      })

      return {
        success: true,
        message: `✅ 成本已記錄！

類型：${type}
類別：${category}
金額：NT$${amount.toLocaleString()}
${description ? `說明：${description}` : ''}

成本記錄已成功建立！`,
        data: { costRecordId: costRecord.id },
      }
    } catch (error: any) {
      console.error('[AIActionExecutor] Add cost error:', error)
      return {
        success: false,
        message: `記錄成本失敗：${error.message || '未知錯誤'}`,
      }
    }
  }

  /**
   * 執行記錄支票
   */
  private static async executeAddCheck(data: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { checkNo, bankName, amount, checkDate, customerId } = data

      if (!checkNo || !bankName || !amount) {
        return {
          success: false,
          message: '支票記錄缺少必要信息（支票號、銀行、金額）',
        }
      }

      const check = await db.check.create({
        data: {
          checkNo,
          bankName,
          amount: parseFloat(amount),
          checkDate: checkDate ? new Date(checkDate) : new Date(),
          customerId: customerId || null,
          status: 'pending',
        },
      })

      return {
        success: true,
        message: `✅ 支票已記錄！

支票號：${checkNo}
銀行：${bankName}
金額：NT$${amount.toLocaleString()}
日期：${check.checkDate.toLocaleDateString('zh-TW')}

支票記錄已成功建立！`,
        data: { checkId: check.id },
      }
    } catch (error: any) {
      console.error('[AIActionExecutor] Add check error:', error)
      return {
        success: false,
        message: `記錄支票失敗：${error.message || '未知錯誤'}`,
      }
    }
  }

  /**
   * 執行獲取統計
   */
  private static async executeGetStatistics(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // 今日訂單
      const todayOrders = await db.gasOrder.findMany({
        where: {
          orderDate: {
            gte: today,
          },
        },
      })

      // 今日營收
      const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0)

      // 庫存狀況
      const inventories = await db.inventory.findMany({
        include: { product: true },
      })
      const lowStockCount = inventories.filter(inv => inv.quantity < inv.minStock).length

      // 待配送訂單
      const pendingOrders = await db.gasOrder.findMany({
        where: { status: 'pending' },
      })

      const message = `📊 **今日營運概況**

📦 **訂單**
• 今日訂單：${todayOrders.length} 筆
• 今日營收：NT$${todayRevenue.toLocaleString()}
• 待配送：${pendingOrders.length} 筆

📦 **庫存**
• 總商品數：${inventories.length} 種
• 低庫存：${lowStockCount} 種
${lowStockCount > 0 ? '⚠️ 建議檢查庫存並補貨' : '✅ 庫存充足'}

💡 **建議**
${todayRevenue > 50000 ? '🌟 今日營收表現很好！' : todayRevenue > 30000 ? '👍 今日營收正常' : '💪 繼續努力！'}
${lowStockCount > 0 ? '• 檢查低庫存商品並及時補貨' : ''}
${pendingOrders.length > 5 ? '• 待配送訂單較多，建議加快處理' : ''}`

      return {
        success: true,
        message,
        data: {
          today: { orders: todayOrders.length, revenue: todayRevenue },
          inventory: { total: inventories.length, lowStock: lowStockCount },
          pending: pendingOrders.length,
        },
      }
    } catch (error: any) {
      console.error('[AIActionExecutor] Get statistics error:', error)
      return {
        success: false,
        message: `獲取統計失敗：${error.message || '未知錯誤'}`,
      }
    }
  }
}
