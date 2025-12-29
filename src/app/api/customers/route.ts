import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import { ApiValidator, ValidationError, RequestSanitizer } from '@/lib/validation'
import { verifyToken, extractToken } from '@/lib/auth'

// 認證檢查輔助函數
function requireAuth(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

// 獲取所有客戶 - 生產級別
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：admin 和 staff 可以查看客戶
  if (!['admin', 'staff'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('GET_CUSTOMERS')

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const groupId = searchParams.get('groupId')

    const customers = await db.customer.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { address: { contains: search } },
          ],
        }),
        ...(groupId && { groupId }),
      },
      include: {
        group: true,
        orders: {
          orderBy: { orderDate: 'desc' },
          take: 1,
        },
        _count: {
          select: { orders: true, checks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    logger.debug(LogCategory.API, 'Fetched customers', {
      ...logContext.get(),
      count: customers.length,
      search,
      groupId,
    })

    return NextResponse.json(customers)
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to fetch customers', error, logContext.get())
    return NextResponse.json(
      { error: '獲取客戶列表失敗' },
      { status: 500 }
    )
  }
}

/**
 * 新增客戶 - 生產級別
 * 包含輸入驗證、電話號碼唯一性檢查、日誌記錄
 */
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 staff 可以新增客戶
  if (!['admin', 'staff'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('CREATE_CUSTOMER')

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      logger.warn(LogCategory.API, 'Invalid JSON in create customer request', logContext.get())
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    // 輸入驗證
    const validation = ApiValidator.validateCreateCustomerRequest(body)
    if (validation.hasErrors()) {
      logger.warn(LogCategory.API, 'Create customer validation failed', {
        ...logContext.get(),
        errors: validation.getErrors(),
      })
      return NextResponse.json(
        { error: validation.getFirstError() || '輸入格式錯誤' },
        { status: 400 }
      )
    }

    // 清洗輸入
    const sanitized = RequestSanitizer.sanitizeCustomerRequest(body)
    const { name, phone, address, groupId, note } = sanitized

    logContext.setResource(phone) // 使用電話作為資源標識

    logger.info(LogCategory.BUSINESS, 'Creating customer', {
      ...logContext.get(),
      name,
      phone,
      groupId,
    })

    // 檢查電話號碼是否已存在（使用事務保護）
    const customer = await db.$transaction(async (tx) => {
      const existingCustomer = await tx.customer.findUnique({
        where: { phone },
      })

      if (existingCustomer) {
        logger.warn(LogCategory.BUSINESS, 'Phone number already exists', {
          ...logContext.get(),
          existingCustomerId: existingCustomer.id,
        })
        throw new ValidationError('phone', '此電話號碼已被使用')
      }

      const newCustomer = await tx.customer.create({
        data: {
          name,
          phone,
          address,
          groupId,
          note,
        },
      })

      logger.info(LogCategory.BUSINESS, 'Customer created successfully', {
        ...logContext.get(),
        customerId: newCustomer.id,
        name: newCustomer.name,
      })

      return newCustomer
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error: any) {
    // 驗證錯誤
    if (error instanceof ValidationError) {
      logger.warn(LogCategory.API, 'Create customer validation error', {
        ...logContext.get(),
        field: error.field,
      })
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // 記錄未預期的錯誤
    logger.error(LogCategory.API, 'Failed to create customer', error, logContext.get())
    return NextResponse.json(
      { error: '新增客戶失敗，請稍後再試' },
      { status: 500 }
    )
  }
}
