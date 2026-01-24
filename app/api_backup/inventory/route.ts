import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, extractToken } from '@/lib/auth'

// 認證檢查輔助函數
function requireAuth(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

// 獲取所有庫存
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    const inventory = await db.inventory.findMany({
      where: {
        ...(productId && { productId }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            price: true,
            cost: true,
            capacity: true,
            unit: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: '獲取庫存列表失敗' },
      { status: 500 }
    )
  }
}

// 更新庫存（進貨、出貨、調整等）
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 和 staff 可以更新庫存
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

    // 驗證必填字段
    const { productId, type, quantity, reason } = body

    if (!productId || type === undefined || quantity === undefined) {
      return NextResponse.json(
        { error: '缺少必填字段：productId, type, quantity' },
        { status: 400 }
      )
    }

    // 驗證數量
    if (typeof quantity !== 'number' || quantity === 0) {
      return NextResponse.json(
        { error: '數量必須是非零數字' },
        { status: 400 }
      )
    }

    // 驗證操作類型
    const validTypes = ['purchase', 'delivery', 'return', 'adjust', 'damaged']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `操作類型必須是以下之一：${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // 使用事務更新庫存
    const result = await db.$transaction(async (tx) => {
      // 獲取當前庫存
      const currentInventory = await tx.inventory.findUnique({
        where: { productId },
        include: { product: true },
      })

      if (!currentInventory) {
        throw new Error('產品庫存不存在')
      }

      const quantityBefore = currentInventory.quantity
      const quantityAfter = quantityBefore + quantity

      // 檢查是否會導致負庫存（除了 adjust 類型）
      if (type !== 'adjust' && quantityAfter < 0) {
        throw new Error(`庫存不足：當前庫存 ${quantityBefore}，無法${type === 'delivery' ? '出貨' : '操作'} ${Math.abs(quantity)}`)
      }

      // 更新庫存
      const updatedInventory = await tx.inventory.update({
        where: { productId },
        data: {
          quantity: quantityAfter,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              price: true,
              cost: true,
              capacity: true,
              unit: true,
              isActive: true,
            },
          },
        },
      })

      // 記錄庫存變動
      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId,
          type,
          quantity,
          quantityBefore,
          quantityAfter,
          reason: reason || `${type === 'purchase' ? '進貨' : type === 'delivery' ? '出貨' : type === 'return' ? '退貨' : type === 'adjust' ? '盤點調整' : '損壞報廢'}`,
        },
      })

      return {
        ...updatedInventory,
        transaction,
      }
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('Error updating inventory:', error)
    
    // 如果是業務邏輯錯誤，返回 400
    if (error.message && (
      error.message.includes('庫存不足') ||
      error.message.includes('產品庫存不存在')
    )) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '更新庫存失敗' },
      { status: 500 }
    )
  }
}
