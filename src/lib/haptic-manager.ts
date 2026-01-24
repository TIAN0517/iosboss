/**
 * 觸覺反饋管理器 - 增強版
 * 提供上下文感知的觸覺反饋效果
 */

import { triggerHaptic, triggerHapticSequence, triggerAdaptiveHaptic, HapticType } from './ios-utils'

/**
 * UI 交互反饋配置
 */
export interface HapticPattern {
  pattern: HapticType[]
  delay?: number
}

/**
 * 反饋強度配置
 */
export type FeedbackIntensity = 'subtle' | 'normal' | 'strong'

/**
 * 上下文類型
 */
export type HapticContext =
  | 'navigation'
  | 'button'
  | 'toggle'
  | 'scroll'
  | 'input'
  | 'selection'
  | 'success'
  | 'error'
  | 'warning'
  | 'loading'
  | 'refresh'
  | 'delete'
  | 'confirm'
  | 'cancel'

/**
 * 預定義的觸覺反饋模式
 */
const HapticPatterns: Record<HapticContext, HapticPattern> = {
  // 導航反饋
  navigation: {
    pattern: ['light'],
    delay: 0,
  },

  // 按鈕點擊
  button: {
    pattern: ['light'],
    delay: 0,
  },

  // 開關切換
  toggle: {
    pattern: ['selection'],
    delay: 0,
  },

  // 滾動反饋
  scroll: {
    pattern: ['selection'],
    delay: 0,
  },

  // 輸入反饋
  input: {
    pattern: ['light'],
    delay: 0,
  },

  // 選擇反饋
  selection: {
    pattern: ['selection'],
    delay: 0,
  },

  // 成功反饋
  success: {
    pattern: ['success'],
    delay: 50,
  },

  // 錯誤反饋
  error: {
    pattern: ['error'],
    delay: 0,
  },

  // 警告反饋
  warning: {
    pattern: ['warning'],
    delay: 0,
  },

  // 載入中
  loading: {
    pattern: ['selection', 'selection', 'selection'],
    delay: 200,
  },

  // 刷新
  refresh: {
    pattern: ['medium', 'success'],
    delay: 100,
  },

  // 刪除
  delete: {
    pattern: ['heavy', 'error'],
    delay: 50,
  },

  // 確認
  confirm: {
    pattern: ['medium', 'success'],
    delay: 50,
  },

  // 取消
  cancel: {
    pattern: ['light', 'light'],
    delay: 50,
  },
}

/**
 * 觸覺反饋管理器類
 */
export class HapticManager {
  private static instance: HapticManager
  private enabled: boolean = true
  private intensity: FeedbackIntensity = 'normal'
  private lastFeedbackTime: number = 0
  private feedbackQueue: Map<HapticContext, number> = new Map()

  private constructor() {
    // 私有構造函數，單例模式
  }

  /**
   * 獲取單例實例
   */
  static getInstance(): HapticManager {
    if (!HapticManager.instance) {
      HapticManager.instance = new HapticManager()
    }
    return HapticManager.instance
  }

  /**
   * 啟用/禁用觸覺反饋
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * 檢查是否啟用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 設置反饋強度
   */
  setIntensity(intensity: FeedbackIntensity): void {
    this.intensity = intensity
  }

  /**
   * 獲取反饋強度
   */
  getIntensity(): FeedbackIntensity {
    return this.intensity
  }

  /**
   * 應用強度調整
   */
  private applyIntensity(type: HapticType): HapticType {
    if (this.intensity === 'subtle') {
      // 微弱模式：使用較輕的震動
      const subtleMapping: Partial<Record<HapticType, HapticType>> = {
        heavy: 'medium',
        medium: 'light',
        error: 'warning',
        warning: 'light',
        success: 'medium',
      }
      return subtleMapping[type] || 'light'
    } else if (this.intensity === 'strong') {
      // 強烈模式：使用較重的震動
      const strongMapping: Partial<Record<HapticType, HapticType>> = {
        light: 'medium',
        selection: 'impact',
      }
      return strongMapping[type] || type
    }
    return type
  }

  /**
   * 檢查反饋頻率限制
   */
  private shouldDebounce(context: HapticContext): boolean {
    const now = Date.now()
    const lastTime = this.feedbackQueue.get(context) || 0
    const minInterval = this.getMinInterval(context)

    if (now - lastTime < minInterval) {
      return true
    }

    this.feedbackQueue.set(context, now)
    return false
  }

  /**
   * 獲取最小反饋間隔
   */
  private getMinInterval(context: HapticContext): number {
    const intervals: Record<HapticContext, number> = {
      scroll: 50,
      selection: 30,
      navigation: 200,
      button: 100,
      toggle: 150,
      input: 80,
      success: 300,
      error: 500,
      warning: 400,
      loading: 200,
      refresh: 1000,
      delete: 500,
      confirm: 300,
      cancel: 200,
    }
    return intervals[context] || 100
  }

  /**
   * 觸發上下文感知的觸覺反饋
   */
  feedback(context: HapticContext, force: boolean = false): void {
    if (!this.enabled && !force) return

    if (this.shouldDebounce(context) && !force) return

    const pattern = HapticPatterns[context]
    if (pattern.pattern.length === 1) {
      const adjustedType = this.applyIntensity(pattern.pattern[0])
      triggerHaptic(adjustedType, { force })
    } else {
      const adjustedPattern = pattern.pattern.map(p => this.applyIntensity(p))
      triggerHapticSequence(adjustedPattern, pattern.delay)
    }
  }

  /**
   * 導航反饋
   */
  navigate(direction: 'forward' | 'back'): void {
    if (direction === 'forward') {
      this.feedback('navigation')
    } else {
      triggerHapticSequence(['light', 'light'], 50)
    }
  }

  /**
   * 按鈕反饋
   */
  button(intensity: FeedbackIntensity = 'normal'): void {
    const oldIntensity = this.intensity
    this.intensity = intensity
    this.feedback('button')
    this.intensity = oldIntensity
  }

  /**
   * 開關反饋
   */
  toggle(state: boolean): void {
    this.feedback('toggle')
    if (state) {
      setTimeout(() => triggerHaptic('light'), 100)
    }
  }

  /**
   * 滾動反饋（帶速度感知）
   */
  scroll(velocity: number): void {
    if (velocity > 2000) {
      triggerAdaptiveHaptic('scroll', velocity)
    }
  }

  /**
   * 輸入反饋
   */
  input(): void {
    this.feedback('input')
  }

  /**
   * 成功反饋
   */
  success(): void {
    this.feedback('success')
  }

  /**
   * 錯誤反饋
   */
  error(): void {
    this.feedback('error')
  }

  /**
   * 警告反饋
   */
  warning(): void {
    this.feedback('warning')
  }

  /**
   * 載入反饋
   */
  loading(): void {
    this.feedback('loading')
  }

  /**
   * 刷新反饋
   */
  refresh(): void {
    this.feedback('refresh')
  }

  /**
   * 刪除反饋
   */
  delete(): void {
    this.feedback('delete')
  }

  /**
   * 確認反饋
   */
  confirm(): void {
    this.feedback('confirm')
  }

  /**
   * 取消反饋
   */
  cancel(): void {
    this.feedback('cancel')
  }

  /**
   * 節慶模式反饋（特殊效果）
   */
  celebration(): void {
    triggerHapticSequence(['success', 'medium', 'success', 'medium', 'success'], 80)
  }

  /**
   * 打字機效果反饋
   */
  typewriter(): void {
    triggerHaptic('selection', { intensity: 'weak' })
  }

  /**
   * 倒數計時反饋
   */
  countdown(seconds: number): void {
    const interval = setInterval(() => {
      triggerHaptic('light', { force: true })
    }, 1000)

    setTimeout(() => {
      clearInterval(interval)
      triggerHapticSequence(['medium', 'success'], 100)
    }, seconds * 1000)
  }

  /**
   * 通知反饋
   */
  notify(urgent: boolean = false): void {
    if (urgent) {
      triggerHapticSequence(['error', 'error'], 200)
    } else {
      this.feedback('notification' as HapticContext)
    }
  }

  /**
   * 進度反饋
   */
  progress(current: number, total: number): void {
    const percentage = current / total

    // 在 25%, 50%, 75% 時提供反饋
    if (percentage === 0.25 || percentage === 0.5 || percentage === 0.75 || percentage === 1) {
      triggerHaptic('selection')
    }

    // 完成時
    if (percentage === 1) {
      setTimeout(() => this.success(), 200)
    }
  }

  /**
   * 手勢反饋
   */
  gesture(
    gesture: 'swipe' | 'pinch' | 'rotate' | 'pan',
    velocity?: number
  ): void {
    // Map gesture types to valid triggerAdaptiveHaptic contexts
    const contextMap: Record<string, 'scroll' | 'swipe' | 'tap' | 'hold' | 'drag'> = {
      swipe: 'swipe',
      pan: 'drag',
      pinch: 'drag',
      rotate: 'drag',
    }
    triggerAdaptiveHaptic(contextMap[gesture] || 'swipe', velocity)
  }

  /**
   * 重置所有狀態
   */
  reset(): void {
    this.feedbackQueue.clear()
    this.lastFeedbackTime = 0
  }
}

/**
 * 導出單例實例
 */
export const hapticManager = HapticManager.getInstance()

/**
 * 便捷的 Hook
 */
export function useHaptic() {
  return {
    feedback: (context: HapticContext) => hapticManager.feedback(context),
    navigate: (direction: 'forward' | 'back') => hapticManager.navigate(direction),
    button: (intensity?: FeedbackIntensity) => hapticManager.button(intensity),
    toggle: (state: boolean) => hapticManager.toggle(state),
    scroll: (velocity: number) => hapticManager.scroll(velocity),
    input: () => hapticManager.input(),
    success: () => hapticManager.success(),
    error: () => hapticManager.error(),
    warning: () => hapticManager.warning(),
    loading: () => hapticManager.loading(),
    refresh: () => hapticManager.refresh(),
    delete: () => hapticManager.delete(),
    confirm: () => hapticManager.confirm(),
    cancel: () => hapticManager.cancel(),
    celebration: () => hapticManager.celebration(),
    typewriter: () => hapticManager.typewriter(),
    countdown: (seconds: number) => hapticManager.countdown(seconds),
    notify: (urgent?: boolean) => hapticManager.notify(urgent),
    progress: (current: number, total: number) => hapticManager.progress(current, total),
    gesture: (gesture: 'swipe' | 'pinch' | 'rotate' | 'pan', velocity?: number) =>
      hapticManager.gesture(gesture, velocity),
  }
}
