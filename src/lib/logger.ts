/**
 * 生產級別日誌系統
 * 提供結構化日誌、請求追蹤、錯誤分類等功能
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export enum LogCategory {
  AUTH = 'AUTH',           // 認證相關
  API = 'API',             // API 請求
  DATABASE = 'DATABASE',   // 資料庫操作
  BUSINESS = 'BUSINESS',   // 業務邏輯
  SECURITY = 'SECURITY',   // 安全事件
  PERFORMANCE = 'PERFORMANCE', // 性能監控
}

interface LogContext {
  requestId?: string
  userId?: string
  username?: string
  ip?: string
  userAgent?: string
  action?: string
  resource?: string
  [key: string]: any
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: LogCategory
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  duration?: number
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production'
  private isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * 生成唯一的請求 ID
   */
  generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * 格式化日誌輸出
   */
  private formatLog(entry: LogEntry): string {
    const { timestamp, level, category, message, context, error, duration } = entry

    const parts = [
      `[${timestamp}]`,
      `[${level}]`,
      `[${category}]`,
    ]

    if (context?.requestId) {
      parts.push(`[${context.requestId}]`)
    }

    parts.push(message)

    if (duration !== undefined) {
      parts.push(`(${duration}ms)`)
    }

    let log = parts.join(' ')

    if (context && Object.keys(context).length > 0) {
      const cleanContext = { ...context }
      delete cleanContext.requestId // 已經在前面顯示了
      if (Object.keys(cleanContext).length > 0) {
        log += ` | ${JSON.stringify(cleanContext)}`
      }
    }

    if (error) {
      log += `\n  Error: ${error.name}: ${error.message}`
      if (error.stack && this.isDevelopment) {
        log += `\n  Stack: ${error.stack}`
      }
    }

    return log
  }

  /**
   * 輸出日誌到控制台
   */
  private log(entry: LogEntry): void {
    const formatted = this.formatLog(entry)

    switch (entry.level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) {
          console.debug(formatted)
        }
        break
      case LogLevel.INFO:
        console.info(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted)
        break
    }
  }

  /**
   * 創建日誌條目
   */
  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      } : undefined,
    }
  }

  // ========== 公共 API ==========

  debug(category: LogCategory, message: string, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, category, message, context))
  }

  info(category: LogCategory, message: string, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.INFO, category, message, context))
  }

  warn(category: LogCategory, message: string, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.WARN, category, message, context))
  }

  error(category: LogCategory, message: string, error?: Error, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.ERROR, category, message, context, error))
  }

  fatal(category: LogCategory, message: string, error?: Error, context?: LogContext): void {
    this.log(this.createLogEntry(LogLevel.FATAL, category, message, context, error))
  }

  /**
   * 性能監控 - 記錄操作耗時
   */
  async performance<T>(
    category: LogCategory,
    action: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now()
    const requestId = context?.requestId || this.generateRequestId()

    try {
      const result = await fn()
      const duration = Date.now() - startTime

      // 如果耗時超過 1 秒，記錄為警告
      if (duration > 1000) {
        this.warn(LogCategory.PERFORMANCE, `Slow operation: ${action}`, {
          ...context,
          requestId,
          action,
          duration,
        })
      } else {
        this.debug(LogCategory.PERFORMANCE, `Operation: ${action}`, {
          ...context,
          requestId,
          action,
          duration,
        })
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.error(LogCategory.PERFORMANCE, `Failed operation: ${action}`, error as Error, {
        ...context,
        requestId,
        action,
        duration,
      })
      throw error
    }
  }
}

// 單例模式
export const logger = new Logger()

/**
 * 請求上下文助手 - 用於追蹤 API 請求
 */
export class RequestContext {
  private context: LogContext = {}

  setRequestId(id: string): void {
    this.context.requestId = id
  }

  setUserId(id: string): void {
    this.context.userId = id
  }

  setUsername(username: string): void {
    this.context.username = username
  }

  setIp(ip: string): void {
    this.context.ip = ip
  }

  setUserAgent(ua: string): void {
    this.context.userAgent = ua
  }

  setAction(action: string): void {
    this.context.action = action
  }

  setResource(resource: string): void {
    this.context.resource = resource
  }

  set(key: string, value: any): void {
    this.context[key] = value
  }

  get(): LogContext {
    return { ...this.context }
  }

  clear(): void {
    this.context = {}
  }
}
