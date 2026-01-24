// ========================================
// 公司系統同步服務
// ========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 公司系統配置
const COMPANY_CONFIG = {
  apiUrl: process.env.COMPANY_API_URL || '',
  apiKey: process.env.COMPANY_API_KEY || '',
  apiSecret: process.env.COMPANY_API_SECRET || '',
  dbConnectionString: process.env.COMPANY_DB_CONNECTION_STRING || '',
};

// 同步配置
const SYNC_CONFIG = {
  direction: process.env.SYNC_DIRECTION || 'bidirectional', // bidirectional, push, pull
  interval: parseInt(process.env.SYNC_INTERVAL || '300', 10) * 1000,
  conflictPolicy: process.env.SYNC_CONFLICT_POLICY || 'latest', // ours, theirs, latest
  maxRetries: parseInt(process.env.SYNC_MAX_RETRIES || '3', 10),
};

// 同步項目配置
const SYNC_ITEMS = {
  orders: process.env.SYNC_ORDERS_ENABLED === 'true',
  inventory: process.env.SYNC_INVENTORY_ENABLED === 'true',
  customers: process.env.SYNC_CUSTOMERS_ENABLED === 'true',
  products: process.env.SYNC_PRODUCTS_ENABLED === 'true',
};

// ========================================
// 公司 API 呼叫
// ========================================

interface CompanyAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

async function callCompanyAPI<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<CompanyAPIResponse<T>> {
  try {
    const url = `${COMPANY_CONFIG.apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': COMPANY_CONFIG.apiKey,
    };

    if (COMPANY_CONFIG.apiSecret) {
      headers['X-API-Secret'] = COMPANY_CONFIG.apiSecret;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Company API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ========================================
// 資料同步函數
// ========================================

/**
 * 同步訂單資料
 */
export async function syncOrders(): Promise<{ success: boolean; synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    if (SYNC_CONFIG.direction === 'push' || SYNC_CONFIG.direction === 'bidirectional') {
      // 推送我們的訂單到公司
      const ourOrders = await prisma.gasOrder.findMany({
        where: {
          // 只同步最近更新的
          updatedAt: {
            gte: new Date(Date.now() - SYNC_CONFIG.interval),
          },
        },
        include: {
          items: true,
          customer: true,
        },
      });

      for (const order of ourOrders) {
        const result = await callCompanyAPI('/orders/sync', 'POST', {
          orderNo: order.orderNo,
          customer: order.customer,
          items: order.items,
          totalAmount: order.totalAmount,
          status: order.status,
          deliveryAddress: order.deliveryAddress,
          deliveryDate: order.deliveryDate,
          notes: order.notes,
        });

        if (result.success) {
          synced++;
        } else {
          errors.push(`訂單 ${order.orderNo}: ${result.error}`);
        }
      }
    }

    if (SYNC_CONFIG.direction === 'pull' || SYNC_CONFIG.direction === 'bidirectional') {
      // 從公司拉取訂單
      const result = await callCompanyAPI('/orders');

      if (result.success && result.data) {
        for (const order of result.data) {
          // 檢查訂單是否已存在
          const existing = await prisma.gasOrder.findUnique({
            where: { orderNo: order.orderNo },
          });

          if (existing) {
            // 更新現有訂單
            await prisma.gasOrder.update({
              where: { orderNo: order.orderNo },
              data: {
                status: order.status,
                totalAmount: order.totalAmount,
                notes: order.notes,
              },
            });
          } else {
            // 創建新訂單
            await prisma.gasOrder.create({
              data: {
                orderNo: order.orderNo,
                customerId: order.customerId,
                totalAmount: order.totalAmount,
                status: order.status,
                deliveryAddress: order.deliveryAddress,
                deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null,
                notes: order.notes,
                items: {
                  create: order.items || [],
                },
              },
            });
          }
          synced++;
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return { success: errors.length === 0, synced, errors };
}

/**
 * 同步庫存資料
 */
export async function syncInventory(): Promise<{ success: boolean; synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    if (SYNC_CONFIG.direction === 'push' || SYNC_CONFIG.direction === 'bidirectional') {
      // 推送庫存到公司
      const inventory = await prisma.inventory.findMany();

      const result = await callCompanyAPI('/inventory/sync', 'POST', {
        inventory: inventory.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          minStock: item.minStock,
          location: item.location,
        })),
      });

      if (result.success) {
        synced = inventory.length;
      } else {
        errors.push(result.error || '庫存同步失敗');
      }
    }

    if (SYNC_CONFIG.direction === 'pull' || SYNC_CONFIG.direction === 'bidirectional') {
      // 從公司拉取庫存
      const result = await callCompanyAPI('/inventory');

      if (result.success && result.data) {
        for (const item of result.data) {
          await prisma.inventory.upsert({
            where: { productId: item.productId },
            update: {
              quantity: item.quantity,
              minStock: item.minStock,
            },
            create: {
              productId: item.productId,
              quantity: item.quantity,
              minStock: item.minStock,
            },
          });
          synced++;
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return { success: errors.length === 0, synced, errors };
}

/**
 * 同步客戶資料
 */
export async function syncCustomers(): Promise<{ success: boolean; synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    if (SYNC_CONFIG.direction === 'push' || SYNC_CONFIG.direction === 'bidirectional') {
      // 推送客戶到公司
      const customers = await prisma.customer.findMany({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - SYNC_CONFIG.interval),
          },
        },
      });

      for (const customer of customers) {
        const result = await callCompanyAPI('/customers/sync', 'POST', {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          paymentType: customer.paymentType,
          monthlyBalance: customer.monthlyBalance,
        });

        if (result.success) {
          synced++;
        } else {
          errors.push(`客戶 ${customer.name}: ${result.error}`);
        }
      }
    }

    if (SYNC_CONFIG.direction === 'pull' || SYNC_CONFIG.direction === 'bidirectional') {
      // 從公司拉取客戶
      const result = await callCompanyAPI('/customers');

      if (result.success && result.data) {
        for (const customer of result.data) {
          await prisma.customer.upsert({
            where: { id: customer.id },
            update: {
              name: customer.name,
              phone: customer.phone,
              address: customer.address,
              paymentType: customer.paymentType,
              monthlyBalance: customer.monthlyBalance,
            },
            create: {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              address: customer.address,
              paymentType: customer.paymentType,
              monthlyBalance: customer.monthlyBalance || 0,
            },
          });
          synced++;
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return { success: errors.length === 0, synced, errors };
}

// ========================================
// 主同步函數
// ========================================

export interface SyncResult {
  success: boolean;
  timestamp: Date;
  results: {
    orders?: { success: boolean; synced: number; errors: string[] };
    inventory?: { success: boolean; synced: number; errors: string[] };
    customers?: { success: boolean; synced: number; errors: string[] };
  };
  totalSynced: number;
  totalErrors: string[];
}

export async function performSync(): Promise<SyncResult> {
  const results: SyncResult['results'] = {};
  let totalSynced = 0;
  const totalErrors: string[] = [];

  // 同步訂單
  if (SYNC_ITEMS.orders) {
    results.orders = await syncOrders();
    totalSynced += results.orders.synced;
    totalErrors.push(...results.orders.errors);
  }

  // 同步庫存
  if (SYNC_ITEMS.inventory) {
    results.inventory = await syncInventory();
    totalSynced += results.inventory.synced;
    totalErrors.push(...results.inventory.errors);
  }

  // 同步客戶
  if (SYNC_ITEMS.customers) {
    results.customers = await syncCustomers();
    totalSynced += results.customers.synced;
    totalErrors.push(...results.customers.errors);
  }

  return {
    success: totalErrors.length === 0,
    timestamp: new Date(),
    results,
    totalSynced,
    totalErrors,
  };
}

// ========================================
// 定時同步器
// ========================================

let syncInterval: NodeJS.Timeout | null = null;

export function startSyncScheduler(): void {
  if (syncInterval) {
    stopSyncScheduler();
  }

  // 立即執行一次
  performSync().then(result => {
    console.log('Initial sync completed:', result);
  });

  // 定時執行
  syncInterval = setInterval(async () => {
    const result = await performSync();
    console.log('Scheduled sync completed:', result);

    // 記錄同步日誌
    await prisma.auditLog.create({
      data: {
        action: 'SYNC',
        entity: 'COMPANY_SYSTEM',
        userId: 'SYSTEM',
        details: JSON.stringify(result),
        status: result.success ? 'SUCCESS' : 'FAILED',
      },
    });
  }, SYNC_CONFIG.interval);
}

export function stopSyncScheduler(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// ========================================
// API 路由處理器
// ========================================

export async function GET() {
  return Response.json({
    configured: !!COMPANY_CONFIG.apiUrl,
    config: SYNC_CONFIG,
    items: SYNC_ITEMS,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const action = body.action;

  if (action === 'sync') {
    const result = await performSync();
    return Response.json(result);
  }

  if (action === 'start') {
    startSyncScheduler();
    return Response.json({ success: true, message: 'Sync scheduler started' });
  }

  if (action === 'stop') {
    stopSyncScheduler();
    return Response.json({ success: true, message: 'Sync scheduler stopped' });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
