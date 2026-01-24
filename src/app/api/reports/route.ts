'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/reports - 獲取統計報表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)

    let data: any = {}

    switch (type) {
      case 'overview':
        // 總覽報表
        const [
          totalCustomers,
          totalOrders,
          totalRevenue,
          totalProducts,
          lowStockCount
        ] = await Promise.all([
          db.customer.count(),
          db.gasOrder.count({ where: dateFilter }),
          db.gasOrder.aggregate({
            where: dateFilter,
            _sum: { totalAmount: true }
          }),
          db.product.count(),
          db.inventory.count({ where: { quantity: { lte: db.inventory.fields.minStock } } })
        ])

        data = {
          totalCustomers,
          totalOrders,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalProducts,
          lowStockCount
        }
        break

      case 'sales':
        // 銷售報表
        const orders = await db.gasOrder.findMany({
          where: dateFilter,
          include: {
            customer: true
          },
          orderBy: { createdAt: 'desc' }
        })

        const salesByCustomer = await db.gasOrder.groupBy({
          by: ['customerId'],
          where: dateFilter,
          _sum: { totalAmount: true },
          _count: { id: true }
        })

        data = {
          orders,
          salesByCustomer
        }
        break

      case 'inventory':
        // 庫存報表
        const inventories = await db.inventory.findMany({
          include: {
            product: {
              include: {
                category: true
              }
            }
          },
          orderBy: { quantity: 'asc' }
        })

        const lowStock = inventories.filter(inv => inv.quantity <= inv.minStock)
        const outOfStock = inventories.filter(inv => inv.quantity === 0)

        data = {
          inventories,
          lowStock,
          outOfStock,
          totalProducts: inventories.length,
          totalValue: inventories.reduce((sum, inv) => {
            return sum + (inv.quantity * inv.product.cost)
          }, 0)
        }
        break

      case 'delivery':
        // 配送報表
        const deliveries = await db.deliveryRecord.findMany({
          where: dateFilter.createdAt ? { createdAt: dateFilter } : undefined,
          include: {
            order: {
              include: {
                customer: true
              }
            },
            driver: true
          },
          orderBy: { createdAt: 'desc' }
        })

        const completedDeliveries = deliveries.filter(d => d.status === 'completed')

        data = {
          deliveries,
          totalDeliveries: deliveries.length,
          completedDeliveries: completedDeliveries.length,
          completionRate: deliveries.length > 0
            ? (completedDeliveries.length / deliveries.length * 100).toFixed(2) + '%'
            : '0%'
        }
        break
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('獲取統計報表失敗:', error)
    return NextResponse.json(
      { error: '獲取統計報表失敗' },
      { status: 500 }
    )
  }
}
