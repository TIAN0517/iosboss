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

// 獲取所有促銷活動
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  try {
    const promotions = await db.promotion.findMany({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json(promotions)
  } catch (error) {
    console.error('Error fetching promotions:', error)
    return NextResponse.json(
      { error: '獲取促銷活動失敗' },
      { status: 500 }
    )
  }
}

// 新增促銷活動
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 staff 可以新增促銷活動
  if (!['admin', 'staff'].includes(user.role)) {
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
    const validation = ApiValidator.validateCreatePromotionRequest(body)
    if (validation.hasErrors()) {
      return NextResponse.json(
        { error: validation.getFirstError() },
        { status: 400 }
      )
    }

    const promotion = await db.promotion.create({
      data: {
        name: body.name,
        type: body.type,
        discountValue: body.discountValue ? parseFloat(body.discountValue) : 0,
        minAmount: body.minAmount ? parseFloat(body.minAmount) : null,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        description: body.description || '',
      },
    })

    return NextResponse.json(promotion, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating promotion:', error)
    return NextResponse.json(
      { error: '新增促銷活動失敗' },
      { status: 500 }
    )
  }
}
