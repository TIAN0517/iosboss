/**
 * LINE 系統日誌記錄服務
 * 用於記錄所有 LINE 相關操作的持久化存儲
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase 配置缺失，日誌記錄功能可能無法正常工作')
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export interface LogEntry {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL'
  category: 'WEBHOOK' | 'BOT' | 'API' | 'MESSAGE' | 'USER_ACTION' | 'SYSTEM'
  source: 'frontend' | 'backend' | 'line_bot' | 'ai_service'
  event_type: string
  user_id?: string
  user_name?: string
  group_id?: string
  session_id?: string
  message_id?: string
  request_id?: string
  
  message_type?: string
  message_content?: string
  message_summary?: string
  
  ai_model?: string
  ai_response?: string
  ai_processing_time?: number
  ai_tokens_used?: number
  
  client_ip?: string
  user_agent?: string
  referer?: string
  request_method?: string
  request_url?: string
  request_body?: any
  response_status?: number
  response_time?: number
  error_code?: string
  error_message?: string
  stack_trace?: string
  
  business_context?: any
  action_taken?: string
  result_status?: 'success' | 'failure' | 'pending'
  
  environment?: string
  server_name?: string
  process_id?: number
  
  metadata?: any
  tags?: string[]
  correlation_id?: string
}

export interface LineMessage {
  line_message_id: string
  line_user_id: string
  line_group_id?: string
  line_room_id?: string
  message_type: string
  original_content?: string
  processed_content?: string
  message_length?: number
  
  audio_url?: string
  audio_duration?: number
  transcription?: string
  transcription_confidence?: number
  
  image_url?: string
  image_size?: number
  image_width?: number
  image_height?: number
  
  latitude?: number
  longitude?: number
  address?: string
  
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  ai_analyzed?: boolean
  business_action_taken?: string
}

export interface AIAction {
  ai_provider: string
  ai_model: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  estimated_cost?: number
  ai_response?: string
  response_quality_score?: number
  response_time?: number
  business_action_triggered?: string
  action_execution_success?: boolean
  action_execution_result?: any
  user_satisfaction_score?: number
  human_review_required?: boolean
  review_notes?: string
}

export class LineLogger {
  private correlationId: string = ''
  
  constructor() {
    this.correlationId = this.generateCorrelationId()
  }

  /**
   * 生成唯一的關聯 ID
   */
  private generateCorrelationId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 設置關聯 ID
   */
  setCorrelationId(id: string): void {
    this.correlationId = id
  }

  /**
   * 記錄日誌
   */
  async log(entry: Partial<LogEntry>): Promise<void> {
    try {
      const logEntry: LogEntry = {
        level: 'INFO',
        category: 'SYSTEM',
        source: 'frontend',
        event_type: 'custom_log',
        environment: process.env.NODE_ENV || 'development',
        server_name: 'nextjs_client',
        process_id: typeof window !== 'undefined' ? window.performance.now() : 0,
        correlation_id: this.correlationId,
        ...entry
      }

      // 如果有 Supabase 配置，使用 Supabase
      if (supabase) {
        await supabase
          .from('line_system_logs')
          .insert([logEntry])
      } else {
        // 備用方案：使用本地存儲
        this.saveToLocalStorage(logEntry)
      }
    } catch (error) {
      console.error('記錄日誌失敗:', error)
      // 即使失敗也要嘗試本地存儲
      this.saveToLocalStorage(entry)
    }
  }

  /**
   * 記錄 LINE 消息
   */
  async logMessage(message: Partial<LineMessage>, logData?: Partial<LogEntry>): Promise<void> {
    try {
      const messageEntry: Partial<LogEntry> = {
        level: 'INFO',
        category: 'MESSAGE',
        source: 'line_bot',
        event_type: 'message_processed',
        message_type: message.message_type,
        message_content: message.original_content,
        message_summary: this.generateMessageSummary(message.original_content || ''),
        user_id: message.line_user_id,
        group_id: message.line_group_id,
        result_status: 'success',
        ...logData
      }

      await this.log(messageEntry)

      // 額外記錄到消息表
      if (supabase) {
        await supabase
          .from('line_messages')
          .insert([{
            line_message_id: message.line_message_id,
            line_user_id: message.line_user_id,
            line_group_id: message.line_group_id,
            line_room_id: message.line_room_id,
            message_type: message.message_type,
            original_content: message.original_content,
            processed_content: message.processed_content,
            message_length: message.message_length,
            audio_url: message.audio_url,
            audio_duration: message.audio_duration,
            transcription: message.transcription,
            transcription_confidence: message.transcription_confidence,
            image_url: message.image_url,
            image_size: message.image_size,
            image_width: message.image_width,
            image_height: message.image_height,
            latitude: message.latitude,
            longitude: message.longitude,
            address: message.address,
            processing_status: message.processing_status || 'completed',
            ai_analyzed: message.ai_analyzed || false,
            business_action_taken: message.business_action_taken
          }])
      }
    } catch (error) {
      console.error('記錄消息失敗:', error)
    }
  }

  /**
   * 記錄 AI 交互
   */
  async logAIAction(
    messageId: string | number,
    action: Partial<AIAction>,
    logData?: Partial<LogEntry>
  ): Promise<void> {
    try {
      const aiEntry: Partial<LogEntry> = {
        level: 'INFO',
        category: 'API',
        source: 'ai_service',
        event_type: 'ai_interaction',
        ai_model: action.ai_model,
        ai_response: action.ai_response,
        ai_processing_time: action.response_time,
        ai_tokens_used: action.total_tokens,
        result_status: action.action_execution_success ? 'success' : 'failure',
        metadata: {
          ai_provider: action.ai_provider,
          prompt_tokens: action.prompt_tokens,
          completion_tokens: action.completion_tokens,
          estimated_cost: action.estimated_cost,
          business_action_triggered: action.business_action_triggered,
          user_satisfaction_score: action.user_satisfaction_score
        },
        ...logData
      }

      await this.log(aiEntry)

      // 額外記錄到 AI 交互表
      if (supabase) {
        await supabase
          .from('line_ai_interactions')
          .insert([{
            ai_provider: action.ai_provider,
            ai_model: action.ai_model,
            model_version: '1.0',
            prompt_tokens: action.prompt_tokens,
            completion_tokens: action.completion_tokens,
            total_tokens: action.total_tokens,
            estimated_cost: action.estimated_cost,
            ai_response: action.ai_response,
            response_quality_score: action.response_quality_score,
            response_time: action.response_time,
            business_action_triggered: action.business_action_triggered,
            action_execution_success: action.action_execution_success,
            action_execution_result: action.action_execution_result,
            user_satisfaction_score: action.user_satisfaction_score,
            human_review_required: action.human_review_required || false,
            review_notes: action.review_notes
          }])
      }
    } catch (error) {
      console.error('記錄 AI 交互失敗:', error)
    }
  }

  /**
   * 記錄錯誤
   */
  async logError(
    error: Error | string,
    context?: Partial<LogEntry>
  ): Promise<void> {
    const errorEntry: Partial<LogEntry> = {
      level: 'ERROR',
      category: 'SYSTEM',
      source: 'frontend',
      event_type: 'error_occurred',
      error_message: error instanceof Error ? error.message : error,
      stack_trace: error instanceof Error ? error.stack : undefined,
      result_status: 'failure',
      ...context
    }

    await this.log(errorEntry)
  }

  /**
   * 記錄用戶操作
   */
  async logUserAction(
    action: string,
    details?: any,
    context?: Partial<LogEntry>
  ): Promise<void> {
    const actionEntry: Partial<LogEntry> = {
      level: 'INFO',
      category: 'USER_ACTION',
      source: 'frontend',
      event_type: 'user_action',
      action_taken: action,
      business_context: details,
      result_status: 'success',
      ...context
    }

    await this.log(actionEntry)
  }

  /**
   * 記錄 API 請求
   */
  async logAPIRequest(
    method: string,
    url: string,
    status?: number,
    responseTime?: number,
    context?: Partial<LogEntry>
  ): Promise<void> {
    const apiEntry: Partial<LogEntry> = {
      level: status && status >= 400 ? 'WARN' : 'INFO',
      category: 'API',
      source: 'frontend',
      event_type: 'api_request',
      request_method: method,
      request_url: url,
      response_status: status,
      response_time: responseTime,
      result_status: status && status >= 400 ? 'failure' : 'success',
      ...context
    }

    await this.log(apiEntry)
  }

  /**
   * 生成消息摘要
   */
  private generateMessageSummary(content: string): string {
    if (!content) return ''
    if (content.length <= 100) return content
    return content.substring(0, 97) + '...'
  }

  /**
   * 本地存儲備用方案
   */
  private saveToLocalStorage(entry: any): void {
    try {
      const logs = JSON.parse(localStorage.getItem('line_logs') || '[]')
      logs.push({
        ...entry,
        timestamp: new Date().toISOString(),
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
      
      // 只保留最近 1000 條記錄
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000)
      }
      
      localStorage.setItem('line_logs', JSON.stringify(logs))
    } catch (error) {
      console.error('本地存儲日誌失敗:', error)
    }
  }

  /**
   * 獲取本地日誌
   */
  getLocalLogs(limit: number = 100): any[] {
    try {
      const logs = JSON.parse(localStorage.getItem('line_logs') || '[]')
      return logs.slice(-limit)
    } catch {
      return []
    }
  }

  /**
   * 清除本地日誌
   */
  clearLocalLogs(): void {
    localStorage.removeItem('line_logs')
  }
}

// 創建全局日誌實例
export const lineLogger = new LineLogger()

// 導出便捷函數
export const logMessage = (message: Partial<LineMessage>, context?: Partial<LogEntry>) => 
  lineLogger.logMessage(message, context)

export const logAIAction = (messageId: string | number, action: Partial<AIAction>, context?: Partial<LogEntry>) => 
  lineLogger.logAIAction(messageId, action, context)

export const logError = (error: Error | string, context?: Partial<LogEntry>) => 
  lineLogger.logError(error, context)

export const logUserAction = (action: string, details?: any, context?: Partial<LogEntry>) => 
  lineLogger.logUserAction(action, details, context)

export const logAPIRequest = (method: string, url: string, status?: number, responseTime?: number, context?: Partial<LogEntry>) => 
  lineLogger.logAPIRequest(method, url, status, responseTime, context)
