/**
 * 語音對話狀態機
 * 管理語音對話的複雜狀態轉換
 */

// ========================================
// 類型定義
// ========================================

export type VoiceState =
  | { type: 'idle' }
  | { type: 'listening'; startTime: number }
  | { type: 'processing'; transcript: string }
  | { type: 'speaking'; response: string }
  | { type: 'error'; error: string }

export type StateType = VoiceState['type']

export interface VoiceStateChangeEvent {
  previousState: VoiceState | null
  currentState: VoiceState
  timestamp: number
}

// ========================================
// 語音狀態機
// ========================================

export class VoiceStateMachine {
  private state: VoiceState = { type: 'idle' }
  private history: VoiceStateChangeEvent[] = []
  private listeners: Set<(event: VoiceStateChangeEvent) => void> = new Set()
  private maxHistorySize = 50

  /**
   * 獲取當前狀態
   */
  getState(): VoiceState {
    return this.state
  }

  /**
   * 獲取狀態類型
   */
  getStateType(): StateType {
    return this.state.type
  }

  /**
   * 檢查是否處於指定狀態
   */
  is(stateType: StateType): boolean {
    return this.state.type === stateType
  }

  /**
   * 檢查是否處於活動狀態（非 idle）
   */
  isActive(): boolean {
    return this.state.type !== 'idle'
  }

  /**
   * 轉換到新狀態
   */
  transition(newState: VoiceState): void {
    const previousState = this.state
    const event: VoiceStateChangeEvent = {
      previousState,
      currentState: newState,
      timestamp: Date.now(),
    }

    this.state = newState

    // 記錄歷史
    this.history.push(event)
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }

    // 通知監聽器
    this.notify(event)
  }

  /**
   * 快捷方法：轉換到 idle
   */
  toIdle(): void {
    this.transition({ type: 'idle' })
  }

  /**
   * 快捷方法：轉換到 listening
   */
  toListening(): void {
    this.transition({ type: 'listening', startTime: Date.now() })
  }

  /**
   * 快捷方法：轉換到 processing
   */
  toProcessing(transcript: string): void {
    this.transition({ type: 'processing', transcript })
  }

  /**
   * 快捷方法：轉換到 speaking
   */
  toSpeaking(response: string): void {
    this.transition({ type: 'speaking', response })
  }

  /**
   * 快捷方法：轉換到 error
   */
  toError(error: string): void {
    this.transition({ type: 'error', error })
  }

  /**
   * 訂閱狀態變化
   */
  subscribe(callback: (event: VoiceStateChangeEvent) => void): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * 通知所有監聽器
   */
  private notify(event: VoiceStateChangeEvent): void {
    this.listeners.forEach(callback => {
      try {
        callback(event)
      } catch (error) {
        console.error('State listener error:', error)
      }
    })
  }

  /**
   * 獲取狀態歷史
   */
  getHistory(): VoiceStateChangeEvent[] {
    return [...this.history]
  }

  /**
   * 獲取當前持續時間（毫秒）
   */
  getDuration(): number {
    if (this.state.type === 'idle') {
      return 0
    }

    const lastEvent = this.history[this.history.length - 1]
    if (!lastEvent) {
      return 0
    }

    return Date.now() - lastEvent.timestamp
  }

  /**
   * 重置狀態機
   */
  reset(): void {
    this.state = { type: 'idle' }
    this.history = []
    this.notify({
      previousState: null,
      currentState: this.state,
      timestamp: Date.now(),
    })
  }

  /**
   * 獲取狀態描述
   */
  getStateDescription(): string {
    switch (this.state.type) {
      case 'idle':
        return '待機'
      case 'listening':
        return '聆聽中'
      case 'processing':
        return '思考中'
      case 'speaking':
        return '說話中'
      case 'error':
        return `錯誤: ${this.state.error}`
    }
  }

  /**
   * 獲取狀態圖標
   */
  getStateIcon(): string {
    switch (this.state.type) {
      case 'idle':
        return '🎤'
      case 'listening':
        return '👂'
      case 'processing':
        return '🤔'
      case 'speaking':
        return '🔊'
      case 'error':
        return '⚠️'
    }
  }

  /**
   * 獲取狀態顏色
   */
  getStateColor(): string {
    switch (this.state.type) {
      case 'idle':
        return 'orange'
      case 'listening':
        return 'red'
      case 'processing':
        return 'blue'
      case 'speaking':
        return 'green'
      case 'error':
        return 'red'
    }
  }
}

// ========================================
// 語音對話管理器
// ========================================

export interface VoiceConversationConfig {
  /**
   * 靜音檢測超時（毫秒）
   */
  silenceTimeout?: number
  /**
   * 最大錄音時長（毫秒）
   */
  maxRecordingDuration?: number
  /**
   * 是否自動重啟聆聽
   */
  autoRestart?: boolean
  /**
   * 是否啟用 TTS
   */
  enableTTS?: boolean
}

export class VoiceConversationManager {
  private stateMachine: VoiceStateMachine
  private config: Required<VoiceConversationConfig>
  private silenceTimer: NodeJS.Timeout | null = null
  private maxDurationTimer: NodeJS.Timeout | null = null
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }> = []

  constructor(config: VoiceConversationConfig = {}) {
    this.stateMachine = new VoiceStateMachine()
    this.config = {
      silenceTimeout: config.silenceTimeout ?? 1500,
      maxRecordingDuration: config.maxRecordingDuration ?? 30000,
      autoRestart: config.autoRestart ?? true,
      enableTTS: config.enableTTS ?? true,
    }
  }

  /**
   * 獲取狀態機
   */
  getStateMachine(): VoiceStateMachine {
    return this.stateMachine
  }

  /**
   * 開始聆聽
   */
  startListening(): void {
    if (this.stateMachine.isActive()) {
      return
    }

    this.stateMachine.toListening()
    this.startSilenceDetection()
    this.startMaxDurationTimer()
  }

  /**
   * 停止聆聽
   */
  stopListening(): void {
    this.clearTimers()
    this.stateMachine.toIdle()
  }

  /**
   * 處理語音輸入
   */
  handleVoiceInput(transcript: string): void {
    if (!transcript.trim()) {
      return
    }

    this.clearTimers()

    // 添加用戶訊息到歷史
    this.conversationHistory.push({
      role: 'user',
      content: transcript,
      timestamp: Date.now(),
    })

    // 轉換到處理狀態
    this.stateMachine.toProcessing(transcript)
  }

  /**
   * 處理 AI 回應
   */
  handleAIResponse(response: string): void {
    // 添加 AI 回應到歷史
    this.conversationHistory.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    })

    // 轉換到說話狀態
    this.stateMachine.toSpeaking(response)
  }

  /**
   * 處理錯誤
   */
  handleError(error: string): void {
    this.clearTimers()
    this.stateMachine.toError(error)
  }

  /**
   * 標記說話完成
   */
  markSpeakingComplete(): void {
    if (this.stateMachine.is('speaking')) {
      if (this.config.autoRestart) {
        // 自動重啟聆聽
        setTimeout(() => {
          if (this.stateMachine.is('speaking')) {
            this.startListening()
          }
        }, 500)
      } else {
        // 返回待機
        this.stateMachine.toIdle()
      }
    }
  }

  /**
   * 靜音檢測
   */
  private startSilenceDetection(): void {
    this.silenceTimer = setTimeout(() => {
      if (this.stateMachine.is('listening')) {
        // 超時自動提交
        this.stopListening()
      }
    }, this.config.silenceTimeout)
  }

  /**
   * 最大時長檢測
   */
  private startMaxDurationTimer(): void {
    this.maxDurationTimer = setTimeout(() => {
      if (this.stateMachine.is('listening')) {
        this.stopListening()
      }
    }, this.config.maxRecordingDuration)
  }

  /**
   * 清除所有計時器
   */
  private clearTimers(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }
    if (this.maxDurationTimer) {
      clearTimeout(this.maxDurationTimer)
      this.maxDurationTimer = null
    }
  }

  /**
   * 獲取對話歷史
   */
  getConversationHistory(): VoiceConversationManager['conversationHistory'] {
    return [...this.conversationHistory]
  }

  /**
   * 清空對話歷史
   */
  clearHistory(): void {
    this.conversationHistory = []
  }

  /**
   * 訂閱狀態變化
   */
  onStateChange(callback: (event: VoiceStateChangeEvent) => void): () => void {
    return this.stateMachine.subscribe(callback)
  }

  /**
   * 清理資源
   */
  dispose(): void {
    this.clearTimers()
    this.stateMachine.reset()
    this.conversationHistory = []
  }
}

// ========================================
// 單例模式
// ========================================

let managerInstance: VoiceConversationManager | null = null

/**
 * 獲取語音對話管理器實例
 */
export function getVoiceConversationManager(
  config?: VoiceConversationConfig
): VoiceConversationManager {
  if (!managerInstance) {
    managerInstance = new VoiceConversationManager(config)
  }
  return managerInstance
}

/**
 * 重置語音對話管理器
 */
export function resetVoiceConversationManager(): void {
  if (managerInstance) {
    managerInstance.dispose()
  }
  managerInstance = null
}
