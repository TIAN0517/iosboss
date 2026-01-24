'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/checks/[id] - 更新支票
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, note } = body

    const check = await db.check.update({
      where: { id: params.id },
      data: {
        status: status || undefined,
        note: note !== undefined ? note : undefined,
      }
    })

    return NextResponse.json(check)
  } catch (error) {
    console.error('更新支票失敗:', error)
    return NextResponse.json(
      { error: '更新支票失敗' },
      { status: 500 }
    )
  }
}

// DELETE /api/checks/[id] - 刪除支票
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.check.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('刪除支票失敗:', error)
    return NextResponse.json(
      { error: '刪除支票失敗' },
      { status: 500 }
    )
  }
}
