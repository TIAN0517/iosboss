/**
 * 預錄語音知識庫
 * 對應 WAV 檔案到問答內容
 */

import path from 'path'
import { promises as fs } from 'fs'

// 語音檔案對應表
export const AUDIO_MAP: Record<string, string> = {
  // 營業時間
  'hours': 'hours.wav',
  '營業時間': 'hours.wav',
  '幾點開門': 'hours.wav',
  '營業幾點': 'hours.wav',

  // 價格 (通用)
  'pricing': 'pricing_meilun.wav',
  '多少錢': 'pricing_meilun.wav',
  '價格': 'pricing_meilun.wav',
  '瓦斯多少錢': 'pricing_meilun.wav',
  '20公斤多少錢': 'pricing_meilun.wav',
  '16公斤多少錢': 'pricing_meilun.wav',

  // 訂購
  'order_gas': 'order_gas.wav',
  '怎麼訂': 'order_gas.wav',
  '如何訂購': 'order_gas.wav',
  '我要訂瓦斯': 'order_gas.wav',

  // 配送
  'delivery': 'delivery.wav',
  '配送': 'delivery.wav',
  '怎麼送': 'delivery.wav',

  // 配送範圍
  'delivery_area': 'delivery_area.wav',
  '送哪裡': 'delivery_area.wav',
  '配送範圍': 'delivery_area.wav',
  '送到我家': 'delivery_area.wav',

  // 配送免費
  'delivery_free': 'delivery_free.wav',
  '配送費': 'delivery_free.wav',
  '運費': 'delivery_free.wav',

  // 配送時間
  'delivery_time': 'delivery_time.wav',
  '多久送到': 'delivery_time.wav',
  '什麼時候送': 'delivery_time.wav',

  // 付款
  'payment': 'payment.wav',
  '付款': 'payment.wav',
  '怎麼付款': 'payment.wav',
  '付款方式': 'payment.wav',

  // 月結
  'monthly_billing': 'monthly_billing.wav',
  '月結': 'monthly_billing.wav',
  '月結優惠': 'monthly_billing.wav',

  // 安全 - 外洩
  'safety_leak': 'safety_leak.wav',
  '瓦斯外洩': 'safety_leak.wav',
  '瓦斯漏氣': 'safety_leak.wav',
  '瓦斯味': 'safety_leak.wav',

  // 安全 - 檢查
  'safety_check': 'safety_check.wav',
  '安全檢查': 'safety_check.wav',
  '定期檢查': 'safety_check.wav',

  // 安全 - 提醒
  'safety_reminder': 'safety_reminder.wav',
  '注意事項': 'safety_reminder.wav',
  '安全注意': 'safety_reminder.wav',

  // 促銷 - 新客戶
  'promotion_new': 'promotion_new.wav',
  '新客戶': 'promotion_new.wav',
  '首單優惠': 'promotion_new.wav',
  '有什麼優惠': 'promotion_new.wav',

  // 促銷 - 團購
  'bulk_order': 'bulk_order.wav',
  '團購': 'bulk_order.wav',
  '大量訂購': 'bulk_order.wav',
  '團體訂購': 'bulk_order.wav',

  // 緊急
  'emergency': 'emergency.wav',
  '緊急': 'emergency.wav',
  '聯絡電話': 'emergency.wav',
  '客服電話': 'emergency.wav',

  // 緊急 - 瓦斯外洩
  'emergency_gas_leak': 'emergency_gas_leak.wav',
  '瓦斯外洩怎麼辦': 'emergency_gas_leak.wav',
  '漏氣怎麼辦': 'emergency_gas_leak.wav',

  // 產品 - 4kg
  'cylinder_4kg': 'cylinder_4kg.wav',
  '4公斤': 'cylinder_4kg.wav',
  '4kg': 'cylinder_4kg.wav',

  // 產品 - 10kg
  'cylinder_10kg': 'cylinder_10kg.wav',
  '10公斤': 'cylinder_10kg.wav',
  '10kg': 'cylinder_10kg.wav',

  // 產品 - 16kg
  'cylinder_16kg': 'cylinder_16kg.wav',
  '16公斤': 'cylinder_16kg.wav',
  '16kg': 'cylinder_16kg.wav',

  // 產品 - 20kg
  'cylinder_20kg': 'cylinder_20kg.wav',
  '20公斤': 'cylinder_20kg.wav',
  '20kg': 'cylinder_20kg.wav',

  // 產品 - 50kg
  'cylinder_50kg': 'cylinder_50kg.wav',
  '50公斤': 'cylinder_50kg.wav',
  '50kg': 'cylinder_50kg.wav',

  // 美崙價格
  '美崙': 'pricing_meilun.wav',
  '美崙價格': 'pricing_meilun.wav',

  // 吉安價格
  '吉安': 'pricing_ji-an.wav',
  '吉安價格': 'pricing_ji-an.wav',

  // 瓦斯桶壽命
  'cylinder_lifespan': 'cylinder_lifespan.wav',
  '用多久': 'cylinder_lifespan.wav',
  '瓦斯桶壽命': 'cylinder_lifespan.wav',
  '可以用多久': 'cylinder_lifespan.wav',

  // 歡迎語
  'welcome': 'welcome.wav',
  '你好': 'welcome.wav',
  '開始對話': 'welcome.wav',
}

// 所有可用的語音檔案
export const AVAILABLE_AUDIOS = Object.values(AUDIO_MAP)

// 支援的 WAV 檔案列表
export const SUPPORTED_WAV_FILES = [
  'welcome.wav',
  'pricing_meilun.wav',
  'pricing_ji-an.wav',
  'order_gas.wav',
  'hours.wav',
  'delivery.wav',
  'delivery_area.wav',
  'delivery_free.wav',
  'delivery_time.wav',
  'payment.wav',
  'monthly_billing.wav',
  'safety_leak.wav',
  'safety_check.wav',
  'safety_reminder.wav',
  'promotion_new.wav',
  'bulk_order.wav',
  'emergency.wav',
  'emergency_gas_leak.wav',
  'cylinder_4kg.wav',
  'cylinder_10kg.wav',
  'cylinder_16kg.wav',
  'cylinder_20kg.wav',
  'cylinder_50kg.wav',
  'cylinder_lifespan.wav',
]

/**
 * 根據關鍵字找到對應的語音檔案
 */
export function findAudioFile(keyword: string): string | null {
  const normalized = keyword.toLowerCase().trim()

  // 直接匹配
  if (AUDIO_MAP[normalized]) {
    return AUDIO_MAP[normalized]
  }

  // 部分匹配
  for (const [key, value] of Object.entries(AUDIO_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value
    }
  }

  return null
}

/**
 * 檢查語音檔案是否存在
 */
export async function audioFileExists(fileName: string): Promise<boolean> {
  try {
    const audioDir = process.cwd()
    await fs.access(path.join(audioDir, fileName))
    return true
  } catch {
    return false
  }
}

/**
 * 讀取語音檔案
 */
export async function getAudioFile(fileName: string): Promise<Buffer | null> {
  try {
    const audioDir = process.cwd()
    const filePath = path.join(audioDir, fileName)
    return await fs.readFile(filePath)
  } catch {
    return null
  }
}

/**
 * 獲取所有可用的語音檔案列表
 */
export function getAvailableAudioList(): string[] {
  return SUPPORTED_WAV_FILES
}

/**
 * 語音類型
 */
export type AudioType =
  | 'welcome'
  | 'pricing'
  | 'order'
  | 'delivery'
  | 'payment'
  | 'safety'
  | 'promotion'
  | 'emergency'
  | 'product'

export const AUDIO_TYPE_MAP: Record<string, AudioType> = {
  'welcome.wav': 'welcome',
  'pricing_20kg.wav': 'pricing',
  'order_gas.wav': 'order',
  'delivery.wav': 'delivery',
  'delivery_area.wav': 'delivery',
  'delivery_free.wav': 'delivery',
  'delivery_time.wav': 'delivery',
  'payment.wav': 'payment',
  'monthly_billing.wav': 'payment',
  'safety_leak.wav': 'safety',
  'safety_check.wav': 'safety',
  'safety_reminder.wav': 'safety',
  'promotion_new.wav': 'promotion',
  'bulk_order.wav': 'promotion',
  'emergency.wav': 'emergency',
  'emergency_gas_leak.wav': 'emergency',
  'cylinder_4kg.wav': 'product',
  'cylinder_10kg.wav': 'product',
  'cylinder_16kg.wav': 'product',
  'cylinder_20kg.wav': 'product',
  'cylinder_50kg.wav': 'product',
  'cylinder_lifespan.wav': 'product',
}
