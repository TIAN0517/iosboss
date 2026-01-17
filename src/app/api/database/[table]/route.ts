'use client'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * 數據庫管理 API - 通用數據表 CRUD 操作
 */

// 獲取表格數據
export async function GET(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const { table } = params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const skip = (page - 1) * pageSize

    // 定義支持的表格及其模型
    const tableMap: Record<string, any> = {
      users: db.user,
      customers: db.customer,
      products: db.product,
      orders: db.gasOrder,
      checks: db.check,
      inventory: db.inventory,
      meterReadings: db.meterReading,
      callRecords: db.callRecord,
      scheduleSheets: db.scheduleSheet,
      costRecords: db.costRecord,
    }

    const model = tableMap[table]
    if (!model) {
      return NextResponse.json(
        { error: '不支持的表格' },
        { status: 400 }
      )
    }

    // 獲取總數
    const total = await model.count()

    // 獲取數據
    const records = await model.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      records,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('獲取表格數據失敗:', error)
    return NextResponse.json(
      { error: '獲取數據失敗' },
      { status: 500 }
    )
  }
}

// 新增記錄
export async function POST(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const { table } = params
    const data = await request.json()

    const tableMap: Record<string, any> = {
      users: db.user,
      customers: db.customer,
      products: db.product,
      orders: db.gasOrder,
      checks: db.check,
      inventory: db.inventory,
      meterReadings: db.meterReading,
      callRecords: db.callRecord,
      scheduleSheets: db.scheduleSheet,
      costRecords: db.costRecord,
    }

    const model = tableMap[table]
    if (!model) {
      return NextResponse.json(
        { error: '不支持的表格' },
        { status: 400 }
      )
    }

    const record = await model.create({
      data,
    })

    return NextResponse.json({
      success: true,
      record,
    })
  } catch (error) {
    console.error('新增記錄失敗:', error)
    return NextResponse.json(
      { error: '新增失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
