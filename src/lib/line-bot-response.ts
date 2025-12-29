/**
 * LINE Bot 回應生成器
 * 根據意圖分析結果生成適當的回應訊息
 * 支持文字、Flex 訊息、Quick Reply 等格式
 */

import { LineIntent, GroupType } from './line-bot-intent'

// ========================================
// 回應格式定義
// ========================================

export type ResponseFormat = 'text' | 'flex' | 'quick_reply'

export interface LineMessageResponse {
  type: ResponseFormat
  text?: string
  flex?: any
  quickReply?: {
    items: Array<{
      type: string
      label: string
      data: string
      text?: string
    }>
  }
}

// ========================================
// Flex 訊息模板
// ========================================

const FLEX_TEMPLATES = {
  // 訂單確認模板
  orderConfirm: (data: any) => ({
    type: 'bubble',
    styles: {
      header: { backgroundColor: '#10b981', color: '#ffffff', size: 'lg' },
      body: { backgroundColor: '#f0fdf4', color: '#166534' },
      footer: { backgroundColor: '#dcfce7', color: '#166534' },
    },
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '🛒 訂單確認', weight: 'bold', color: '#ffffff', size: 'xl' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `客戶：${data.customer || '未指定'}`, size: 'sm', color: '#166534' },
        { type: 'text', text: `商品：${data.product || '20kg瓦斯'}`, size: 'sm', color: '#166534' },
        { type: 'text', text: `數量：${data.quantity || 1} 桶`, size: 'sm', color: '#166534' },
        { type: 'text', text: `金額：NT$${data.total || '計算中'}`, size: 'sm', color: '#166534', weight: 'bold' },
        { type: 'separator', margin: 'md' },
        { type: 'text', text: '預計配送時間：今日下午', size: 'xs', color: '#6b7280' },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: { type: 'message', label: '確認訂單', text: '確認訂單' },
          style: 'primary',
          color: '#10b981',
        },
        {
          type: 'button',
          action: { type: 'message', label: '修改訂單', text: '修改訂單' },
          style: 'secondary',
          color: '#6b7280',
        },
      ],
    },
  }),

  // 庫存查詢模板
  inventory: (items: any[]) => ({
    type: 'carousel',
    contents: items.map(item => ({
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: '📦', align: 'center', size: '5xl' },
        ],
        backgroundColor: item.quantity <= item.minStock ? '#fef3c7' : '#d1fae5',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: item.name || item.size, weight: 'bold', size: 'lg', align: 'center' },
          { type: 'text', text: `庫存：${item.quantity} 桶`, align: 'center', size: 'sm', color: '#6b7280' },
          {
            type: 'text',
            text: item.quantity <= item.minStock ? '⚠️ 庫存不足' : '✅ 庫存充足',
            align: 'center',
            size: 'xs',
            color: item.quantity <= item.minStock ? '#dc2626' : '#059669',
          },
        ],
      },
    })),
  }),

  // 司機任務模板
  driverTasks: (tasks: any[]) => ({
    type: 'carousel',
    contents: tasks.slice(0, 10).map((task, i) => ({
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `📋 任務 ${i + 1}`, weight: 'bold', color: '#ffffff', align: 'center' },
        ],
        backgroundColor: '#3b82f6',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `客戶：${task.customerName || '未知'}`, size: 'sm' },
          { type: 'text', text: `地址：${task.address || '未知'}`, size: 'sm', color: '#6b7280' },
          { type: 'text', text: `商品：${task.items || '20kg瓦斯 x1'}`, size: 'sm' },
          { type: 'text', text: `電話：${task.phone || '無'}`, size: 'xs', color: '#6b7280' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: { type: 'message', label: '聯絡客戶', text: `聯絡 ${task.phone || ''}` },
            style: 'primary',
          },
          {
            type: 'button',
            action: { type: 'message', label: '完成配送', text: `完成任務 ${task.orderId || i + 1}` },
            style: 'secondary',
          },
        ],
      },
    })),
  }),

  // 管理報表模板
  adminReport: (stats: any) => ({
    type: 'bubble',
    styles: {
      header: { backgroundColor: '#8b5cf6', color: '#ffffff' },
      body: { backgroundColor: '#faf5ff', color: '#6b21a8' },
    },
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: '📊 今日營運報表', weight: 'bold', color: '#ffffff', size: 'xl' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `📦 訂單數：${stats.orders || 0} 單`, size: 'sm' },
        { type: 'text', text: `💰 營業額：NT$${(stats.revenue || 0).toLocaleString()}`, size: 'sm', weight: 'bold' },
        { type: 'text', text: `📈 成長率：${stats.growth || '+0%'}`, size: 'sm' },
        { type: 'text', text: `👥 客戶數：${stats.customers || 0} 人`, size: 'sm' },
        { type: 'separator', margin: 'lg' },
        { type: 'text', text: '⏰ 更新時間：' + new Date().toLocaleString('zh-TW'), size: 'xs', color: '#6b7280' },
      ],
    },
  }),
}

// ========================================
// Quick Reply 按鈕模板
// ========================================

const QUICK_REPLY_TEMPLATES = {
  greeting: {
    items: [
      { type: 'message', label: '🛒 訂瓦斯', text: '我要訂 20kg 瓦斯' },
      { type: 'message', label: '📦 查庫存', text: '查詢目前庫存' },
      { type: 'message', label: '💰 查價格', text: '瓦斯價格多少' },
      { type: 'message', label: '❓ 說明', text: '幫助說明' },
    ],
  },
  help: {
    items: [
      { type: 'message', label: '🛒 訂瓦斯', text: '我要訂瓦斯' },
      { type: 'message', label: '📦 查庫存', text: '查庫存' },
      { type: 'message', label: '📋 查訂單', text: '查詢我的訂單' },
      { type: 'message', label: '📞 聯絡客服', text: '聯絡客服' },
    ],
  },
  order: {
    items: [
      { type: 'message', label: '4kg', text: '我要訂 4kg 瓦斯' },
      { type: 'message', label: '20kg', text: '我要訂 20kg 瓦斯' },
      { type: 'message', label: '50kg', text: '我要訂 50kg 瓦斯' },
    ],
  },
  driver: {
    items: [
      { type: 'message', label: '📋 我的任務', text: '我的任務' },
      { type: 'message', label: '✅ 完成配送', text: '完成配送' },
      { type: 'message', label: '📞 聯絡公司', text: '聯絡公司' },
    ],
  },
  admin: {
    items: [
      { type: 'message', label: '📊 今日報表', text: '今日報表' },
      { type: 'message', label: '📦 庫存狀態', text: '查庫存' },
      { type: 'message', label: '💰 營收統計', text: '營收統計' },
      { type: 'message', label: '👥 業務報表', text: '業務報表' },
    ],
  },
}

// ========================================
// 回應生成器類別
// ========================================

export class LineBotResponseGenerator {
  /**
   * 生成回應訊息
   */
  generateResponse(
    intent: LineIntent,
    data: any = {},
    groupType?: GroupType
  ): LineMessageResponse {
    // 根據意圖和群組類型生成回應
    switch (intent) {
      case LineIntent.GREETING:
        return this.greetingResponse(groupType)

      case LineIntent.HELP:
        return this.helpResponse(groupType)

      case LineIntent.CREATE_ORDER:
        return this.createOrderResponse(data, groupType)

      case LineIntent.CHECK_ORDER:
        return this.checkOrderResponse(data)

      case LineIntent.CHECK_INVENTORY:
        return this.checkInventoryResponse(data)

      case LineIntent.DRIVER_MY_TASKS:
        return this.driverTasksResponse(data)

      case LineIntent.ADMIN_REPORT:
        return this.adminReportResponse(data)

      default:
        return this.textResponse('收到您的訊息，正在處理中...')
    }
  }

  /**
   * 問候回應
   */
  private greetingResponse(groupType?: GroupType): LineMessageResponse {
    const messages = {
      [GroupType.ADMIN]: '👋 老闆娘好！今天需要什麼協助？',
      [GroupType.DRIVER]: '🚚 司機您好！準備開始工作嗎？',
      [GroupType.SALES]: '💼 業務同仁早安！今天要衝業績喔！',
      [GroupType.CUSTOMER_SERVICE]: '💬 客服同仁您好！準備好服務客戶了嗎？',
      [GroupType.GENERAL]: '👋 您好！我是九九瓦斯行的助手，有什麼可以幫您的嗎？',
    }

    return {
      type: 'quick_reply',
      text: messages[groupType || GroupType.GENERAL],
      quickReply: QUICK_REPLY_TEMPLATES.greeting,
    }
  }

  /**
   * 幫助回應
   */
  private helpResponse(groupType?: GroupType): LineMessageResponse {
    const helpText = {
      [GroupType.ADMIN]: '📊 **管理功能**\n\n• 直接輸入指令即可\n• /報表 - 查看營運數據\n• /庫存 - 查詢庫存\n• /訂單 - 管理訂單',
      [GroupType.DRIVER]: '🚚 **司機功能**\n\n• 我的任務 - 查看配送任務\n• 完成 - 標記配送完成\n• 訂單 - 查看訂單詳情',
      [GroupType.SALES]: '💼 **業務功能**\n\n• 業績 - 查看個人業績\n• 客戶 - 管理客戶資料\n• 訂單 - 創建訂單',
      [GroupType.CUSTOMER_SERVICE]: '💬 **客服功能**\n\n• 查詢 - 查詢訂單/客戶\n• 庫存 - 查詢庫存\n• 價格 - 查詢價格',
      [GroupType.GENERAL]: '🛒 **快速服務**\n\n• 直接說「我要訂瓦斯」即可下單\n• 查詢價格、庫存隨時問\n• 謝謝您的支持！',
    }

    return {
      type: 'quick_reply',
      text: helpText[groupType || GroupType.GENERAL],
      quickReply: QUICK_REPLY_TEMPLATES.help,
    }
  }

  /**
   * 創建訂單回應
   */
  private createOrderResponse(data: any, groupType?: GroupType): LineMessageResponse {
    // 如果有完整的訂單數據，返回 Flex 訊息確認
    if (data.customer && data.product) {
      return {
        type: 'flex',
        flex: FLEX_TEMPLATES.orderConfirm(data),
      }
    }

    // 否則返回文字提示
    return {
      type: 'quick_reply',
      text: '好的！請問您要訂什麼規格的瓦斯？',
      quickReply: QUICK_REPLY_TEMPLATES.order,
    }
  }

  /**
   * 查詢訂單回應
   */
  private checkOrderResponse(data: any): LineMessageResponse {
    // 這裡應該從 API 獲取真實訂單數據
    // 暫時返回模擬回應
    return {
      type: 'text',
      text: `📋 查詢訂單功能\n\n正在查詢您的訂單...\n\n（功能開發中，請使用網站查詢）`,
    }
  }

  /**
   * 查詢庫存回應
   */
  private checkInventoryResponse(data: any): LineMessageResponse {
    // 這裡應該從 API 獲取真實庫存數據
    // 暫時返回模擬回應
    const mockItems = [
      { name: '20kg 瓦斯', quantity: 15, minStock: 10 },
      { name: '50kg 瓦斯', quantity: 3, minStock: 5 },
    ]

    return {
      type: 'flex',
      flex: FLEX_TEMPLATES.inventory(mockItems),
    }
  }

  /**
   * 司機任務回應
   */
  private driverTasksResponse(data: any): LineMessageResponse {
    // 這裡應該從 API 獲取真實任務數據
    const mockTasks = [
      { customerName: '王小姐', address: '台北市中山路123號', items: '20kg瓦斯 x1', phone: '0912345678' },
      { customerName: '陳先生', address: '台北縣板橋區文化路456號', items: '20kg瓦斯 x2', phone: '0923456789' },
    ]

    return {
      type: 'flex',
      flex: FLEX_TEMPLATES.driverTasks(mockTasks),
      quickReply: QUICK_REPLY_TEMPLATES.driver,
    }
  }

  /**
   * 管理報表回應
   */
  private adminReportResponse(data: any): LineMessageResponse {
    // 這裡應該從 API 獲取真實統計數據
    const mockStats = {
      orders: 12,
      revenue: 8640,
      growth: '+15%',
      customers: 8,
    }

    return {
      type: 'flex',
      flex: FLEX_TEMPLATES.adminReport(mockStats),
      quickReply: QUICK_REPLY_TEMPLATES.admin,
    }
  }

  /**
   * 純文字回應
   */
  private textResponse(text: string): LineMessageResponse {
    return {
      type: 'text',
      text,
    }
  }

  /**
   * 錯誤回應
   */
  errorResponse(message: string = '抱歉，發生錯誤，請稍後再試。'): LineMessageResponse {
    return {
      type: 'text',
      text: `⚠️ ${message}`,
    }
  }

  /**
   * 權限不足回應
   */
  permissionDeniedResponse(): LineMessageResponse {
    return {
      type: 'text',
      text: '⛔ 抱歉，您沒有權限執行此操作。\n\n如有問題請聯繫管理員。',
    }
  }
}

// ========================================
// 導出單例
// ========================================

let responseGeneratorInstance: LineBotResponseGenerator | null = null

export function getResponseGenerator(): LineBotResponseGenerator {
  if (!responseGeneratorInstance) {
    responseGeneratorInstance = new LineBotResponseGenerator()
  }
  return responseGeneratorInstance
}
