import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import { ValidationError } from '@/lib/validation'

// 獲取單一訂單 - 生產級別
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('GET_ORDER')
  logContext.setResource(params.id)

  try {
    const order = await db.gasOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        check: true,
      },
    })

    if (!order) {
      logger.warn(LogCategory.API, 'Order not found', logContext.get())
      return NextResponse.json(
        { error: '找不到此訂單' },
        { status: 404 }
      )
    }

    logger.debug(LogCategory.API, 'Fetched order', {
      ...logContext.get(),
      orderNo: order.orderNo,
    })

    return NextResponse.json(order)
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to fetch order', error, logContext.get())
    return NextResponse.json(
      { error: '獲取訂單資料失敗' },
      { status: 500 }
    )
  }
}

// 更新訂單狀態 - 生產級別
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('UPDATE_ORDER')
  logContext.setResource(params.id)

  try {
    const body = await request.json()
    const { status, paidAmount, note } = body

    logger.info(LogCategory.BUSINESS, 'Updating order', {
      ...logContext.get(),
      updates: { status, paidAmount, hasNote: !!note },
    })

    // 使用事務保護更新流程
    const order = await db.$transaction(async (tx) => {
      // 檢查訂單是否存在
      const existingOrder = await tx.gasOrder.findUnique({
        where: { id: params.id },
      })

      if (!existingOrder) {
        throw new ValidationError('orderId', '找不到此訂單')
      }

      // 更新訂單
      const order = await tx.gasOrder.update({
        where: { id: params.id },
        data: {
          ...(status && { status }),
          ...(paidAmount !== undefined && { paidAmount }),
          ...(note !== undefined && { note: note ? String(note).substring(0, 500) : null }),
        },
        include: {
          customer: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      logger.info(LogCategory.BUSINESS, 'Order updated successfully', {
        ...logContext.get(),
        orderNo: order.orderNo,
        previousStatus: existingOrder.status,
        newStatus: order.status,
      })

      return order
    })

    return NextResponse.json(order)
  } catch (error: any) {
    if (error instanceof ValidationError) {
      logger.warn(LogCategory.API, 'Update order validation error', {
        ...logContext.get(),
        field: error.field,
      })
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    logger.error(LogCategory.API, 'Failed to update order', error, logContext.get())
    return NextResponse.json(
      { error: '更新訂單失敗' },
      { status: 500 }
    )
  }
}

/**
 * 刪除訂單 - 生產級別
 * 使用事務保護，確保庫存還原與訂單刪除同步
 * 包含完整日誌記錄
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('DELETE_ORDER')
  logContext.setResource(params.id)

  try {
    logger.info(LogCategory.BUSINESS, 'Deleting order', logContext.get())

    // 使用事務保護整個刪除流程
    const result = await logger.performance(
      LogCategory.DATABASE,
      'deleteOrderTransaction',
      async () => {
        return await db.$transaction(async (tx) => {
          // 1️⃣ 獲取訂單資料
          const order = await tx.gasOrder.findUnique({
            where: { id: params.id },
            include: {
              items: true,
            },
          })

          if (!order) {
            throw new ValidationError('orderId', '找不到此訂單')
          }

          // 2️⃣ 一次性查詢所有相關產品和庫存
          const productIds = order.items.map(item => item.productId)
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
            include: { inventory: true },
          })

          // 3️⃣ 在同一事務內還原所有庫存
          let totalRestored = 0
          for (const item of order.items) {
            const product = products.find(p => p.id === item.productId)
            if (product?.inventory) {
              const newQuantity = product.inventory.quantity + item.quantity
              totalRestored += item.quantity

              await tx.inventory.update({
                where: { id: product.inventory.id },
                data: { quantity: newQuantity },
              })

              // 記錄庫存變動
              await tx.inventoryTransaction.create({
                data: {
                  productId: item.productId,
                  type: 'return',
                  quantity: item.quantity,
                  quantityBefore: product.inventory.quantity,
                  quantityAfter: newQuantity,
                  reason: `取消訂單 ${order.orderNo}`,
                },
              })
            }
          }

          // 4️⃣ 刪除訂單 (Prisma 會自動刪除關聯的 items)
          await tx.gasOrder.delete({
            where: { id: params.id },
          })

          logger.info(LogCategory.BUSINESS, 'Order deleted successfully', {
            ...logContext.get(),
            orderNo: order.orderNo,
            totalRestored,
            itemCount: order.items.length,
          })

          return { orderNo: order.orderNo, totalRestored }
        })
      },
      logContext.get()
    )

    return NextResponse.json({
      message: '訂單已刪除，庫存已還原',
      orderNo: result.orderNo,
      restored: result.totalRestored,
    })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      logger.warn(LogCategory.API, 'Delete order validation error', {
        ...logContext.get(),
        field: error.field,
      })
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    logger.error(LogCategory.API, 'Failed to delete order', error, logContext.get())
    return NextResponse.json(
      { error: '刪除訂單失敗' },
      { status: 500 }
    )
  }
}
