import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, extractToken } from '@/lib/auth'
import { ApiValidator, ValidationError } from '@/lib/validation'

// 認證檢查輔助函數
function requireAuth(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

// 獲取成本記錄
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：admin 和 accountant 可以查看成本
  if (!['admin', 'accountant'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (type) where.type = type
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const costs = await db.costRecord.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(costs)
  } catch (error) {
    console.error('Error fetching cost records:', error)
    return NextResponse.json(
      { error: '獲取成本記錄失敗' },
      { status: 500 }
    )
  }
}

// 新增成本記錄
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 accountant 可以新增成本
  if (!['admin', 'accountant'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
    }

    // 使用統一驗證
    const validation = ApiValidator.validateCreateCostRequest(body)
    if (validation.hasErrors()) {
      return NextResponse.json(
        { error: validation.getFirstError() },
        { status: 400 }
      )
    }

    // 使用事務創建成本記錄和明細
    const costRecord = await db.$transaction(async (tx) => {
      const cost = await tx.costRecord.create({
        data: {
          type: body.type,
          category: body.category,
          amount: parseFloat(body.amount),
          description: body.description || '',
          date: body.date ? new Date(body.date) : new Date(),
          items: body.items ? {
            create: body.items.map((item: any) => ({
              item: item.item,
              quantity: item.quantity,
              unitPrice: parseFloat(item.unitPrice),
              subtotal: parseFloat(item.unitPrice) * (item.quantity || 1),
            })),
          } : undefined,
        },
        include: {
          items: true,
        },
      })
      return cost
    })

    return NextResponse.json(costRecord, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating cost record:', error)
    return NextResponse.json(
      { error: '新增成本記錄失敗' },
      { status: 500 }
    )
  }
}
