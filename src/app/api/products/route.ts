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

// 獲取所有產品
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')

    const products = await db.product.findMany({
      where: {
        ...(active && { isActive: active === 'true' }),
      },
      include: {
        inventory: true,
      },
      orderBy: { capacity: 'desc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: '獲取產品列表失敗' },
      { status: 500 }
    )
  }
}

// 新增產品
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 staff 可以新增產品
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
    const validation = ApiValidator.validateCreateProductRequest(body)
    if (validation.hasErrors()) {
      return NextResponse.json(
        { error: validation.getFirstError() },
        { status: 400 }
      )
    }

    // 使用事務創建產品和庫存
    const product = await db.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name: body.name,
          price: parseFloat(body.price),
          cost: body.cost ? parseFloat(body.cost) : 0,
          capacity: body.capacity,
          unit: body.unit || '個',
        },
      })

      // 創建庫存記錄
      await tx.inventory.create({
        data: {
          productId: newProduct.id,
          quantity: 0,
        },
      })

      return newProduct
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: '新增產品失敗' },
      { status: 500 }
    )
  }
}
