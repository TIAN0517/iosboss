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

// 獲取來電記錄 - 生產級別
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：所有角色都可以查看來電記錄
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('GET_CALL_RECORDS')

  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const phoneNumber = searchParams.get('phoneNumber')
    const limit = parseInt(searchParams.get('limit') || '50')

    const calls = await db.callRecord.findMany({
      where: {
        ...(customerId && { customerId }),
        ...(phoneNumber && { phoneNumber }),
      },
      include: {
        customer: true,
      },
      orderBy: { callTime: 'desc' },
      take: Math.min(limit, 500), // 限制最大 500 筆
    })

    logger.debug(LogCategory.API, 'Fetched call records', {
      ...logContext.get(),
      count: calls.length,
      customerId,
      phoneNumber,
    })

    return NextResponse.json(calls)
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to fetch call records', error, logContext.get())
    return NextResponse.json(
      { error: '獲取來電記錄失敗' },
      { status: 500 }
    )
  }
}

// 新增來電記錄 - 生產級別
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：所有角色都可以新增來電記錄
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('CREATE_CALL_RECORD')

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      logger.warn(LogCategory.API, 'Invalid JSON in create call record request', logContext.get())
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    const {
      customerId,
      phoneNumber,
      duration,
      status,
      notes
    } = body

    // 驗證必要欄位
    if (!phoneNumber || !status) {
      logger.warn(LogCategory.API, 'Create call record missing required fields', {
        ...logContext.get(),
        hasPhoneNumber: !!phoneNumber,
        hasStatus: !!status,
      })
      return NextResponse.json(
        { error: '請填寫必要欄位' },
        { status: 400 }
      )
    }

    // 驗證狀態值
    const validStatuses = ['incoming', 'outgoing', 'missed', 'voicemail']
    if (!validStatuses.includes(status)) {
      logger.warn(LogCategory.API, 'Invalid call status', {
        ...logContext.get(),
        status,
      })
      return NextResponse.json(
        { error: '無效的來電狀態' },
        { status: 400 }
      )
    }

    logger.info(LogCategory.BUSINESS, 'Creating call record', {
      ...logContext.get(),
      phoneNumber,
      status,
      customerId,
    })

    // 嘗試根據電話號碼查找客戶
    let matchedCustomerId = customerId
    if (!matchedCustomerId) {
      const customer = await db.customer.findFirst({
        where: { phone: phoneNumber },
      })
      if (customer) {
        matchedCustomerId = customer.id
      }
    }

    // 創建來電記錄
    const call = await db.callRecord.create({
      data: {
        customerId: matchedCustomerId,
        phoneNumber,
        duration: duration || 0,
        status,
        notes: notes ? String(notes).substring(0, 500) : null,
      },
    })

    logger.info(LogCategory.BUSINESS, 'Call record created successfully', {
      ...logContext.get(),
      callId: call.id,
      phoneNumber,
      status,
    })

    return NextResponse.json(call, { status: 201 })
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to create call record', error, logContext.get())
    return NextResponse.json(
      { error: '新增來電記錄失敗' },
      { status: 500 }
    )
  }
}
