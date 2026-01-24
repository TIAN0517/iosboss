import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// 獲取單一客戶
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await db.customer.findUnique({
      where: { id: params.id },
      include: {
        orders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
        },
        checks: {
          orderBy: { checkDate: 'desc' },
          take: 10,
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: '找不到此客戶' },
        { status: 404 }
      )
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: '獲取客戶資料失敗' },
      { status: 500 }
    )
  }
}

// 更新客戶
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, phone, address, groupId, note } = body

    if (!name || !phone || !address) {
      return NextResponse.json(
        { error: '請填寫必要欄位' },
        { status: 400 }
      )
    }

    // 檢查電話號碼是否已被其他客戶使用
    const existingCustomer = await db.customer.findFirst({
      where: {
        phone,
        NOT: { id: params.id },
      },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: '此電話號碼已被其他客戶使用' },
        { status: 400 }
      )
    }

    const customer = await db.customer.update({
      where: { id: params.id },
      data: {
        name,
        phone,
        address,
        groupId,
        note,
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: '更新客戶資料失敗' },
      { status: 500 }
    )
  }
}

// 刪除客戶
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 檢查客戶是否有訂單或支票記錄
    const customer = await db.customer.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { orders: true, checks: true },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: '找不到此客戶' },
        { status: 404 }
      )
    }

    if (customer._count.orders > 0 || customer._count.checks > 0) {
      return NextResponse.json(
        { error: '此客戶有相關訂單或支票記錄，無法刪除' },
        { status: 400 }
      )
    }

    await db.customer.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: '客戶已刪除' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: '刪除客戶失敗' },
      { status: 500 }
    )
  }
}
