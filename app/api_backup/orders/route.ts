import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logger, RequestContext, LogCategory } from '@/lib/logger'
import { ApiValidator, ValidationError } from '@/lib/validation'
import { calculateDeliveryFee, calculateDiscount, generateOrderNo } from '@/lib/order-utils'

// 獲取所有訂單 - 生產級別
export async function GET(request: NextRequest) {
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('GET_ORDERS')

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')

    const orders = await db.gasOrder.findMany({
      where: {
        ...(status && { status }),
        ...(customerId && { customerId }),
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        check: true,
      },
      orderBy: { orderDate: 'desc' },
    })

    logger.debug(LogCategory.API, 'Fetched orders', {
      ...logContext.get(),
      count: orders.length,
      status,
      customerId,
    })

    return NextResponse.json(orders)
  } catch (error: any) {
    logger.error(LogCategory.API, 'Failed to fetch orders', error, logContext.get())
    return NextResponse.json(
      { error: '獲取訂單列表失敗' },
      { status: 500 }
    )
  }
}

/**
 * 新增訂單 - 生產級別
 * 使用事務保護，避免數據不一致
 * 包含完整日誌記錄、輸入驗證
 */
export async function POST(request: NextRequest) {
  const requestId = logger.generateRequestId()
  const logContext = new RequestContext()
  logContext.setRequestId(requestId)
  logContext.setAction('CREATE_ORDER')

  try {
    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch (parseError) {
      logger.warn(LogCategory.API, 'Invalid JSON in create order request', logContext.get())
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }

    // 輸入驗證
    const validation = ApiValidator.validateCreateOrderRequest(body)
    if (validation.hasErrors()) {
      logger.warn(LogCategory.API, 'Create order validation failed', {
        ...logContext.get(),
        errors: validation.getErrors(),
      })
      return NextResponse.json(
        { error: validation.getFirstError() || '輸入格式錯誤' },
        { status: 400 }
      )
    }

    const { customerId, items, deliveryDate, note, checkId } = body

    // 生成訂單編號（使用工具函數）
    const orderNo = generateOrderNo()

    logContext.setResource(orderNo)

    logger.info(LogCategory.BUSINESS, 'Creating order', {
      ...logContext.get(),
      customerId,
      itemCount: items.length,
      deliveryDate,
    })

    // 使用事務保護整個訂單創建流程
    const order = await logger.performance(
      LogCategory.DATABASE,
      'createOrderTransaction',
      async () => {
        return await db.$transaction(async (tx) => {
          // 1️⃣ 一次性查詢所有產品和庫存 (優化：從3次查詢改為1次)
          const productIds = items.map((item: any) => item.productId)
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
            include: { inventory: true },
          })

          if (products.length !== productIds.length) {
            const missingIds = productIds.filter((id: string) =>
              !products.find(p => p.id === id)
            )
            logger.warn(LogCategory.BUSINESS, 'Products not found', {
              ...logContext.get(),
              missingIds,
            })
            throw new ValidationError('products', '部分產品不存在')
          }

          // 2️⃣ 檢查庫存是否足夠 (防止負數庫存)
          const inventoryIssues: Array<{ product: string; available: number; requested: number }> = []

          for (const item of items) {
            const product = products.find(p => p.id === item.productId)
            if (!product?.inventory) {
              logger.warn(LogCategory.BUSINESS, 'Product has no inventory record', {
                ...logContext.get(),
                productId: item.productId,
                productName: product?.name,
              })
              throw new ValidationError('inventory', `產品 ${product?.name} 沒有庫存記錄`)
            }
            if (product.inventory.quantity < item.quantity) {
              inventoryIssues.push({
                product: product.name,
                available: product.inventory.quantity,
                requested: item.quantity,
              })
            }
          }

          if (inventoryIssues.length > 0) {
            const errorMessages = inventoryIssues.map(i =>
              `${i.product} 庫存不足 (現有: ${i.available}, 需要: ${i.requested})`
            )
            logger.warn(LogCategory.BUSINESS, 'Insufficient inventory', {
              ...logContext.get(),
              issues: inventoryIssues,
            })
            throw new ValidationError('inventory', errorMessages.join('; '))
          }

          // 3️⃣ 計算訂單金額
          let subtotal = 0
          const orderItemsData = items.map((item: any) => {
            const product = products.find(p => p.id === item.productId)!
            const itemSubtotal = product.price * item.quantity
            subtotal += itemSubtotal
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: product.price,
              subtotal: itemSubtotal,
            }
          })

          // 4️⃣ 獲取客戶分組折扣
          const customer = await tx.customer.findUnique({
            where: { id: customerId },
            include: { group: true },
          })

          if (!customer) {
            logger.warn(LogCategory.BUSINESS, 'Customer not found', {
              ...logContext.get(),
              customerId,
            })
            throw new ValidationError('customerId', '找不到客戶')
          }

          let discount = 0
          let discountRate = 0
          if (customer?.group) {
            discountRate = customer.group.discount
            discount = calculateDiscount(subtotal, discountRate)
          }

          // 5️⃣ 計算配送費（使用工具函數）
          const deliveryFee = calculateDeliveryFee(subtotal)

          const total = subtotal - discount + deliveryFee

          // 6️⃣ 創建訂單 (直接包含正確的明細金額)
          const order = await tx.gasOrder.create({
            data: {
              customerId,
              orderNo,
              deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
              subtotal,
              discount,
              deliveryFee,
              total,
              note: note ? String(note).substring(0, 500) : null, // 限制備註長度
              checkId,
              items: {
                create: orderItemsData,
              },
            },
          })

          // 7️⃣ 在同一事務內扣除庫存並記錄變動
          for (const item of items) {
            const product = products.find(p => p.id === item.productId)!
            const inventory = product.inventory!
            const newQuantity = inventory.quantity - item.quantity

            await tx.inventory.update({
              where: { id: inventory.id },
              data: { quantity: newQuantity },
            })

            // 記錄庫存變動
            await tx.inventoryTransaction.create({
              data: {
                productId: item.productId,
                type: 'delivery',
                quantity: -item.quantity,
                quantityBefore: inventory.quantity,
                quantityAfter: newQuantity,
                reason: `訂單 ${orderNo}`,
              },
            })
          }

          // 8️⃣ 更新客戶最後訂單時間
          await tx.customer.update({
            where: { id: customerId },
            data: { lastOrderAt: new Date() },
          })

          logger.info(LogCategory.BUSINESS, 'Order created successfully', {
            ...logContext.get(),
            orderId: order.id,
            orderNo,
            subtotal,
            discount,
            discountRate,
            deliveryFee,
            total,
            itemCount: items.length,
          })

          return order
        })
      },
      logContext.get()
    )

    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    // 驗證錯誤
    if (error instanceof ValidationError) {
      logger.warn(LogCategory.API, 'Create order validation error', {
        ...logContext.get(),
        field: error.field,
        message: error.message,
      })
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // 記錄未預期的錯誤
    logger.error(LogCategory.API, 'Failed to create order', error, logContext.get())

    // 根據錯誤類型返回適當的錯誤訊息
    if (error.message?.includes('庫存不足')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (error.message?.includes('產品') || error.message?.includes('客戶')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '新增訂單失敗，請稍後再試' },
      { status: 500 }
    )
  }
}
