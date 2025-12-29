/**
 * 語音識別糾錯服務
 * 針對台灣瓦斯行業務場景優化
 *
 * 主要功能：
 * 1. 基於規則的快速糾錯
 * 2. AI 智能糾錯（使用 GLM API）
 * 3. 業務術語標準化
 */

// 常見錯誤詞彙映射表
const COMMON_CORRECTIONS: Record<string, string> = {
  // 瓦斯相關
  '瓦斯氣': '瓦斯',
  '瓦斯氣桶': '瓦斯桶',
  '瓦斯斯': '瓦斯',
  '瓦四': '瓦斯',
  '瓦斯是': '瓦斯',

  // 數字轉換（台 -> 桶）
  '一台': '一桶',
  '二台': '二桶',
  '三台': '三桶',
  '四台': '四桶',
  '五台': '五桶',
  '六台': '六桶',
  '七台': '七桶',
  '八台': '八桶',
  '九台': '九桶',
  '十台': '十桶',

  // 訂單相關
  '訂購瓦斯': '訂瓦斯',
  '買瓦斯': '訂瓦斯',
  '瓦斯桶訂購': '訂瓦斯',
  '我要買瓦斯': '訂瓦斯',
  '我想買瓦斯': '訂瓦斯',

  // 庫存相關
  '查詢庫存': '查庫存',
  '庫存查詢': '查庫存',
  '剩餘庫存': '庫存',
  '還有多少庫存': '查庫存',
  '庫存還有沒有': '查庫存',

  // 客戶相關
  '客戶查詢': '查客戶',
  '查詢客戶': '查客戶',
  '找客戶': '查客戶',
  '查客戶資料': '查客戶',

  // 訂單查詢
  '訂單查詢': '查訂單',
  '查詢訂單': '查訂單',
  '我的訂單': '查訂單',

  // 支票相關
  '支票登記': '記錄支票',
  '登記支票': '記錄支票',
  '收到支票': '記錄支票',

  // 成本相關
  '記錄成本': '記錄成本',
  '成本登記': '記錄成本',
  '登記成本': '記錄成本',
}

// 業務術語糾錯
const BUSINESS_TERMS: Record<string, string> = {
  '老闆': '老闆娘',
  'Boss': '老闆娘',
  'boss': '老闆娘',
  '老版': '老闆娘',
}

// 常見繁簡轉換（針對 zh-CN 識別結果）
const SIMPLIFIED_TO_TRADITIONAL: Record<string, string> = {
  '瓦斯': '瓦斯',
  '订单': '訂單',
  '库存': '庫存',
  '客户': '客戶',
  '支票': '支票',
  '老板': '老闆娘',
  '老板娘': '老闆娘',
  '二十公斤': '20公斤',
  '五十公斤': '50公斤',
  '十公斤': '10公斤',
  '五公斤': '5公斤',
  '四公斤': '4公斤',
  '记录': '記錄',
  '查询': '查詢',
  '订购': '訂購',
}

/**
 * 基於規則的快速糾錯
 */
function ruleBasedCorrection(text: string): string {
  let corrected = text

  // 1. 先處理繁簡轉換（如果是 zh-CN 識別結果）
  for (const [simple, traditional] of Object.entries(SIMPLIFIED_TO_TRADITIONAL)) {
    corrected = corrected.replace(new RegExp(simple, 'g'), traditional)
  }

  // 2. 應用常見錯誤修正
  for (const [wrong, right] of Object.entries(COMMON_CORRECTIONS)) {
    corrected = corrected.replace(new RegExp(wrong, 'g'), right)
  }

  // 3. 應用業務術語修正
  for (const [wrong, right] of Object.entries(BUSINESS_TERMS)) {
    corrected = corrected.replace(new RegExp(wrong, 'gi'), right)
  }

  return corrected
}

/**
 * 清理識別結果中的冗餘內容
 */
function cleanTranscript(text: string): string {
  return text
    // 簡體標點轉繁體標點
    .replace(/"/g, '\u201C')  // " → "
    .replace(/"/g, '\u201D')  // " → "
    .replace(/'/g, '\u2018')  // ' → '
    .replace(/'/g, '\u2019')  // ' → '
    .replace(/\(/g, '\uFF08')  // ( → （
    .replace(/\)/g, '\uFF09')  // ) → ）
    .replace(/\s+/g, ' ')  // 合併多餘空格
    .trim()
}

/**
 * 語音糾錯結果接口
 */
export interface CorrectionResult {
  text: string           // 修正後的文字
  original: string       // 原始文字
  corrected: boolean     // 是否進行了修正
  method: 'rule' | 'ai' | 'none'  // 使用的修正方法
}

/**
 * 使用 GLM API 進行智能糾錯
 * @param rawText 原始識別文字
 * @returns 修正後的文字
 */
async function aiBasedCorrection(rawText: string): Promise<string> {
  try {
    // 動態導入以避免循環依賴
    const { getBossJy99Assistant } = await import('./boss-jy-99-api')
    const assistant = getBossJy99Assistant()

    const prompt = `你是台灣瓦斯行的語音識別糾錯助手。請修正以下語音識別可能出現的錯誤。

【識別原文】${rawText}

【業務場景】
- 用戶是台灣瓦斯行的老闆娘
- 常用指令：訂瓦斯、查庫存、查客戶、查訂單、記錄支票、記錄成本
- 瓦斯規格：4kg、5kg、10kg、16kg、20kg、50kg
- 數量單位：桶（不是「台」）

【要求】
1. 只返回修正後的完整句子
2. 不要解釋，不要標註
3. 保留原意，修正錯別字
4. 使用繁體中文

【修正後】`

    const response = await assistant.chat(prompt)

    // 提取 AI 返回的修正文字
    const corrected = response
      .replace(/【修正後】/g, '')
      .replace(/【識別原文】.*/g, '')
      .replace(/【要求】.*/g, '')
      .replace(/【業務場景】.*/g, '')
      .trim()

    return corrected || rawText
  } catch (error) {
    console.error('AI 糾錯失敗，使用原文:', error)
    return rawText
  }
}

/**
 * 主要糾錯函數
 * @param rawText 原始語音識別文字
 * @param confidence 識別置信度（可選）
 * @param enableAI 是否啟用 AI 糾錯（默認 true）
 * @returns 糾錯結果
 */
export async function correctVoiceRecognition(
  rawText: string,
  confidence?: number,
  enableAI: boolean = true
): Promise<CorrectionResult> {
  if (!rawText || rawText.trim().length === 0) {
    return {
      text: '',
      original: rawText,
      corrected: false,
      method: 'none',
    }
  }

  // 1. 清理原始文字
  const cleaned = cleanTranscript(rawText)

  // 2. 先用規則快速修正
  const ruleCorrected = ruleBasedCorrection(cleaned)
  const ruleChanged = ruleCorrected !== cleaned

  // 3. 如果啟用 AI 且置信度低且規則沒有大幅改變，使用 AI
  if (enableAI &&
      confidence !== undefined &&
      confidence < 0.7 &&
      !ruleChanged) {
    const aiCorrected = await aiBasedCorrection(ruleCorrected)

    // 檢查 AI 是否做了修改
    if (aiCorrected !== ruleCorrected) {
      saveCorrectionStats('ai')
      return {
        text: aiCorrected,
        original: rawText,
        corrected: true,
        method: 'ai',
      }
    }
  }

  // 4. 返回規則修正結果
  if (ruleChanged) {
    saveCorrectionStats('rule')
  }
  return {
    text: ruleCorrected,
    original: rawText,
    corrected: ruleChanged,
    method: ruleChanged ? 'rule' : 'none',
  }
}

/**
 * 快速規則糾錯（同步版本）
 * @param rawText 原始文字
 * @returns 修正後的文字
 */
export function quickCorrect(rawText: string): string {
  if (!rawText || rawText.trim().length === 0) {
    return rawText
  }
  const cleaned = cleanTranscript(rawText)
  return ruleBasedCorrection(cleaned)
}

/**
 * 獲取糾錯統計信息（調試用）
 */
export function getCorrectionStats(): {
  totalCorrections: number
  ruleBased: number
  aiBased: number
} {
  // 可以從 localStorage 讀取統計信息
  const stats = localStorage.getItem('voice_correction_stats')
  if (stats) {
    return JSON.parse(stats)
  }
  return {
    totalCorrections: 0,
    ruleBased: 0,
    aiBased: 0,
  }
}

/**
 * 保存糾錯統計信息（內部使用）
 */
function saveCorrectionStats(method: 'rule' | 'ai') {
  const stats = getCorrectionStats()
  stats.totalCorrections++
  if (method === 'rule') stats.ruleBased++
  if (method === 'ai') stats.aiBased++
  localStorage.setItem('voice_correction_stats', JSON.stringify(stats))
}
