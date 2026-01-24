import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import { verifyToken, extractToken } from '@/lib/auth'

// 認證檢查輔助函數
function requireAuth(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

// 獲取月結報表 - 生產級別
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：admin 和 accountant 可以查看月結報表
  if (!['admin', 'accountant'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('GET_MONTHLY_STATEMENTS')

  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const month = searchParams.get('month')
    const status = searchParams.get('status')

    const statements = await db.monthlyStatement.findMany({
      where: {
        ...(customerId && { customerId }),
        ...(month && { month }),
        ...(status && { status }),
      },
      include: {
        customer: true,
      },
      orderBy: { month: 'desc' },
    })

    logger.debug(LogCategory.API, 'Fetched monthly statements', {
      ...logContext.get(),
      count: statements.length,
      customerId,
      month,
      status,
    })

    return NextResponse.json(statements)
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to fetch monthly statements', error, logContext.get())
    return NextResponse.json(
      { error: '獲取月結報表失敗' },
      { status: 500 }
    )
  }
}

// 生成月結報表 - 生產級別
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 accountant 可以生成月結報表
  if (!['admin', 'accountant'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('GENERATE_MONTHLY_STATEMENT')

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      logger.warn(LogCategory.API, 'Invalid JSON in generate monthly statement request', logContext.get())
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    const { customerId, month } = body

    // 驗證必要欄位
    if (!customerId || !month) {
      logger.warn(LogCategory.API, 'Generate monthly statement missing required fields', {
        ...logContext.get(),
        hasCustomerId: !!customerId,
        hasMonth: !!month,
      })
      return NextResponse.json(
        { error: '請提供客戶ID和月份' },
        { status: 400 }
      )
    }

    // 驗證月份格式
    const monthRegex = /^\d{4}-\d{2}$/
    if (!monthRegex.test(month)) {
      logger.warn(LogCategory.API, 'Invalid month format', {
        ...logContext.get(),
        month,
      })
      return NextResponse.json(
        { error: '月份格式錯誤（應為 YYYY-MM）' },
        { status: 400 }
      )
    }

    logContext.setResource(`${customerId}-${month}`)

    logger.info(LogCategory.BUSINESS, 'Generating monthly statement', {
      ...logContext.get(),
      customerId,
      month,
    })

    // 解析月份
    const [year, monthNum] = month.split('-').map(Number)
    const periodStart = new Date(year, monthNum - 1, 1)
    const periodEnd = new Date(year, monthNum, 0, 23, 59, 59)

    // 檢查是否已存在
    const existing = await db.monthlyStatement.findFirst({
      where: {
        customerId,
        month,
      },
    })

    if (existing) {
      logger.warn(LogCategory.BUSINESS, 'Monthly statement already exists', {
        ...logContext.get(),
        existingId: existing.id,
      })
      return NextResponse.json(
        { error: '該月份的月結報表已存在' },
        { status: 400 }
      )
    }

    // 獲取該月期的訂單
    const orders = await db.gasOrder.findMany({
      where: {
        customerId,
        orderDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'completed',
      },
    })

    // 計算總額
    const totalOrders = orders.length
    const totalAmount = orders.reduce((sum, order) => sum + order.total, 0)

    // 獲取該月期的付款記錄
    const checks = await db.check.findMany({
      where: {
        customerId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: 'cleared',
      },
    })

    const paidAmount = checks.reduce((sum, check) => sum + check.amount, 0)

    // 計算餘額
    const balance = totalAmount - paidAmount

    // 創建月結報表
    const statement = await db.monthlyStatement.create({
      data: {
        customerId,
        month,
        periodStart,
        periodEnd,
        totalOrders,
        totalAmount,
        paidAmount,
        balance,
        status: balance > 0 ? 'overdue' : 'draft',
      },
    })

    logger.info(LogCategory.BUSINESS, 'Monthly statement generated successfully', {
      ...logContext.get(),
      statementId: statement.id,
      totalOrders,
      totalAmount,
      paidAmount,
      balance,
    })

    return NextResponse.json(statement, { status: 201 })
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to generate monthly statement', error, logContext.get())
    return NextResponse.json(
      { error: '生成月結報表失敗' },
      { status: 500 }
    )
  }
}

// 更新月結報表狀態 - 生產級別
export async function PATCH(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 accountant 可以更新月結報表
  if (!['admin', 'accountant'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('UPDATE_MONTHLY_STATEMENT')

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      logger.warn(LogCategory.API, 'Invalid JSON in update monthly statement request', logContext.get())
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    const { id, status, paidAmount } = body

    // 驗證必要欄位
    if (!id || !status) {
      logger.warn(LogCategory.API, 'Update monthly statement missing required fields', {
        ...logContext.get(),
        hasId: !!id,
        hasStatus: !!status,
      })
      return NextResponse.json(
        { error: '請提供報表ID和狀態' },
        { status: 400 }
      )
    }

    const validStatuses = ['draft', 'sent', 'paid', 'overdue']
    if (!validStatuses.includes(status)) {
      logger.warn(LogCategory.API, 'Invalid monthly statement status', {
        ...logContext.get(),
        status,
      })
      return NextResponse.json(
        { error: '無效的狀態' },
        { status: 400 }
      )
    }

    logContext.setResource(id)

    logger.info(LogCategory.BUSINESS, 'Updating monthly statement', {
      ...logContext.get(),
      id,
      status,
    })

    const updateData: any = { status }
    if (paidAmount !== undefined) {
      updateData.paidAmount = paidAmount
    }

    const statement = await db.monthlyStatement.update({
      where: { id },
      data: updateData,
    })

    logger.info(LogCategory.BUSINESS, 'Monthly statement updated successfully', {
      ...logContext.get(),
      statementId: statement.id,
      status: statement.status,
    })

    return NextResponse.json(statement)
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to update monthly statement', error, logContext.get())
    return NextResponse.json(
      { error: '更新月結報表失敗' },
      { status: 500 }
    )
  }
}
