'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/database - 獲取數據庫狀態
export async function GET(request: NextRequest) {
  try {
    const [
      userCount,
      customerCount,
      productCount,
      orderCount,
      inventoryCount,
      checkCount
    ] = await Promise.all([
      db.user.count(),
      db.customer.count(),
      db.product.count(),
      db.gasOrder.count(),
      db.inventory.count(),
      db.check.count()
    ])

    const data = {
      status: 'healthy',
      stats: {
        users: userCount,
        customers: customerCount,
        products: productCount,
        orders: orderCount,
        inventory: inventoryCount,
        checks: checkCount
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: '數據庫連接失敗'
    }, { status: 500 })
  }
}

// POST /api/database/backup - 備份數據庫
export async function POST(request: NextRequest) {
  try {
    // 獲取所有數據
    const [users, customers, products, orders, inventories, checks] = await Promise.all([
      db.user.findMany(),
      db.customer.findMany(),
      db.product.findMany({ include: { category: true } }),
      db.gasOrder.findMany({ include: { items: true, customer: true } }),
      db.inventory.findMany(),
      db.check.findMany()
    ])

    const backup = {
      timestamp: new Date().toISOString(),
      data: {
        users,
        customers,
        products,
        orders,
        inventories,
        checks
      }
    }

    // 這裡可以添加保存到文件的邏輯
    // 目前返回 JSON 格式的備份

    return NextResponse.json({
      success: true,
      backup,
      message: '數據庫備份成功'
    })
  } catch (error) {
    console.error('備份失敗:', error)
    return NextResponse.json(
      { error: '備份失敗' },
      { status: 500 }
    )
  }
}

// PUT /api/database/seed - 重新種子數據庫
export async function PUT(request: NextRequest) {
  try {
    const { execSync } = require('child_process')

    // 運行 prisma seed
    execSync('npx prisma db seed', {
      cwd: process.cwd(),
      stdio: 'inherit'
    })

    return NextResponse.json({
      success: true,
      message: '數據庫重新種子成功'
    })
  } catch (error) {
    console.error('種子失敗:', error)
    return NextResponse.json(
      { error: '種子失敗' },
      { status: 500 }
    )
  }
}

// DELETE /api/database/reset - 重置數據庫
export async function DELETE(request: NextRequest) {
  try {
    const { execSync } = require('child_process')

    // 警告：這會刪除所有數據
    execSync('npx prisma db push --force-reset', {
      cwd: process.cwd(),
      stdio: 'inherit'
    })

    // 重新種子
    execSync('npx prisma db seed', {
      cwd: process.cwd(),
      stdio: 'inherit'
    })

    return NextResponse.json({
      success: true,
      message: '數據庫重置成功'
    })
  } catch (error) {
    console.error('重置失敗:', error)
    return NextResponse.json(
      { error: '重置失敗' },
      { status: 500 }
    )
  }
}
