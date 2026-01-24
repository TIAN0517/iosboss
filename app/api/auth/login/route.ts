import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateToken, verifyPassword } from '@/lib/auth'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import { ApiValidator, RequestSanitizer, ValidationError } from '@/lib/validation'

/**
 * 登入 API 路由 - 生產級別
 * 使用 JWT 和 bcrypt 實現安全的認證
 * 包含完整日誌記錄、輸入驗證、時序攻擊防護
 */
export async function POST(request: Request) {
  // 創建請求上下文
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)

  // 獲取客戶端資訊
  const headers = request.headers
  const userAgent = headers.get('user-agent') || 'Unknown'
  const forwardedFor = headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() ||
             headers.get('x-real-ip') ||
             'Unknown'

  logContext.setIp(ip)
  logContext.setUserAgent(userAgent)
  logContext.setAction('LOGIN')

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      logger.warn(LogCategory.AUTH, 'Invalid JSON in login request', logContext.get())
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    // 輸入驗證
    const validation = ApiValidator.validateLoginRequest(body)
    if (validation.hasErrors()) {
      logger.warn(LogCategory.AUTH, 'Login validation failed', {
        ...logContext.get(),
        errors: validation.getErrors(),
      })
      return NextResponse.json(
        { error: validation.getFirstError() || '輸入格式錯誤' },
        { status: 400 }
      )
    }

    // 清洗輸入
    const sanitized = RequestSanitizer.sanitizeLoginRequest(body)
    const { username, password } = sanitized

    logContext.setUsername(username)

    // 記錄登入嘗試
    logger.info(LogCategory.AUTH, 'Login attempt', logContext.get())

    // 防止暴力攻擊 - 延遲回應（無論成功失敗）
    const startTime = Date.now()

    // 查找用戶
    const user = await db.user.findUnique({
      where: { username },
    })

    if (!user) {
      // 延遲回應以防止時序攻擊
      const elapsed = Date.now() - startTime
      const delayTime = Math.max(0, 500 - elapsed)
      await new Promise(resolve => setTimeout(resolve, delayTime))

      // 記錄失敗的登入嘗試
      logger.warn(LogCategory.SECURITY, 'Login failed - user not found', {
        ...logContext.get(),
        reason: 'user_not_found',
      })

      return NextResponse.json(
        { error: '帳號或密碼錯誤' },
        { status: 401 }
      )
    }

    // 驗證密碼（使用 bcrypt）
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      // 延遲回應以防止時序攻擊
      const elapsed = Date.now() - startTime
      const delayTime = Math.max(0, 500 - elapsed)
      await new Promise(resolve => setTimeout(resolve, delayTime))

      // 記錄失敗的登入嘗試
      logger.warn(LogCategory.SECURITY, 'Login failed - invalid password', {
        ...logContext.get(),
        userId: user.id,
        reason: 'invalid_password',
      })

      return NextResponse.json(
        { error: '帳號或密碼錯誤' },
        { status: 401 }
      )
    }

    // 檢查用戶是否啟用
    if (!user.isActive) {
      logger.warn(LogCategory.SECURITY, 'Login failed - account inactive', {
        ...logContext.get(),
        userId: user.id,
        role: user.role,
        reason: 'account_inactive',
      })
      return NextResponse.json(
        { error: '帳號已停用，請聯繫管理員' },
        { status: 403 }
      )
    }

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    // 記錄成功登入
    const duration = Date.now() - startTime
    logger.info(LogCategory.AUTH, 'Login successful', {
      ...logContext.get(),
      userId: user.id,
      username: user.username,
      role: user.role,
      duration,
    })

    // 設置 HttpOnly、Secure、SameSite cookie（安全）
    // 使用 SameSite=lax 適用於同站點請求（大多數情況）
    const isProduction = process.env.NODE_ENV === 'production'
    // 只在 HTTPS 環境下使用 Secure cookie
    const isHttps = request.headers.get('x-forwarded-proto') === 'https' ||
                    request.url.startsWith('https://')
    const useSecureCookie = isProduction && isHttps

    // 創建回應並設置 Cookie，同時在 body 中返回 token（讓前端能保存到 localStorage）
    const response = NextResponse.json({
      success: true,
      token: token, // 在 body 中返回 token
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    })

    // 設置 HttpOnly cookie（主要方案，由 middleware 使用）
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: useSecureCookie, // 只在 HTTPS 生產環境使用
      sameSite: 'lax', // 使用 lax 適用於同站點請求
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    })

    // 暴露 X-Auth-Token header（讓前端能讀取）
    response.headers.set('Access-Control-Expose-Headers', 'X-Auth-Token')
    response.headers.set('X-Auth-Token', token)

    return response
  } catch (error: any) {
    // 記錄未預期的錯誤
    logger.fatal(LogCategory.AUTH, 'Login error - unexpected', error, logContext.get())

    return NextResponse.json(
      { error: '登入失敗，請稍後再試' },
      { status: 500 }
    )
  }
}
