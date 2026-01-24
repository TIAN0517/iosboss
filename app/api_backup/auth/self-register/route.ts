import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import { ApiValidator, RequestSanitizer } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * 員工自行申請帳號 API 路由
 * 公開接口，無需認證
 * 註冊後帳號預設為未啟用狀態，需管理員審核啟用
 */
export async function POST(request: NextRequest) {
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('SELF_REGISTER_EMPLOYEE')

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    // 輸入驗證
    const validation = ApiValidator.validateRegisterRequest(body)
    if (validation.hasErrors()) {
      logger.warn(LogCategory.AUTH, 'Self-registration validation failed', {
        ...logContext.get(),
        errors: validation.getErrors(),
      })
      return NextResponse.json(
        { error: validation.getFirstError() || '輸入格式錯誤' },
        { status: 400 }
      )
    }

    // 清洗輸入
    const sanitized = RequestSanitizer.sanitizeRegisterRequest(body)
    const { username, password, email, name, role, phone, department } = sanitized

    // 檢查用戶名是否已存在
    const existingUser = await db.user.findUnique({
      where: { username },
    })

    if (existingUser) {
      logger.warn(LogCategory.AUTH, 'Self-registration failed - username exists', {
        ...logContext.get(),
        targetUsername: username,
      })
      return NextResponse.json(
        { error: '用戶名已被使用' },
        { status: 400 }
      )
    }

    // 檢查信箱是否已存在
    const existingEmail = await db.user.findUnique({
      where: { email },
    })

    if (existingEmail) {
      logger.warn(LogCategory.AUTH, 'Self-registration failed - email exists', {
        ...logContext.get(),
        targetEmail: email,
      })
      return NextResponse.json(
        { error: '信箱已被使用' },
        { status: 400 }
      )
    }

    // 限制角色：員工自行申請只能選擇 staff 或 driver
    const allowedRoles = ['staff', 'driver']
    const finalRole = allowedRoles.includes(role) ? role : 'staff'

    // 雜湊密碼
    const hashedPassword = await hashPassword(password)

    // 創建用戶（預設未啟用，需管理員審核）
    const newUser = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        name,
        role: finalRole,
        phone,
        department,
        isActive: false, // 預設未啟用，需管理員審核
      },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    })

    // 記錄審計日誌
    await db.auditLog.create({
      data: {
        id: logger.generateRequestId(),
        userId: null, // 自行註冊，無 userId
        username: username,
        action: 'self_register',
        entityType: 'User',
        entityId: newUser.id,
        newValues: newUser,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    logger.info(LogCategory.AUTH, 'Employee self-registered successfully', {
      ...logContext.get(),
      newUserId: newUser.id,
      newUsername: newUser.username,
      newRole: newUser.role,
    })

    return NextResponse.json({
      success: true,
      message: '帳號申請成功！請等待管理員審核啟用。',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: newUser.isActive,
      },
    })
  } catch (error: any) {
    logger.fatal(LogCategory.AUTH, 'Employee self-registration error', error, logContext.get())
    return NextResponse.json(
      { error: '註冊失敗，請稍後再試' },
      { status: 500 }
    )
  }
}
