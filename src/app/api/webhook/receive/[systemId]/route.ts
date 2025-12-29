import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

/**
 * Webhook 接收 API
 * 外部系統可以推送數據回九九瓦斯行系統
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { systemId: string } }
) {
  try {
    const { systemId } = params

    // 獲取外部系統配置
    const system = await db.externalSystem.findUnique({
      where: { id: systemId },
    })

    if (!system) {
      return NextResponse.json(
        { error: 'System not found' },
        { status: 404 }
      )
    }

    if (!system.isActive) {
      return NextResponse.json(
        { error: 'System is inactive' },
        { status: 400 }
      )
    }

    // 獲取請求內容
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const signature = request.headers.get('x-signature')

    // 驗證簽名
    if (system.apiSecret && signature) {
      const payloadString = JSON.stringify(body)
      const expectedSignature = crypto
        .createHmac('sha256', system.apiSecret)
        .update(payloadString)
        .digest('hex')

      if (signature !== expectedSignature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    }

    // 處理不同類型的事件
    const { event, data } = body

    switch (event) {
      case 'payment.confirm':
        // 付款確認
        await handlePaymentConfirm(data)
        break

      case 'customer.sync':
        // 客戶同步
        await handleCustomerSync(data)
        break

      case 'inventory.update':
        // 庫存更新
        await handleInventoryUpdate(data)
        break

      default:
        console.log(`[Webhook Receive] Unknown event: ${event}`)
    }

    // 記錄接收到的 webhook
    await db.webhookLog.create({
      data: {
        systemId,
        eventType: `receive.${event}`,
        recordId: data.id || 'unknown',
        status: 'success',
        payload: body,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    )
  }
}

// 處理付款確認
async function handlePaymentConfirm(data: any) {
  const { orderId, amount, paymentDate, paymentMethod } = data

  await db.gasOrder.update({
    where: { orderNo: orderId },
    data: {
      paidAmount: { increment: amount },
      status: 'completed',
    },
  })
}

// 處理客戶同步
async function handleCustomerSync(data: any) {
  const { externalId, name, phone, address } = data

  await db.customer.upsert({
    where: { phone },
    create: {
      name,
      phone,
      address,
      paymentType: 'cash',
    },
    update: {
      name,
      address,
    },
  })
}

// 處理庫存更新
async function handleInventoryUpdate(data: any) {
  const { productId, quantity } = data

  await db.inventory.update({
    where: { productId },
    data: { quantity },
  })
}
