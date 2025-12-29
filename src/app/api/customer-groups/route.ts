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

// 獲取所有客戶分組
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  try {
    const groups = await db.customerGroup.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('Error fetching customer groups:', error)
    return NextResponse.json(
      { error: '獲取客戶分組失敗' },
      { status: 500 }
    )
  }
}

// 新增客戶分組
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 staff 可以新增客戶分組
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
    const validation = ApiValidator.validateCreateCustomerGroupRequest(body)
    if (validation.hasErrors()) {
      return NextResponse.json(
        { error: validation.getFirstError() },
        { status: 400 }
      )
    }

    const group = await db.customerGroup.create({
      data: {
        name: body.name,
        discount: body.discount ? parseFloat(body.discount) : 0,
        description: body.description || '',
      },
    })

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating customer group:', error)
    return NextResponse.json(
      { error: '新增客戶分組失敗' },
      { status: 500 }
    )
  }
}
