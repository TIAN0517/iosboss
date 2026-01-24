'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/inventory - 獲取所有庫存記錄
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lowStock = searchParams.get('lowStock')

    const inventories = await db.inventory.findMany({
      include: {
        product: {
          include: {
            category: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // 如果需要過濾低庫存
    let result = inventories
    if (lowStock === 'true') {
      result = inventories.filter(inv => inv.quantity <= inv.minStock)
    }

    return NextResponse.json(result)
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

// PUT /api/inventory - 更新庫存數量
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

    // 獲取當前庫存
    const current = await db.inventory.findUnique({
      where: { productId }
    })

    if (!current) {
      return NextResponse.json(
        { error: '找不到該產品的庫存記錄' },
        { status: 404 }
      )
    }

    const newQuantity = parseInt(quantity)
    const quantityBefore = current.quantity
    const quantityAfter = newQuantity

    // 更新庫存
    const inventory = await db.inventory.update({
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
    await db.inventoryTransaction.create({
      data: {
        productId,
        type: type || 'adjustment',
        quantity: newQuantity - quantityBefore,
        quantityBefore,
        quantityAfter,
        reason: reason || '手動調整'
      }
    })

    return NextResponse.json(inventory)
  } catch (error) {
    console.error('更新庫存失敗:', error)
    return NextResponse.json(
      { error: '更新庫存失敗' },
      { status: 500 }
    )
  }
}
