'use client'

import { useState, useEffect } from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/shop/products - 獲取商城產品列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const featured = searchParams.get('featured')
    const isActive = searchParams.get('isActive')

    const where: any = {}

    if (categoryId) {
      where.categoryId = categoryId
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (featured === 'true') {
      where.isFeatured = true
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const orderBy: any = {}
    orderBy[sortBy] = sortOrder

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        inventory: true,
      },
      orderBy,
    })

    // 格式化為商城所需格式
    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || p.capacity || null,
      price: p.price,
      cost: p.cost,
      imageUrl: p.imageUrl,
      stock: p.inventory?.quantity || 0,
      categoryId: p.categoryId,
      featured: p.isFeatured,
      rating: p.rating,
      sales: p.sales,
      category: p.category,
      capacity: p.capacity,
      unit: p.unit,
      isActive: p.isActive,
    }))

    return NextResponse.json(formattedProducts)
  } catch (error) {
    console.error('Failed to fetch shop products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST /api/shop/products - 創建產品
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      categoryId,
      price,
      cost,
      capacity,
      unit,
      description,
      imageUrl,
      isFeatured,
      sortOrder,
    } = body

    if (!name || !categoryId || price === undefined) {
      return NextResponse.json(
        { error: '名稱、分類和價格為必填' },
        { status: 400 }
      )
    }

    // 生成產品編號
    const count = await db.product.count({
      where: { categoryId },
    })
    const code = `${Date.now().toString(36).toUpperCase()}${String(count + 1).padStart(4, '0')}`

    const product = await db.product.create({
      data: {
        name,
        code,
        categoryId,
        price: parseFloat(price),
        cost: parseFloat(cost || 0),
        capacity,
        unit: unit || '個',
        description,
        imageUrl,
        isFeatured: isFeatured || false,
        sortOrder: sortOrder || 0,
      },
      include: {
        category: true,
        inventory: true,
      },
    })

    // 創建庫存記錄
    await db.inventory.create({
      data: {
        productId: product.id,
        quantity: 0,
        minStock: 10,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Failed to create product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

// PUT /api/shop/products - 更新產品
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: '產品ID為必填' }, { status: 400 })
    }

    const product = await db.product.update({
      where: { id },
      data: {
        ...data,
        price: data.price ? parseFloat(data.price) : undefined,
        cost: data.cost ? parseFloat(data.cost) : undefined,
      },
      include: {
        category: true,
        inventory: true,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

// DELETE /api/shop/products?id=xxx - 刪除產品
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: '產品ID為必填' }, { status: 400 })
    }

    await db.product.delete({
      where: { id },
    })

    return NextResponse.json({ message: '產品已刪除' })
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
