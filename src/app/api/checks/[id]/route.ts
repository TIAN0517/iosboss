import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 更新支票狀態
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, note } = body

    const validStatuses = ['pending', 'deposited', 'cleared', 'bounced', 'cancelled']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '無效的狀態' },
        { status: 400 }
      )
    }

    const check = await db.check.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(note !== undefined && { note }),
      },
      include: {
        customer: true,
        order: true,
      },
    })

    return NextResponse.json(check)
  } catch (error) {
    console.error('Error updating check:', error)
    return NextResponse.json(
      { error: '更新支票失敗' },
      { status: 500 }
    )
  }
}

// 刪除支票
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.check.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: '支票已刪除' })
  } catch (error) {
    console.error('Error deleting check:', error)
    return NextResponse.json(
      { error: '刪除支票失敗' },
      { status: 500 }
    )
  }
}
