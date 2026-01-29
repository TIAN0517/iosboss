'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory - 獲取所有庫存記錄（支持分頁）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lowStock = searchParams.get('lowStock')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const skip = (page - 1) * limit

    const [inventories, total] = await Promise.all([
      db.inventory.findMany({
        include: {
          product: {
            select: { id: true, name: true, category: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip
      }),
      db.inventory.count()
    ])

    // 服務器端過濾低庫存
    let result = inventories
    if (lowStock === 'true') {
      result = inventories.filter(inv => inv.quantity <= inv.minStock)
    }

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error('獲取庫存列表失敗:', error)
    return NextResponse.json(
      { error: '獲取庫存列表失敗' },
      { status: 500 }
    )
  }
}

// POST /api/inventory - 創建或更新庫存記錄
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity, minStock } = body

    if (!productId) {
      return NextResponse.json(
        { error: '產品ID為必填項' },
        { status: 400 }
      )
    }

    // 檢查是否已存在該產品的庫存記錄
    const existing = await db.inventory.findUnique({
      where: { productId }
    })

    let inventory
    if (existing) {
      // 更新現有記錄
      inventory = await db.inventory.update({
        where: { productId },
        data: {
          quantity: quantity !== undefined ? parseInt(quantity) : existing.quantity,
          minStock: minStock !== undefined ? parseInt(minStock) : existing.minStock,
        },
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      })
    } else {
      // 創建新記錄
      inventory = await db.inventory.create({
        data: {
          productId,
          quantity: quantity ? parseInt(quantity) : 0,
          minStock: minStock ? parseInt(minStock) : 10,
        },
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      })
    }

    return NextResponse.json(inventory, { status: 201 })
  } catch (error) {
    console.error('創建庫存記錄失敗:', error)
    return NextResponse.json(
      { error: '創建庫存記錄失敗' },
      { status: 500 }
    )
  }
}

// PUT /api/inventory - 更新庫存數量（使用事務確保數據一致性）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity, type, reason } = body

    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: '產品ID和數量為必填項' },
        { status: 400 }
      )
    }

    const newQuantity = parseInt(quantity)

    // 使用事務確保庫存更新和交易記錄創建同時成功或失敗
    const result = await db.$transaction(async (tx) => {
      // 獲取當前庫存（使用 tx 實例）
      const current = await tx.inventory.findUnique({
        where: { productId }
      })

      if (!current) {
        throw new Error('找不到該產品的庫存記錄')
      }

      const quantityBefore = current.quantity
      const quantityAfter = newQuantity

      // 更新庫存
      const inventory = await tx.inventory.update({
        where: { productId },
        data: { quantity: newQuantity },
        include: {
          product: {
            include: {
              category: true
            }
          }
        }
      })

      // 創建庫存交易記錄
      await tx.inventoryTransaction.create({
        data: {
          productId,
          type: type || 'adjustment',
          quantity: newQuantity - quantityBefore,
          quantityBefore,
          quantityAfter,
          reason: reason || '手動調整'
        }
      })

      return inventory
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('更新庫存失敗:', error)
    if (error.message === '找不到該產品的庫存記錄') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: '更新庫存失敗' },
      { status: 500 }
    )
  }
}
