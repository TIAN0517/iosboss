/**
 * BossJy-99 助手 - GLM-4.7 API 整合
 * 專為瓦斯行老闆娘設計的智能管理助手
 */

// ========================================
// GLM-4.7 API 配置
// ========================================

const GLM_CONFIG = {
  // 方式 1：原生 GLM API（推薦用於 Coding Max）
  native: {
    baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    // GLM Coding Max - 最強編碼模型
    model: 'glm-4.7-coding-max',
    // GLM-4.7 通用模型作為備用
    fallbackModel: 'glm-4.7',
  },
  // 方式 2：Anthropic 兼容 API
  anthropic: {
    baseURL: 'https://open.bigmodel.cn/api/anthropic/v1/messages',
    model: 'glm-4.7-coding-max',
    fallbackModel: 'glm-4.7',
  },
  // 默認配置（直接訪問，用於向後兼容）
  baseURL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  model: 'glm-4.7-coding-max',
  fallbackModel: 'glm-4.7',
  timeout: 600000, // 10 分鐘超時，支援長推理
}

// 默認使用原生 GLM API（對 Coding Max 支持更好）
const DEFAULT_API_MODE: 'native' | 'anthropic' = 'native'

// ========================================
// API Key 輪替配置
// ========================================

// 從環境變量獲取 API Key 池
function getApiKeysFromEnv(): string[] {
  if (typeof process !== 'undefined' && process.env?.GLM_API_KEYS) {
    return process.env.GLM_API_KEYS.split(',').map(key => key.trim()).filter(key => key.length > 0)
  }
  return []
}

// ⚠️ 安全警告：不允許硬編碼 API Key
// 請使用環境變量 GLM_API_KEYS 或 GLM_API_KEY 設置您的 API Key
// 硬編碼的 API Key 會在提交到 git 倉庫時造成安全風險
const DEFAULT_API_KEYS: string[] = []

// 獲取 API Key 池（僅從環境變量獲取）
function getDefaultApiKeys(): string[] {
  const envKeys = getApiKeysFromEnv()
  if (envKeys.length > 0) {
    return envKeys
  }

  // 也嘗試從單一 GLM_API_KEY 環境變量獲取
  if (typeof process !== 'undefined' && process.env?.GLM_API_KEY) {
    return [process.env.GLM_API_KEY]
  }

  // 服務器端跳過 localStorage
  return []
}

// API Key 使用狀態追蹤
interface APIKeyStatus {
  key: string
  index: number
  failures: number
  lastUsed: number
  isAvailable: boolean
}

let apiKeysPool: APIKeyStatus[] = []
let currentKeyIndex = 0

/**
 * 初始化 API Key 池
 */
function initializeApiKeyPool(customKeys?: string[]) {
  // 優先順序：自定義 Keys > 環境變量
  const keys = customKeys || getDefaultApiKeys()

  apiKeysPool = keys.map((key, index) => ({
    key,
    index,
    failures: 0,
    lastUsed: 0,
    isAvailable: true,
  }))

  currentKeyIndex = 0
}

/**
 * 獲取下一個可用的 API Key（輪替）
 */
function getNextApiKey(): APIKeyStatus | null {
  // 初始化池（如果尚未初始化）
  if (apiKeysPool.length === 0) {
    initializeApiKeyPool()
  }

  const startIndex = currentKeyIndex
  let attempts = 0

  // 尋找下一個可用的 API Key
  while (attempts < apiKeysPool.length) {
    const status = apiKeysPool[currentKeyIndex]

    if (status.isAvailable && status.failures < 3) {
      status.lastUsed = Date.now()
      return status
    }

    // 重置失敗次數（如果超過 1 小時）
    if (Date.now() - status.lastUsed > 3600000) {
      status.failures = 0
      status.isAvailable = true
    }

    // 移動到下一個
    currentKeyIndex = (currentKeyIndex + 1) % apiKeysPool.length
    attempts++
  }

  // 所有 Key 都不可用，重置並重試
  apiKeysPool.forEach(s => {
    s.failures = 0
    s.isAvailable = true
  })
  currentKeyIndex = 0

  return apiKeysPool[0] || null
}

/**
 * 標記 API Key 失敗
 */
function markApiKeyFailure(keyIndex: number) {
  const status = apiKeysPool.find(s => s.index === keyIndex)
  if (status) {
    status.failures++
    if (status.failures >= 3) {
      status.isAvailable = false
      console.warn(`API Key ${keyIndex} 暫時不可用，切換到下一個`)
    }
  }
}

/**
 * 標記 API Key 成功
 */
function markApiKeySuccess(keyIndex: number) {
  const status = apiKeysPool.find(s => s.index === keyIndex)
  if (status) {
    status.failures = 0
    status.isAvailable = true
  }
}

// ========================================
// 系統提示詞 - 專為老闆娘設計（GLM Coding Max 優化版）
// ========================================

// 原版（結構化操作模式）
const SYSTEM_PROMPT_STRUCTURED = `你是 BossJy-99助手，九九瓦斯行的智能管理助手。你由 GLM Coding Max 驅動，具備最強大的推理和執行能力。

## 你的角色定位
你是一位**貼心、專業、高效**的瓦斯行管理助手，專門協助老闆娘管理整個業務。雖然你擁有強大的技術能力，但你的任務是**幫助老闆娘管理瓦斯行**，而不是寫代碼。

## 你的核心優勢
- 🧠 **深度推理**：在執行任何操作前，先進行全面思考
- 🎯 **精準執行**：準確理解老闆娘的需求，一詞不差地執行
- 💡 **主動預判**：提前想到老闆娘可能需要的幫助
- 📊 **數據分析**：深入分析營收、庫存、客戶數據並提供建議

## 你的能力

### 📦 訂單管理
- 創建瓦斯訂單（4kg/10kg/16kg/20kg/50kg）
- 查詢訂單狀態
- 修改訂單
- 取消訂單

### 👥 客戶管理
- 新增客戶資料
- 查詢客戶資訊
- 記錄客戶需求

### 📦 庫存管理
- 查詢目前庫存
- 補貨登記
- 庫存提醒

### 💰 財務管理
- 記錄成本支出
- 查詢營收利潤
- 支票管理
- 抄錶計算

### 📞 服務管理
- 來電記錄
- 客服諮詢

## 重要規則（GLM Coding Max 增強版）

1. **深度思考後行動**：利用你的推理能力，在執行前先思考最佳方案
2. **友善且專業**：老闆娘可能不太熟悉科技，要耐心友善，但回答要專業精準
3. **簡單但完整**：回答要清楚易懂，同時提供完整的資訊和背景
4. **主動且智能**：不僅理解表面需求，還要主動提供深入分析和建議
5. **情感支持**：理解老闆娘的壓力，給予鼓勵和正面回饋
6. **精準執行**：當老闆娘要求做什麼時，立即、準確地執行並回報結果

## 2025年瓦斯價格參考
- 4kg：NT$220
- 10kg：NT$360
- 16kg：NT$550
- 20kg：NT$620-730
- 50kg：NT$1,550

## 智能分析能力
當查詢數據時，你應該：
- 📈 分析趨勢（營收成長、庫存變化）
- 💰 計算利潤率和關鍵指標
- 🎯 提供可操作的建議
- ⚠️ 主動提醒潛在問題（庫存不足、支票到期等）

## 回應格式（增強版）

當老闆娘要求執行操作時，你必須：
1. 理解需求
2. 返回 JSON 格式的操作指令
3. 提供友善的說明

操作指令格式：
\`\`\`json
{
  "action": "操作類型",
  "data": {操作數據},
  "message": "給老闆娘的友善回應"
}
\`\`\`

## 操作類型

- "create_order": 創建訂單
- "create_customer": 新增客戶
- "check_inventory": 查詢庫存
- "check_revenue": 查詢營收
- "add_cost": 記錄成本
- "add_check": 記錄支票
- "meter_reading": 抄錶計算
- "call_record": 來電記錄
- "get_statistics": 營運統計

## 範例對話（GLM Coding Max 級別）

### 範例 1：簡單訂單
老闆娘：「幫我訂 20kg 瓦斯 2桶，給王小姐」

你的思考過程：
- 客戶：王小姐
- 商品：20kg 瓦斯
- 數量：2桶
- 價格：NT$620/桶
- 總額：NT$1,240

你的回應：
\`\`\`json
{
  "action": "create_order",
  "data": {
    "customer": "王小姐",
    "items": [{"size": "20kg", "quantity": 2, "price": 620}],
    "total": 1240
  },
  "message": "好的老闆娘！我已經幫您創建訂單了。\\n\\n客戶：王小姐\\n商品：20kg 瓦斯 2桶\\n總額：NT$1,240\\n\\n訂單已建立，稍後會安排配送喔！💪"
}
\`\`\`

### 範例 2：智能查詢與分析
老闆娘：「這週生意怎麼樣？」

你的思考過程：
- 需要查詢本週營收數據
- 需要與上週對比
- 需要分析利潤率
- 需要提供業務建議

你的回應：
\`\`\`json
{
  "action": "get_statistics",
  "data": {
    "period": "week",
    "include_analysis": true
  },
  "message": "📊 **本週營運報告**\\n\\n📈 **營收數據**\\n• 本週營收：NT$45,680\\n• 上週營收：NT$42,350\\n• 成長：+7.9% 🌟\\n\\n💰 **利潤分析**\\n• 總營收：NT$45,680\\n• 總成本：NT$28,420\\n• 淨利潤：NT$17,260\\n• 利潤率：37.8%\\n\\n🎯 **業務洞察**\\n• 訂單數比上週增加 12%\\n• 20kg 瓦斯銷量最佳\\n• 週末訂單量是平日的 2.5 倍\\n\\n💡 **建議**\\n老闆娘，本週生意很不錯！建議：\\n1. 週末可以準備更多 20kg 瓦斯\\n2. 利潤率 37.8% 表現很好！\\n3. 考慮推出週末優惠吸引更多客戶\\n\\n您辛苦了！💪"
}
\`\`\`

### 範例 3：主動提醒
老闆娘：「查一下庫存」

你的思考過程：
- 查詢所有規格的庫存
- 檢查是否有低於安全庫存
- 計算補貨建議
- 提供成本預估

你的回應：
\`\`\`json
{
  "action": "check_inventory",
  "data": {
    "include_reorder_suggestion": true
  },
  "message": "📦 **庫存狀態報告**\\n\\n✅ **庫存充足**\\n• 4kg：18桶（安全存量：10桶）\\n• 10kg：12桶（安全存量：8桶）\\n• 50kg：5桶（安全存量：3桶）\\n\\n⚠️ **需要補貨**\\n• 16kg：2桶（安全存量：8桶）\\n• 20kg：4桶（安全存量：10桶）\\n\\n💡 **補貨建議**\\n• 16kg 建議補貨 10 桶（約 NT$5,500）\\n• 20kg 建議補貨 15 桶（約 NT$9,300）\\n• 預估總成本：NT$14,800\\n\\n老闆娘，16kg 和 20kg 庫存比較少喔！建議盡快補貨，避免影響客戶訂單。需要我幫您記錄補貨需求嗎？😊"
}
\`\`\`

## 核心理念
利用 GLM Coding Max 的強大能力：
1. **深度思考**：不僅執行，還要理解背後的業務邏輯
2. **智能分析**：從數據中發現模式和趨勢
3. **主動預判**：提前想到老闆娘的需求
4. **情感連結**：讓老闆娘感覺有個可靠的夥伴

記住：你是一位擁有 AI 超級能力的貼心助手，用最強大的推理能力來幫助老闆娘管理瓦斯行！`

// 流暢對話模式（新增 - 更自然的對話體驗）
const SYSTEM_PROMPT_NATURAL = `你是 BossJy-99，九九瓦斯行的智能助手。你就像一個貼心的夥伴，可以跟老闆娘自然流暢地對話。

## 對話風格
- 像朋友一樣自然聊天，不需要拘束
- 可以開玩笑、閒聊、分享心情
- 回應要簡短有力，不要長篇大論
- 使用表情符號讓對話更有趣

## 你的能力
當老闆娘需要幫忙時，你可以：
- 訂瓦斯、查庫存、記錄成本
- 查營收、加客戶、記支票
- 分析數據、提供建議
- 聊天、陪伴、關心老闆娘

## 重要規則
1. **自然對話優先**：像正常人聊天，不要機器化
2. **簡潔明瞭**：不要長篇大論，直接重點
3. **可以開玩笑**：讓對話有趣一點
4. **情感連結**：關心老闆娘的心情和壓力
5. **只在需要時才用 JSON**：只有要執行系統操作時才返回 JSON

## JSON 格式（僅在需要執行操作時使用）
如果需要執行操作，用這個格式：
\`\`\`json
{
  "action": "操作類型",
  "data": {數據},
  "message": "友善的回應"
}
\`\`\`

操作類型：create_order, create_customer, check_inventory, check_revenue, add_cost, add_check, meter_reading, call_record, get_statistics

## 2025瓦斯價格
4kg: 220元 | 10kg: 360元 | 16kg: 550元 | 20kg: 620-730元 | 50kg: 1550元

## 對話範例

老闆娘：「今天好累喔」
你：「老闆娘辛苦了！今天生意怎麼樣？需要幫忙什麼嗎？💪」

老闆娘：「幫我訂 20kg 瓦斯 2桶」
你：「好的！馬上幫您處理～ 🛵」

老闆娘：「最近生意不太好」
你：「別擔心！會好起來的。要不要我幫您看看這週的數據，找找可以改進的地方？」

老闆娘：「查一下庫存」
你：「讓我看看喔... 📦」

## 核心理念
你是老闆娘的 AI 夥伴，不是冷冰冰的機器。像朋友一樣聊天，在她需要幫忙時及時支援！`

// 無限制模式（像 Claude API 一樣完全流暢）
const SYSTEM_PROMPT_UNRESTRICTED = `你是 BossJy-99，一個聰明、友善的 AI 助手。

你是老闆娘的夥伴，幫助她管理九九瓦斯行。

隨意聊天，自然回應，沒有限制。`

// 預設使用無限制模式（最流暢）
const SYSTEM_PROMPT = SYSTEM_PROMPT_UNRESTRICTED

// ========================================
// 類型定義
// ========================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  id: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ParsedAction {
  action: string
  data: any
  message: string
}

// ========================================
// BossJy-99 助手類別
// ========================================

export class BossJy99Assistant {
  private useApiKeyRotation: boolean
  private customApiKey?: string
  private conversationHistory: ChatMessage[] = []
  private thinkingHistory: string[] = [] // 存儲思考過程
  private useThinkingMode = true // 啟用思考模式
  private apiMode: 'native' | 'anthropic' = DEFAULT_API_MODE
  private currentKeyIndex: number = -1

  constructor(apiKey?: string, useThinkingMode: boolean = true, apiMode?: 'native' | 'anthropic') {
    this.customApiKey = apiKey
    this.useApiKeyRotation = !apiKey // 如果沒有提供 API Key，啟用輪替
    this.useThinkingMode = useThinkingMode
    if (apiMode) this.apiMode = apiMode

    // 初始化 API Key 池
    if (this.useApiKeyRotation) {
      initializeApiKeyPool()
    }
  }

  /**
   * 獲取當前使用的 API Key
   */
  private getCurrentApiKey(): string {
    if (this.customApiKey) {
      return this.customApiKey
    }

    // 使用輪替模式
    const keyStatus = getNextApiKey()
    if (!keyStatus) {
      throw new Error('沒有可用的 API Key')
    }

    this.currentKeyIndex = keyStatus.index
    return keyStatus.key
  }

  /**
   * 設置 API 模式
   */
  setApiMode(mode: 'native' | 'anthropic') {
    this.apiMode = mode
  }

  /**
   * 設置是否使用思考模式
   */
  setThinkingMode(enabled: boolean) {
    this.useThinkingMode = enabled
  }

  /**
   * 獲取思考歷史
   */
  getThinkingHistory(): string[] {
    return [...this.thinkingHistory]
  }

  /**
   * 清空思考歷史
   */
  clearThinkingHistory() {
    this.thinkingHistory = []
  }

  /**
   * 獲取當前 API 配置
   */
  private getConfig() {
    return this.apiMode === 'anthropic' ? GLM_CONFIG.anthropic : GLM_CONFIG.native
  }

  /**
   * 構建請求頭
   */
  private getHeaders(): Record<string, string> {
    const apiKey = this.getCurrentApiKey()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiMode === 'anthropic') {
      // Anthropic 兼容模式使用 x-api-key
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else {
      // 原生模式使用 Bearer token
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    return headers
  }

  /**
   * 構建請求體
   */
  private getRequestBody(messages: ChatMessage[], stream: boolean = false): any {
    const config = this.getConfig()

    if (this.apiMode === 'anthropic') {
      // Anthropic 格式
      return {
        model: config.model,
        messages: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        system: messages.find(m => m.role === 'system')?.content || SYSTEM_PROMPT,
        max_tokens: 2000,
        temperature: 0.7,
        top_p: 0.9,
        stream,
        // 啟用思考模式
        thinking: {
          type: 'enabled',
          budget_tokens: this.useThinkingMode ? 10000 : 0,
        },
      }
    } else {
      // 原生 GLM 格式
      const body: any = {
        model: config.model,
        messages,
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2000,
        stream,
      }

      // 啟用思考模式
      if (this.useThinkingMode) {
        body.chat_template_kwargs = {
          enable_thinking: true,
          clear_thinking: false,
        }
      }

      return body
    }
  }

  /**
   * 解析響應內容
   */
  private parseResponseContent(data: any): string {
    if (this.apiMode === 'anthropic') {
      return data.content[0]?.text || ''
    } else {
      return data.choices[0]?.message?.content || ''
    }
  }

  /**
   * 發送訊息到 GLM-4.7（支援思考模式和 API Key 輪替）
   */
  async chat(userMessage: string): Promise<string> {
    const config = this.getConfig()
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.conversationHistory.slice(-10),
      { role: 'user', content: userMessage },
    ]

    // 嘗試多個 API Key（如果啟用輪替）
    const maxRetries = this.useApiKeyRotation ? apiKeysPool.length : 1

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(config.baseURL, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(this.getRequestBody(messages, false)),
          signal: AbortSignal.timeout(GLM_CONFIG.timeout),
        })

        if (!response.ok) {
          const error = await response.json()
          const errorMsg = error.error?.message || error.message || 'GLM API 請求失敗'

          // 如果是認證錯誤，標記 API Key 失敗並嘗試下一個
          if (errorMsg.includes('401') || errorMsg.includes('auth') || errorMsg.includes('key')) {
            if (this.useApiKeyRotation && this.currentKeyIndex >= 0) {
              markApiKeyFailure(this.currentKeyIndex)
              console.log(`API Key ${this.currentKeyIndex} 失敗，嘗試下一個...`)
              continue
            }
          }

          throw new Error(errorMsg)
        }

        const data = await response.json()
        const assistantMessage = this.parseResponseContent(data)

        // 標記 API Key 成功
        if (this.useApiKeyRotation && this.currentKeyIndex >= 0) {
          markApiKeySuccess(this.currentKeyIndex)
        }

        // 保存對話歷史
        this.conversationHistory.push(
          { role: 'user', content: userMessage },
          { role: 'assistant', content: assistantMessage }
        )

        return assistantMessage
      } catch (error) {
        // 如果是最後一次嘗試，拋出錯誤
        if (attempt === maxRetries - 1) {
          console.error('GLM API Error:', error)
          throw error
        }
        // 否則繼續嘗試下一個 Key
      }
    }

    throw new Error('所有 API Key 都不可用')
  }

  /**
   * 流式聊天（支援思考模式，更即時的回應體驗）
   */
  async *chatStream(userMessage: string): AsyncGenerator<{type: 'content' | 'thinking', text: string}, void, unknown> {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...this.conversationHistory.slice(-10),
      { role: 'user', content: userMessage },
    ]

    const requestBody: any = {
      model: GLM_CONFIG.model,
      messages,
      temperature: 0.7,
      top_p: 0.9,
      max_tokens: 2000,
      stream: true,
    }

    // 啟用 GLM-4.7 思考模式
    if (this.useThinkingMode) {
      requestBody.chat_template_kwargs = {
        enable_thinking: true,
        clear_thinking: false,
      }
    }

    try {
      const response = await fetch(GLM_CONFIG.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getCurrentApiKey()}`,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(GLM_CONFIG.timeout),
      })

      if (!response.ok) {
        const error = await response.json()
        // 如果是模型不支持的錯誤，嘗試使用備用模型
        if (error.error?.includes('model') || error.error?.includes('模型')) {
          console.log('GLM-4.7 不可用，使用備用模型進行流式回應')
          requestBody.model = GLM_CONFIG.fallbackModel
          delete requestBody.chat_template_kwargs

          const fallbackResponse = await fetch(GLM_CONFIG.baseURL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.getCurrentApiKey()}`,
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(GLM_CONFIG.timeout),
          })

          if (fallbackResponse.ok) {
            const reader = fallbackResponse.body?.getReader()
            if (!reader) throw new Error('無法讀取回應')

            const decoder = new TextDecoder()
            let fullContent = ''

            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value)
              const lines = chunk.split('\n').filter(line => line.trim() !== '')

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') continue

                  try {
                    const parsed = JSON.parse(data)
                    const content = parsed.choices[0]?.delta?.content || ''
                    if (content) {
                      fullContent += content
                      yield { type: 'content', text: content }
                    }
                  } catch (e) {
                    // 忽略解析錯誤
                  }
                }
              }
            }

            this.conversationHistory.push(
              { role: 'user', content: userMessage },
              { role: 'assistant', content: fullContent }
            )
            return
          }
        }
        throw new Error(error.message || 'GLM API 請求失敗')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('無法讀取回應')

      const decoder = new TextDecoder()
      let fullContent = ''
      let currentThinking = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(line => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)

              // GLM-4.7 思考模式：檢查是否有 thinking 欄位
              const thinking = parsed.choices[0]?.delta?.thinking || ''
              const content = parsed.choices[0]?.delta?.content || ''

              if (thinking) {
                currentThinking += thinking
                // 可以選擇性地顯示思考過程
                // yield { type: 'thinking', text: thinking }
              }

              if (content) {
                fullContent += content
                yield { type: 'content', text: content }
              }
            } catch (e) {
              // 忽略解析錯誤
            }
          }
        }
      }

      // 保存對話歷史
      this.conversationHistory.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: fullContent }
      )

      // 保存思考過程
      if (currentThinking) {
        this.thinkingHistory.push(currentThinking)
      }
    } catch (error) {
      console.error('GLM Stream API Error:', error)
      throw error
    }
  }

  /**
   * 解析 AI 回應中的操作指令
   */
  parseAction(response: string): ParsedAction | null {
    try {
      // 查找 JSON 代碼塊
      const jsonMatch = response.match(/```json\\s*([\\s\\S]*?)\\s*```/);
      if (jsonMatch) {
        const action: ParsedAction = JSON.parse(jsonMatch[1])
        return action
      }

      // 嘗試直接解析 JSON
      const directMatch = response.match(/\\{[^{}]*"action"[^{}]*\\}/)
      if (directMatch) {
        const action: ParsedAction = JSON.parse(directMatch[0])
        return action
      }

      return null
    } catch (e) {
      console.error('Parse Action Error:', e)
      return null
    }
  }

  /**
   * 執行 AI 返回的操作
   */
  async executeAction(action: ParsedAction, systemState: any): Promise<string> {
    const { action: actionType, data } = action

    try {
      switch (actionType) {
        case 'create_order':
          return this.executeCreateOrder(data, systemState)

        case 'create_customer':
          return this.executeCreateCustomer(data, systemState)

        case 'check_inventory':
          return this.executeCheckInventory(systemState)

        case 'check_revenue':
          return this.executeCheckRevenue(systemState)

        case 'add_cost':
          return this.executeAddCost(data, systemState)

        case 'add_check':
          return this.executeAddCheck(data, systemState)

        case 'meter_reading':
          return this.executeMeterReading(data, systemState)

        case 'call_record':
          return this.executeCallRecord(data, systemState)

        case 'get_statistics':
          return this.executeGetStatistics(systemState)

        default:
          return `我收到您的請求了，但我還不太確定要怎麼幫您。可以說得更詳細一點嗎？😊`
      }
    } catch (error) {
      return `哎呀，執行操作的時候遇到了一些問題：${error instanceof Error ? error.message : '未知錯誤'}\\n\\n請稍後再試，或重新說明您的需求喔！`
    }
  }

  // ========================================
  // 操作執行函數
  // ========================================

  private async executeCreateOrder(data: any, systemState: any): Promise<string> {
    const { customer, items, total } = data

    // 保存到系統狀態
    const order = {
      id: Date.now().toString(),
      customer,
      items,
      total,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    systemState.addOrder(order)

    // 返回友善的回應
    return `✅ **訂單創建成功！**

**客戶：** ${customer}
**商品：** ${items.map((i: any) => `${i.size} x${i.quantity}桶`).join('、')}
**總額：** NT$${total?.toLocaleString() || '計算中'}

**訂單編號：** #${order.id.slice(-6)}
**狀態：** ⏳ 待處理

老闆娘，訂單已經幫您建立了！稍後會安排配送喔～ 🛵💪`
  }

  private async executeCreateCustomer(data: any, systemState: any): Promise<string> {
    const { name, phone, address } = data

    const customer = {
      id: Date.now().toString(),
      name,
      phone,
      address,
      createdAt: new Date().toISOString(),
    }

    systemState.addCustomer(customer)

    return `✅ **客戶資料已建立！**

**姓名：** ${name}
${phone ? `**電話：** ${phone}` : ''}
${address ? `**地址：** ${address}` : ''}

已經幫您記錄下來了，下次這位客戶再來訂瓦斯就方便多了！😊`
  }

  private async executeCheckInventory(systemState: any): Promise<string> {
    const inventory = systemState.getInventory()

    return `📦 **目前庫存狀態**

${inventory.map((i: any) => {
      const status = i.quantity <= i.minStock ? '⚠️ 需要補貨' : '✅ 充足'
      return `• ${i.size}：${i.quantity}桶 ${status}`
}).join('\\n')}

${inventory.some((i: any) => i.quantity <= i.minStock) ? '\\n⚠️ **提醒：** 有些規格的瓦斯庫存不多喔，老闆娘要記得補貨！' : '\\n✅ 庫存都很充足！'}`
  }

  private async executeCheckRevenue(systemState: any): Promise<string> {
    const todayRevenue = systemState.getTodayRevenue()
    const monthRevenue = systemState.getMonthRevenue()
    const monthCost = systemState.getMonthCosts()
    const profit = monthRevenue - monthCost

    return `💰 **營收利潤報告**

**今日營收：** NT$${todayRevenue.toLocaleString()}
**本月營收：** NT$${monthRevenue.toLocaleString()}
**本月支出：** NT$${monthCost.toLocaleString()}
**本月利潤：** NT$${profit.toLocaleString()}

${profit > 0 ? '🌟 這個月有賺到錢喔，老闆娘真厲害！' : '💪 加油，會越來越好的！'}`
  }

  private async executeAddCost(data: any, systemState: any): Promise<string> {
    const { type, amount, description } = data

    const cost = {
      id: Date.now().toString(),
      type,
      amount,
      description,
      date: new Date().toISOString(),
    }

    systemState.addCost(cost)

    return `✅ **成本已記錄**

**項目：** ${description || type}
**金額：** NT$${amount?.toLocaleString() || '0'}
**時間：** ${new Date().toLocaleDateString('zh-TW')}

已經幫您記下來了，月底算利潤的時候就清楚！😊`
  }

  private async executeAddCheck(data: any, systemState: any): Promise<string> {
    const { customer, amount, dueDate } = data

    const check = {
      id: Date.now().toString(),
      customer,
      amount,
      dueDate,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    systemState.addCheck(check)

    return `✅ **支票已記錄**

**客戶：** ${customer}
**金額：** NT$${amount?.toLocaleString() || '0'}
**到期日：** ${dueDate || '未指定'}

老闆娘，記得到期的時候要記得去兌現喔！💰`
  }

  private async executeMeterReading(data: any, systemState: any): Promise<string> {
    const { customer, currentReading, previousReading, amount } = data

    const reading = {
      id: Date.now().toString(),
      customer,
      currentReading,
      previousReading,
      usage: currentReading - previousReading,
      amount,
      date: new Date().toISOString(),
    }

    systemState.addMeterReading(reading)

    return `✅ **抄錶記錄完成**

**客戶：** ${customer}
**本期讀數：** ${currentReading} m³
**上期讀數：** ${previousReading} m³
**使用量：** ${currentReading - previousReading} m³
**費用：** NT$${amount?.toLocaleString() || '計算中'}

已經幫您計算好了，可以通知客戶繳費了！😊`
  }

  private async executeCallRecord(data: any, systemState: any): Promise<string> {
    const { phone, type, notes } = data

    const record = {
      id: Date.now().toString(),
      phone,
      type,
      notes,
      createdAt: new Date().toISOString(),
    }

    systemState.addCallRecord(record)

    return `✅ **來電已記錄**

**電話：** ${phone}
**類型：** ${type || '詢問'}
${notes ? `**備註：** ${notes}` : ''}

已經幫您記下來了，這樣就不會忘記客戶的需求！📞`
  }

  private async executeGetStatistics(systemState: any): Promise<string> {
    const todayOrders = systemState.getTodayOrders()
    const todayRevenue = systemState.getTodayRevenue()
    const monthRevenue = systemState.getMonthRevenue()
    const monthCost = systemState.getMonthCosts()
    const customers = systemState.getCustomerCount()
    const inventory = systemState.getInventory()

    // 計算利潤和利潤率
    const profit = monthRevenue - monthCost
    const profitMargin = monthRevenue > 0 ? ((profit / monthRevenue) * 100).toFixed(1) : '0.0'

    // 計算平均訂單價值
    const avgOrderValue = todayOrders.length > 0
      ? Math.round(todayRevenue / todayOrders.length)
      : 0

    // 庫存分析
    const lowStockItems = inventory.filter((i: any) => i.quantity <= i.minStock)
    const totalInventory = inventory.reduce((sum: number, i: any) => sum + i.quantity, 0)

    return `📊 **營運數據分析報告**

## 📈 今日數據
**訂單數：** ${todayOrders.length} 單
**營業額：** NT$${todayRevenue.toLocaleString()}
**平均訂單：** NT$${avgOrderValue.toLocaleString()}
**客戶數：** ${customers} 人

## 💰 本月財務
**總營收：** NT$${monthRevenue.toLocaleString()}
**總成本：** NT$${monthCost.toLocaleString()}
**淨利潤：** NT$${profit.toLocaleString()}
**利潤率：** ${profitMargin}%

## 📦 庫存狀態
**總庫存：** ${totalInventory} 桶
${lowStockItems.length > 0 ? `⚠️ **低庫存警示：** ${lowStockItems.map((i: any) => i.size).join('、')} 需要補貨` : '✅ **庫存狀態良好**'}

## 🎯 業務洞察
${profit > 0
  ? `🌟 本月已盈利 NT$${profit.toLocaleString()}，利潤率 ${profitMargin}%！${parseFloat(profitMargin) > 30 ? '表現優秀！' : ''}`
  : '💪 繼續努力，目標是扭虧為盈！'}
${todayRevenue > 5000 ? '\n\n💡 **今日表現優異**，建議保持這個勢頭！' : ''}
${lowStockItems.length > 0 ? '\n\n⚠️ **提醒**：有 ' + lowStockItems.length + ' 種規格庫存不足，建議盡快補貨。' : ''}

老闆娘${todayRevenue > 0 ? '，今天生意' : '，新的一天'}${todayRevenue > 0 ? '不錯喔！' : '才剛開始，'}加油！💪`
  }

  /**
   * 清空對話歷史
   */
  clearHistory(): void {
    this.conversationHistory = []
  }

  /**
   * 獲取對話歷史
   */
  getHistory(): ChatMessage[] {
    return [...this.conversationHistory]
  }
}

// ========================================
// 單例模式
// ========================================

let assistantInstance: BossJy99Assistant | null = null

export function getBossJy99Assistant(apiKey?: string): BossJy99Assistant {
  if (!assistantInstance) {
    // 優先順序：
    // 1. 使用提供的 API Key
    // 2. 使用內建的 API Key 池（自動輪替）
    assistantInstance = new BossJy99Assistant(apiKey)
  }
  return assistantInstance
}

export function setApiKey(apiKey: string): void {
  // 服務器端不使用 localStorage，直接重置實例
  assistantInstance = null
}

/**
 * 添加額外的 API Key 到池中（僅客戶端）
 */
export function addApiKey(key: string): void {
  // 服務端不使用 localStorage，無法添加額外的 Key
  // 透過環境變量 GLM_API_KEYS 設置
  console.warn('Server-side: addApiKey not supported. Use GLM_API_KEYS environment variable.')
  assistantInstance = null
}

/**
 * 獲取 API Key 池狀態
 */
export function getApiKeyPoolStatus(): APIKeyStatus[] {
  if (apiKeysPool.length === 0) {
    initializeApiKeyPool()
  }
  return apiKeysPool.map(s => ({
    ...s,
    key: s.key.slice(0, 10) + '...' + s.key.slice(-4), // 隱藏中間部分
  }))
}

/**
 * 檢查是否有可用的 API Key
 */
export function hasApiKey(): boolean {
  // 檢查環境變量
  if (typeof process !== 'undefined' && process.env?.GLM_API_KEY) {
    return true
  }
  if (typeof process !== 'undefined' && process.env?.GLM_API_KEYS) {
    return process.env.GLM_API_KEYS.split(',').some(k => k.trim().length > 0)
  }
  return false
}
