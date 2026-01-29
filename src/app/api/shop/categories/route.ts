'use client'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/shop/categories - 獲取分類列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')

    const where: any = {}
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const categories = await db.productCategory.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    // 格式化返回
    const formatted = categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.name.toLowerCase().replace(/\s+/g, '-'),
      icon: c.name.charAt(0), // 使用名稱第一個字作為圖標
      description: c.description,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
      productCount: c._count.products,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST /api/shop/categories - 創建分類
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, sortOrder, isActive } = body

    if (!name) {
      return NextResponse.json({ error: '分類名稱為必填' }, { status: 400 })
    }

    const category = await db.productCategory.create({
      data: {
        name,
        description,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Failed to create category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

// PUT /api/shop/categories - 更新分類
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: '分類ID為必填' }, { status: 400 })
    }

    const category = await db.productCategory.update({
      where: { id },
      data,
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Failed to update category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

// DELETE /api/shop/categories?id=xxx - 刪除分類
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '分類ID為必填' }, { status: 400 })
    }

    // 檢查是否有產品關聯
    const productCount = await db.product.count({
      where: { categoryId: id },
    })

    if (productCount > 0) {
      return NextResponse.json(
        { error: '該分類下有產品，無法刪除' },
        { status: 400 }
      )
    }

    await db.productCategory.delete({
      where: { id },
    })

    return NextResponse.json({ message: '分類已刪除' })
  } catch (error) {
    console.error('Failed to delete category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
