'use client'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * 數據庫管理 API - 單筆記錄操作（更新、刪除）
 */

// 更新記錄
export async function PUT(
  request: NextRequest,
  { params }: { params: { table: string; id: string } }
) {
  try {
    const { table, id } = params
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

    const record = await model.update({
      where: { id },
      data,
    })

    return NextResponse.json({
      success: true,
      record,
    })
  } catch (error) {
    console.error('更新記錄失敗:', error)
    return NextResponse.json(
      { error: '更新失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// 刪除記錄
export async function DELETE(
  request: NextRequest,
  { params }: { params: { table: string; id: string } }
) {
  try {
    const { table, id } = params

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

    await model.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '刪除成功',
    })
  } catch (error) {
    console.error('刪除記錄失敗:', error)
    return NextResponse.json(
      { error: '刪除失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
