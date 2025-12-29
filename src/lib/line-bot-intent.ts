/**
 * LINE Bot 意圖分析引擎
 * 用於分析用戶訊息的意圖，支持關鍵字匹配和 AI 分析
 */

import { getBossJy99Assistant } from './boss-jy-99-api'
import { getLineKnowledgeBase } from './line-knowledge-base'

// ========================================
// 意圖類型定義
// ========================================

export enum LineIntent {
  // 訂單相關
  CREATE_ORDER = 'create_order',
  CHECK_ORDER = 'check_order',
  CANCEL_ORDER = 'cancel_order',
  MODIFY_ORDER = 'modify_order',

  // 查詢相關
  CHECK_INVENTORY = 'check_inventory',
  CHECK_PRICE = 'check_price',
  CHECK_REVENUE = 'check_revenue',
  CHECK_COST = 'check_cost',

  // 客戶相關
  CREATE_CUSTOMER = 'create_customer',
  SEARCH_CUSTOMER = 'search_customer',
  CUSTOMER_INFO = 'customer_info',
  LINK_ACCOUNT = 'link_account',      // NEW: Link LINE account to customer

  // 配送相關
  DELIVERY_STATUS = 'delivery_status',
  DRIVER_ASSIGN = 'driver_assign',
  DRIVER_TASKS = 'driver_tasks',

  // 支票相關
  ADD_CHECK = 'add_check',
  CHECK_STATUS = 'check_status',

  // 群組專屬功能
  ADMIN_REPORT = 'admin_report',      // 管理群組專屬
  ADMIN_EXPORT = 'admin_export',      // 匯出報表
  DRIVER_MY_TASKS = 'driver_my_tasks', // 司機群組專屬
  DRIVER_COMPLETE = 'driver_complete', // 完成配送
  SALES_TARGET = 'sales_target',      // 業務群組專屬
  SALES_PERFORMANCE = 'sales_performance', // 業績查詢
  CS_INQUIRY = 'cs_inquiry',          // 客服群組專屬

  // 促銷相關
  PROMOTION_LIST = 'promotion_list',
  PROMOTION_CREATE = 'promotion_create',

  // 休假表相關
  SUBMIT_SCHEDULE = 'submit_schedule',     // 提交休假表
  SHEET_STATUS = 'sheet_status',           // 查詢休假表狀態
  APPROVE_SCHEDULE = 'approve_schedule',   // 審核休假表（管理員）

  // 一般
  GREETING = 'greeting',
  HELP = 'help',
  UNKNOWN = 'unknown',
}

// ========================================
// 群組類型定義
// ========================================

export enum GroupType {
  ADMIN = 'admin',           // 管理群組 - 老闆娘 + 管理層
  DRIVER = 'driver',         // 司機群組 - 配送司機
  SALES = 'sales',           // 業務群組 - 業務員
  STAFF = 'staff',           // 員工群組 - 一般員工（綜合功能）
  CUSTOMER_SERVICE = 'cs',   // 客服群組 - 客服人員
  GENERAL = 'general',       // 一般群組 - 普通用戶
}

// 群組權限配置
export const GROUP_PERMISSIONS = {
  [GroupType.ADMIN]: [
    'create_order', 'check_order', 'cancel_order', 'modify_order',
    'check_inventory', 'check_price', 'check_revenue', 'check_cost',
    'create_customer', 'search_customer',
    'delivery_status', 'driver_assign',
    'add_check', 'check_status',
    'admin_report', 'admin_export',
    'promotion_list', 'promotion_create',
    'submit_schedule', 'sheet_status', 'approve_schedule',
  ],
  [GroupType.STAFF]: [
    'create_order', 'check_order',
    'check_inventory', 'check_price',
    'search_customer',
    'delivery_status', 'driver_my_tasks', 'driver_complete',
  ],
  [GroupType.DRIVER]: [
    'driver_my_tasks', 'driver_complete',
    'check_order', 'delivery_status',
  ],
  [GroupType.SALES]: [
    'create_customer', 'search_customer',
    'create_order', 'check_order',
    'sales_target', 'sales_performance',
  ],
  [GroupType.CUSTOMER_SERVICE]: [
    'check_order', 'search_customer', 'customer_info',
    'check_inventory', 'check_price',
    'cs_inquiry',
  ],
  [GroupType.GENERAL]: [
    'create_order', 'check_order',
    'check_price', 'link_account', 'greeting', 'help',
  ],
}

// ========================================
// 關鍵字模式匹配
// ========================================

const INTENT_KEYWORDS: Record<LineIntent, string[]> = {
  // 訂單相關
  [LineIntent.CREATE_ORDER]: ['訂', '買', '订购', '购买', '要瓦斯', '瓦斯桶', '桶'],
  [LineIntent.CHECK_ORDER]: ['查訂單', '查單', '我的訂單', '訂單狀態', 'order status'],
  [LineIntent.CANCEL_ORDER]: ['取消訂單', '不要了', 'cancel order'],
  [LineIntent.MODIFY_ORDER]: ['修改訂單', '改訂單', 'change order'],

  // 查詢相關
  [LineIntent.CHECK_INVENTORY]: ['庫存', '存貨', '還有多少', '有沒有貨', 'inventory'],
  [LineIntent.CHECK_PRICE]: ['價錢', '價格', '多少錢', '費用', 'price'],
  [LineIntent.CHECK_REVENUE]: ['營收', '營業額', '營業', '收入', 'revenue'],
  [LineIntent.CHECK_COST]: ['成本', '支出', '花費', 'cost'],

  // 客戶相關
  [LineIntent.CREATE_CUSTOMER]: ['新增客戶', '加客戶', '新客戶', 'add customer'],
  [LineIntent.SEARCH_CUSTOMER]: ['找客戶', '查客戶', '客戶資料', 'search customer'],
  [LineIntent.CUSTOMER_INFO]: ['客戶資訊', '客戶詳情', 'customer info'],
  [LineIntent.LINK_ACCOUNT]: ['綁定', '綁定手機', '連結帳戶', '會員綁定', '綁定帳戶', '我是新客戶'],

  // 配送相關
  [LineIntent.DELIVERY_STATUS]: ['配送', '送貨', '送到哪', 'delivery'],
  [LineIntent.DRIVER_ASSIGN]: ['指派司機', '分配任務', 'assign driver'],
  [LineIntent.DRIVER_TASKS]: ['我的任務', '任務列表', '配送任務', 'my tasks'],

  // 支票相關
  [LineIntent.ADD_CHECK]: ['記錄支票', '新增支票', 'add check'],
  [LineIntent.CHECK_STATUS]: ['支票狀態', '支票到期', 'check status'],

  // 群組專屬功能
  [LineIntent.ADMIN_REPORT]: ['報表', '統計', '分析', 'report'],
  [LineIntent.ADMIN_EXPORT]: ['匯出', '下載', 'export'],
  [LineIntent.DRIVER_MY_TASKS]: ['任務', '配送', '我的任務', 'my tasks'],
  [LineIntent.DRIVER_COMPLETE]: ['完成', '送到', '配送完成', 'complete'],
  [LineIntent.SALES_TARGET]: ['目標', '業績目標', 'target'],
  [LineIntent.SALES_PERFORMANCE]: ['業績', '表現', 'performance'],
  [LineIntent.CS_INQUIRY]: ['查詢', '諮詢', 'inquiry'],

  // 促銷相關
  [LineIntent.PROMOTION_LIST]: ['促銷', '優惠', '活動', 'promotion'],
  [LineIntent.PROMOTION_CREATE]: ['新增促銷', '創建活動', 'create promotion'],

  // 休假表相關
  [LineIntent.SUBMIT_SCHEDULE]: ['休假表', '排班', '月休', '休假', 'schedulesheet'],
  [LineIntent.SHEET_STATUS]: ['休假表狀態', '休假狀態', '排班狀態', '審核狀態'],
  [LineIntent.APPROVE_SCHEDULE]: ['審核休假', '批准休假', '同意休假', 'rejectschedule'],

  // 一般
  [LineIntent.GREETING]: ['你好', '您好', '嗨', 'hi', 'hello', '早安', '晚安'],
  [LineIntent.HELP]: ['幫助', 'help', '怎麼用', '功能', '?'],
  [LineIntent.UNKNOWN]: [],
}

// ========================================
// 意圖分析結果
// ========================================

export interface IntentAnalysisResult {
  intent: LineIntent
  confidence: number
  entities: Record<string, any>
  groupType?: GroupType
  suggestedResponse?: string
}

// ========================================
// 意圖分析器類別
// ========================================

export class LineBotIntentAnalyzer {
  /**
   * 分析訊息意圖（使用關鍵字匹配）
   */
  analyzeByKeywords(message: string): IntentAnalysisResult {
    const normalizedMessage = message.toLowerCase().trim()
    let bestMatch: LineIntent = LineIntent.UNKNOWN
    let maxMatches = 0

    // 檢查每個意圖的關鍵字
    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
      let matchCount = 0
      for (const keyword of keywords) {
        if (normalizedMessage.includes(keyword.toLowerCase())) {
          matchCount++
        }
      }

      if (matchCount > maxMatches) {
        maxMatches = matchCount
        bestMatch = intent as LineIntent
      }
    }

    // 計算信心度
    const confidence = maxMatches > 0 ? Math.min(maxMatches * 0.3, 1.0) : 0

    // 提取實體（產品規格、數量等）
    const entities = this.extractEntities(message)

    return {
      intent: bestMatch,
      confidence,
      entities,
    }
  }

  /**
   * 使用 AI 分析訊息意圖
   */
  async analyzeByAI(message: string, groupType?: GroupType): Promise<IntentAnalysisResult> {
    try {
      const assistant = getBossJy99Assistant()

      // 構建 AI 提示詞
      const prompt = this.buildAIPrompt(message, groupType)

      // 獲取 AI 回應
      const response = await assistant.chat(prompt)

      // 解析 AI 回應
      const action = assistant.parseAction(response)

      if (action && action.action) {
        // AI 成功識別意圖
        return {
          intent: this.mapActionToIntent(action.action),
          confidence: 0.9,
          entities: action.data || {},
          groupType,
          suggestedResponse: action.message,
        }
      }

      // AI 沒有識別出明確動作，回退到關鍵字匹配
      return this.analyzeByKeywords(message)
    } catch (error) {
      console.error('AI intent analysis failed:', error)
      return this.analyzeByKeywords(message)
    }
  }

  /**
   * 綜合分析（優先使用 AI，回退到關鍵字）
   */
  async analyze(message: string, groupType?: GroupType): Promise<IntentAnalysisResult> {
    // 先嘗試關鍵字匹配（快速）
    const keywordResult = this.analyzeByKeywords(message)

    // 如果關鍵字匹配信心度低，使用 AI
    if (keywordResult.confidence < 0.5) {
      return await this.analyzeByAI(message, groupType)
    }

    // 如果未知意圖，嘗試知識庫
    if (keywordResult.intent === LineIntent.UNKNOWN) {
      const kb = getLineKnowledgeBase()
      const answer = kb.findAnswer(message)
      if (answer) {
        return {
          intent: LineIntent.HELP,
          confidence: 0.8,
          entities: {},
          groupType,
          suggestedResponse: answer,
        }
      }
    }

    // 添加群組類型信息
    keywordResult.groupType = groupType
    return keywordResult
  }

  /**
   * 提取實體信息
   */
  private extractEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {}

    // 提取瓦斯規格（4kg, 10kg, 16kg, 20kg, 50kg）
    const sizeMatch = message.match(/(\d+)\s*(kg|公斤|桶)/i)
    if (sizeMatch) {
      entities.size = `${sizeMatch[1]}kg`
    }

    // 提取數量
    const quantityMatch = message.match(/(\d+)\s*(桶|個|份)/i)
    if (quantityMatch) {
      entities.quantity = parseInt(quantityMatch[1])
    }

    // 提取電話號碼
    const phoneMatch = message.match(/(09\d{8}|\d{10,11})/)
    if (phoneMatch) {
      entities.phone = phoneMatch[1]
    }

    // 提取金額
    const moneyMatch = message.match(/(\d+)\s*(元|塊|NT)/)
    if (moneyMatch) {
      entities.amount = parseInt(moneyMatch[1])
    }

    return entities
  }

  /**
   * 構建 AI 分析提示詞
   */
  private buildAIPrompt(message: string, groupType?: GroupType): string {
    const groupInfo = groupType ? `當前群組類型：${groupType}` : '一般群組'

    return `你是九九瓦斯行的 LINE Bot 助手。

${groupInfo}

用戶訊息：「${message}」

請分析用戶意圖並返回 JSON 格式：
\`\`\`json
{
  "action": "create_order|check_order|check_inventory|driver_my_tasks|admin_report 等",
  "data": {提取的實體數據},
  "message": "給用戶的友善回應"
}
\`\`\`

可用的操作類型：
- create_order: 創建訂單
- check_order: 查詢訂單
- check_inventory: 查詢庫存
- check_price: 查詢價格
- driver_my_tasks: 司機查看任務
- admin_report: 管理員查看報表
- greeting: 問候
- help: 幫助說明
`
  }

  /**
   * 映射 AI action 到 Intent
   */
  private mapActionToIntent(action: string): LineIntent {
    const actionMap: Record<string, LineIntent> = {
      create_order: LineIntent.CREATE_ORDER,
      check_order: LineIntent.CHECK_ORDER,
      cancel_order: LineIntent.CANCEL_ORDER,
      modify_order: LineIntent.MODIFY_ORDER,
      check_inventory: LineIntent.CHECK_INVENTORY,
      check_price: LineIntent.CHECK_PRICE,
      check_revenue: LineIntent.CHECK_REVENUE,
      check_cost: LineIntent.CHECK_COST,
      create_customer: LineIntent.CREATE_CUSTOMER,
      search_customer: LineIntent.SEARCH_CUSTOMER,
      driver_my_tasks: LineIntent.DRIVER_MY_TASKS,
      driver_complete: LineIntent.DRIVER_COMPLETE,
      admin_report: LineIntent.ADMIN_REPORT,
      admin_export: LineIntent.ADMIN_EXPORT,
      sales_target: LineIntent.SALES_TARGET,
      sales_performance: LineIntent.SALES_PERFORMANCE,
      greeting: LineIntent.GREETING,
      help: LineIntent.HELP,
    }

    return actionMap[action] || LineIntent.UNKNOWN
  }

  /**
   * 檢查群組權限
   */
  checkPermission(groupType: GroupType, intent: LineIntent): boolean {
    const permissions = GROUP_PERMISSIONS[groupType] || []
    return permissions.includes(intent)
  }

  /**
   * 獲取群組說明訊息
   */
  getGroupWelcomeMessage(groupType: GroupType): string {
    const messages = {
      [GroupType.ADMIN]: `👋 歡迎使用九九瓦斯行管理系統！

📊 **管理功能**
• 說「報表」- 查看營運報表
• 說「庫存」- 查詢庫存
• 說「訂單」- 管理訂單
• 說「營收」- 查看營收

💬 直接輸入指令即可使用！`,
      [GroupType.STAFF]: `👋 歡迎使用九九瓦斯行員工助手！

📋 **員工功能**
• 說「任務」- 查看配送任務
• 說「庫存」- 查詢庫存
• 說「訂單」- 查詢/創建訂單
• 說「客戶」- 搜尋客戶
• 說「完成 [訂單號]」- 完成配送

一起加油！💪`,
      [GroupType.DRIVER]: `🚚 司機助手已啟動！

📋 **我的任務**
• 說「任務」- 查看配送任務
• 說「完成 [訂單號]」- 標記配送完成
• 說「訂單」- 查看訂單詳情

安全行駛！🛵`,
      [GroupType.SALES]: `💼 業務助手已啟動！

🎯 **業績管理**
• 說「業績」- 查看個人業績
• 說「客戶」- 管理客戶資料
• 說「訂單」- 創建訂單

加油達成目標！💪`,
      [GroupType.CUSTOMER_SERVICE]: `💬 客服助手已啟動！

📞 **客服功能**
• 說「查詢」- 查詢訂單/客戶
• 說「庫存」- 查詢庫存
• 說「價格」- 查詢價格

為客戶提供最佳服務！😊`,
      [GroupType.GENERAL]: `👋 歡迎使用九九瓦斯行！

🛒 **快速服務**
• 直接說「我要訂瓦斯」即可下單
• 查詢價格、庫存隨時問

感謝您的支持！💚`,
    }

    return messages[groupType] || messages[GroupType.GENERAL]
  }
}

// ========================================
// 導出單例
// ========================================

let intentAnalyzerInstance: LineBotIntentAnalyzer | null = null

export function getIntentAnalyzer(): LineBotIntentAnalyzer {
  if (!intentAnalyzerInstance) {
    intentAnalyzerInstance = new LineBotIntentAnalyzer()
  }
  return intentAnalyzerInstance
}
