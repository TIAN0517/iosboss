import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import { ValidationError } from '@/lib/validation'
import { verifyToken, extractToken } from '@/lib/auth'

// 認證檢查輔助函數
function requireAuth(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

// 獲取所有支票 - 生產級別
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：admin 和 accountant 可以查看支票
  if (!['admin', 'accountant'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('GET_CHECKS')

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')

    const checks = await db.check.findMany({
      where: {
        ...(status && { status }),
        ...(customerId && { customerId }),
      },
      include: {
        customer: true,
        order: true,
      },
      orderBy: { checkDate: 'desc' },
    })

    logger.debug(LogCategory.API, 'Fetched checks', {
      ...logContext.get(),
      count: checks.length,
      status,
      customerId,
    })

    return NextResponse.json(checks)
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to fetch checks', error, logContext.get())
    return NextResponse.json(
      { error: '獲取支票列表失敗' },
      { status: 500 }
    )
  }
}

/**
 * 新增支票 - 生產級別
 * 包含輸入驗證、支票號碼唯一性檢查、日誌記錄、事務保護
 */
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 accountant 可以新增支票
  if (!['admin', 'accountant'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('CREATE_CHECK')

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      logger.warn(LogCategory.API, 'Invalid JSON in create check request', logContext.get())
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    const { customerId, orderId, checkNo, bankName, checkDate, amount, note } = body

    // 驗證必要欄位
    if (!checkNo || !bankName || !checkDate || !amount) {
      logger.warn(LogCategory.API, 'Create check missing required fields', {
        ...logContext.get(),
        hasCheckNo: !!checkNo,
        hasBankName: !!bankName,
        hasCheckDate: !!checkDate,
        hasAmount: !!amount,
      })
      return NextResponse.json(
        { error: '請填寫必要欄位' },
        { status: 400 }
      )
    }

    // 驗證金額格式
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      logger.warn(LogCategory.API, 'Invalid check amount', {
        ...logContext.get(),
        amount,
      })
      return NextResponse.json(
        { error: '支票金額必須大於 0' },
        { status: 400 }
      )
    }

    // 驗證日期格式
    const parsedDate = new Date(checkDate)
    if (isNaN(parsedDate.getTime())) {
      logger.warn(LogCategory.API, 'Invalid check date', {
        ...logContext.get(),
        checkDate,
      })
      return NextResponse.json(
        { error: '支票日期格式錯誤' },
        { status: 400 }
      )
    }

    logContext.setResource(checkNo) // 使用支票號碼作為資源標識

    logger.info(LogCategory.BUSINESS, 'Creating check', {
      ...logContext.get(),
      checkNo,
      bankName,
      amount: numAmount,
      checkDate,
      customerId,
      orderId,
    })

    // 使用事務保護檢查唯一性並創建
    const check = await db.$transaction(async (tx) => {
      // 檢查支票號碼是否已存在
      const existingCheck = await tx.check.findUnique({
        where: { checkNo },
      })

      if (existingCheck) {
        logger.warn(LogCategory.BUSINESS, 'Check number already exists', {
          ...logContext.get(),
          existingCheckId: existingCheck.id,
        })
        throw new ValidationError('checkNo', '此支票號碼已被使用')
      }

      const newCheck = await tx.check.create({
        data: {
          customerId,
          orderId,
          checkNo,
          bankName,
          checkDate: parsedDate,
          amount: numAmount,
          note: note ? String(note).substring(0, 200) : null,
        },
      })

      logger.info(LogCategory.BUSINESS, 'Check created successfully', {
        ...logContext.get(),
        checkId: newCheck.id,
        checkNo: newCheck.checkNo,
        amount: newCheck.amount,
      })

      return newCheck
    })

    return NextResponse.json(check, { status: 201 })
  } catch (error: any) {
    // 驗證錯誤
    if (error instanceof ValidationError) {
      logger.warn(LogCategory.API, 'Create check validation error', {
        ...logContext.get(),
        field: error.field,
      })
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // 記錄未預期的錯誤
    logger.error(LogCategory.API, 'Failed to create check', error, logContext.get())
    return NextResponse.json(
      { error: '新增支票失敗，請稍後再試' },
      { status: 500 }
    )
  }
}
