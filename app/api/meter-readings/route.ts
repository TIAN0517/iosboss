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

// 獲取抄錶記錄 - 生產級別
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：所有角色都可以查看抄錶記錄
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('GET_METER_READINGS')

  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const month = searchParams.get('month') // 格式: 2025-01

    // 構建月份查詢條件
    let dateFilter = {}
    if (month) {
      const monthDate = new Date(`${month}-01`)
      const year = monthDate.getFullYear()
      const monthIndex = monthDate.getMonth()

      // 該月第一天
      const startDate = new Date(year, monthIndex, 1)
      // 該月最後一天（下月第一天減 1 毫秒）
      const endDate = new Date(year, monthIndex + 1, 1)

      dateFilter = {
        readingDate: {
          gte: startDate,
          lt: endDate,
        }
      }
    }

    const readings = await db.meterReading.findMany({
      where: {
        ...(customerId && { customerId }),
        ...dateFilter,
      },
      include: {
        customer: true,
      },
      orderBy: { readingDate: 'desc' },
    })

    logger.debug(LogCategory.API, 'Fetched meter readings', {
      ...logContext.get(),
      count: readings.length,
      customerId,
      month,
    })

    return NextResponse.json(readings)
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to fetch meter readings', error, logContext.get())
    return NextResponse.json(
      { error: '獲取抄錶記錄失敗' },
      { status: 500 }
    )
  }
}

// 新增抄錶記錄 - 生產級別
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 staff 可以新增抄錶記錄
  if (!['admin', 'staff'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('CREATE_METER_READING')

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      logger.warn(LogCategory.API, 'Invalid JSON in create meter reading request', logContext.get())
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    const {
      customerId,
      previousReading,
      currentReading,
      unitPrice,
      periodStart,
      periodEnd,
      note
    } = body

    // 驗證必要欄位
    if (!customerId || currentReading === undefined || !unitPrice) {
      logger.warn(LogCategory.API, 'Create meter reading missing required fields', {
        ...logContext.get(),
        hasCustomerId: !!customerId,
        hasCurrentReading: currentReading !== undefined,
        hasUnitPrice: !!unitPrice,
      })
      return NextResponse.json(
        { error: '請填寫必要欄位' },
        { status: 400 }
      )
    }

    // 驗證數值格式
    const current = parseFloat(currentReading)
    const price = parseFloat(unitPrice)
    const previous = previousReading ? parseFloat(previousReading) : 0

    if (isNaN(current) || isNaN(price)) {
      logger.warn(LogCategory.API, 'Invalid numeric values for meter reading', {
        ...logContext.get(),
        currentReading,
        unitPrice,
      })
      return NextResponse.json(
        { error: '讀數或單價格式錯誤' },
        { status: 400 }
      )
    }

    // 計算用量
    const usage = current - previous
    if (usage < 0) {
      logger.warn(LogCategory.API, 'Current reading less than previous reading', {
        ...logContext.get(),
        previous,
        current,
        usage,
      })
      return NextResponse.json(
        { error: '本期讀數不能小於上期讀數' },
        { status: 400 }
      )
    }

    // 計算金額
    const amount = usage * price

    logContext.setResource(customerId)

    logger.info(LogCategory.BUSINESS, 'Creating meter reading', {
      ...logContext.get(),
      customerId,
      previous,
      current,
      usage,
      amount,
    })

    // 使用事務創建抄錶記錄並更新客戶最後抄錶時間
    const reading = await db.$transaction(async (tx) => {
      // 創建抄錶記錄
      const newReading = await tx.meterReading.create({
        data: {
          customerId,
          previousReading: previous,
          currentReading: current,
          usage,
          unitPrice: price,
          amount,
          periodStart: periodStart ? new Date(periodStart) : new Date(),
          periodEnd: periodEnd ? new Date(periodEnd) : new Date(),
          note: note ? String(note).substring(0, 500) : null,
        },
      })

      // 更新客戶最後抄錶時間
      await tx.customer.update({
        where: { id: customerId },
        data: { lastMeterReadAt: new Date() },
      })

      return newReading
    })

    logger.info(LogCategory.BUSINESS, 'Meter reading created successfully', {
      ...logContext.get(),
      readingId: reading.id,
      usage,
      amount,
    })

    return NextResponse.json(reading, { status: 201 })
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to create meter reading', error, logContext.get())
    return NextResponse.json(
      { error: '新增抄錶記錄失敗' },
      { status: 500 }
    )
  }
}
