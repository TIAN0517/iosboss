// ========================================
// 公司系統 Webhook 接收
// 用於接收公司系統的即時推送
// ========================================

import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Webhook 密鑰驗證
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.COMPANY_WEBHOOK_SECRET || '';
  if (!secret) return true; // 如果沒設置密鑰，跳過驗證

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const digest = hmac.digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * POST /api/sync/company/webhook - 接收公司系統推送
 */
export async function POST(request: NextRequest) {
  try {
    // 獲取原始請求體以驗證簽名
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature') || '';

    // 驗證 webhook 簽名
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: '簽名驗證失敗' }, { status: 401 });
    }

    const data = JSON.parse(rawBody);
    const { event, type } = data;

    console.log('收到公司系統 Webhook:', { event, type });

    let result;

    switch (type) {
      // ========================================
      // 訂單事件
      // ========================================
      case 'order.created':
      case 'order.updated':
        result = await handleOrderWebhook(data);
        break;

      // ========================================
      // 庫存事件
      // ========================================
      case 'inventory.updated':
      case 'inventory.low_stock':
        result = await handleInventoryWebhook(data);
        break;

      // ========================================
      // 客戶事件
      // ========================================
      case 'customer.created':
      case 'customer.updated':
        result = await handleCustomerWebhook(data);
        break;

      // ========================================
      // 電話訂單（即時）
      // ========================================
      case 'phone_order.received':
        result = await handlePhoneOrderWebhook(data);
        break;

      default:
        console.log('未知的 webhook 類型:', type);
        result = { success: false, message: '未知類型' };
    }

    // 記錄 webhook 日誌
    await prisma.auditLog.create({
      data: {
        action: 'WEBHOOK_RECEIVED',
        entity: type,
        userId: 'SYSTEM',
        details: JSON.stringify(data),
        status: result.success ? 'SUCCESS' : 'FAILED',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook 處理完成',
      result,
    });
  } catch (error) {
    console.error('Webhook 處理錯誤:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook 處理失敗' },
      { status: 500 }
    );
  }
}

// ========================================
// 訂單 Webhook 處理
// ========================================

async function handleOrderWebhook(data: any) {
  const { order } = data;

  try {
    // 檢查訂單是否已存在
    const existing = await prisma.gasOrder.findUnique({
      where: { orderNo: order.orderNo },
    });

    if (existing) {
      // 更新訂單
      const updated = await prisma.gasOrder.update({
        where: { orderNo: order.orderNo },
        data: {
          status: order.status,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null,
          notes: order.notes,
          updatedAt: new Date(),
        },
      });
      return { success: true, action: 'updated', orderNo: updated.orderNo };
    } else {
      // 創建新訂單
      const created = await prisma.gasOrder.create({
        data: {
          orderNo: order.orderNo,
          customerId: order.customerId,
          totalAmount: order.totalAmount,
          status: order.status || 'pending',
          deliveryAddress: order.deliveryAddress,
          deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null,
          notes: order.notes,
          items: {
            create: order.items || [],
          },
        },
      });
      return { success: true, action: 'created', orderNo: created.orderNo };
    }
  } catch (error) {
    console.error('訂單處理錯誤:', error);
    return { success: false, error: error instanceof Error ? error.message : '訂單處理失敗' };
  }
}

// ========================================
// 庫存 Webhook 處理
// ========================================

async function handleInventoryWebhook(data: any) {
  const { inventory } = data;

  try {
    for (const item of inventory) {
      await prisma.inventory.upsert({
        where: { productId: item.productId },
        update: {
          quantity: item.quantity,
          minStock: item.minStock,
          location: item.location,
          updatedAt: new Date(),
        },
        create: {
          productId: item.productId,
          quantity: item.quantity,
          minStock: item.minStock,
          location: item.location,
        },
      });
    }

    return { success: true, count: inventory.length };
  } catch (error) {
    console.error('庫存處理錯誤:', error);
    return { success: false, error: error instanceof Error ? error.message : '庫存處理失敗' };
  }
}

// ========================================
// 客戶 Webhook 處理
// ========================================

async function handleCustomerWebhook(data: any) {
  const { customer } = data;

  try {
    const result = await prisma.customer.upsert({
      where: { id: customer.id },
      update: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        paymentType: customer.paymentType,
        monthlyBalance: customer.monthlyBalance || 0,
        updatedAt: new Date(),
      },
      create: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        paymentType: customer.paymentType || 'cash',
        monthlyBalance: customer.monthlyBalance || 0,
      },
    });

    return { success: true, action: result.createdAt ? 'created' : 'updated', customerId: result.id };
  } catch (error) {
    console.error('客戶處理錯誤:', error);
    return { success: false, error: error instanceof Error ? error.message : '客戶處理失敗' };
  }
}

// ========================================
// 電話訂單 Webhook 處理（即時）
// ========================================

async function handlePhoneOrderWebhook(data: any) {
  const { phoneOrder } = data;

  try {
    // 電話訂單需要立即處理
    const order = await prisma.gasOrder.create({
      data: {
        orderNo: phoneOrder.orderNo || `PHONE-${Date.now()}`,
        customerId: phoneOrder.customerId,
        totalAmount: phoneOrder.totalAmount,
        status: 'pending',
        deliveryAddress: phoneOrder.deliveryAddress,
        deliveryDate: phoneOrder.deliveryDate ? new Date(phoneOrder.deliveryDate) : null,
        notes: phoneOrder.notes || '電話訂單',
        items: {
          create: phoneOrder.items || [],
        },
      },
    });

    // 如果需要發送通知
    // TODO: 發送 LINE 通知給相關人員

    return {
      success: true,
      message: '電話訂單已建立',
      orderNo: order.orderNo,
    };
  } catch (error) {
    console.error('電話訂單處理錯誤:', error);
    return { success: false, error: error instanceof Error ? error.message : '電話訂單處理失敗' };
  }
}
