import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { withAdminAuth } from '@/lib/permissions'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import { ApiValidator, RequestSanitizer, ValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * 員工註冊 API 路由
 * 僅限管理員創建新員工帳號
 */
export const POST = withAdminAuth(async (request: NextRequest, user) => {
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setUserId(user.userId)
  logContext.setUsername(user.username)
  logContext.setAction('REGISTER_EMPLOYEE')

  try {
    // 解析請求體
    const body = await request.json()

    // 輸入驗證
    const validation = ApiValidator.validateRegisterRequest(body)
    if (validation.hasErrors()) {
      logger.warn(LogCategory.AUTH, 'Employee registration validation failed', {
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
      logger.warn(LogCategory.AUTH, 'Registration failed - username exists', {
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
      logger.warn(LogCategory.AUTH, 'Registration failed - email exists', {
        ...logContext.get(),
        targetEmail: email,
      })
      return NextResponse.json(
        { error: '信箱已被使用' },
        { status: 400 }
      )
    }

    // 檢查角色是否有效
    const validRoles = ['admin', 'accountant', 'driver', 'staff']
    if (!validRoles.includes(role)) {
      logger.warn(LogCategory.AUTH, 'Registration failed - invalid role', {
        ...logContext.get(),
        role,
      })
      return NextResponse.json(
        { error: '無效的角色' },
        { status: 400 }
      )
    }

    // 雜湊密碼
    const hashedPassword = await hashPassword(password)

    // 創建用戶
    const newUser = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        name,
        role,
        phone,
        department,
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
        userId: user.userId,
        username: user.username,
        action: 'create',
        entityType: 'User',
        entityId: newUser.id,
        newValues: newUser,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    logger.info(LogCategory.AUTH, 'Employee registered successfully', {
      ...logContext.get(),
      newUserId: newUser.id,
      newUsername: newUser.username,
      newRole: newUser.role,
    })

    return NextResponse.json({
      success: true,
      user: newUser,
    })
  } catch (error: any) {
    logger.fatal(LogCategory.AUTH, 'Employee registration error', error, logContext.get())
    return NextResponse.json(
      { error: '註冊失敗，請稍後再試' },
      { status: 500 }
    )
  }
})
