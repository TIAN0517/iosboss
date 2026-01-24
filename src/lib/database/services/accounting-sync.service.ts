/**
 * 會計同步服務
 * 負責將業務數據同步到會計系統
 */

import { db } from '@/lib/db';
import { Result, ok, err } from '../types';
import { getWebhookSyncService } from './webhook-sync.service';

// ========================================
// 類型定義
// ========================================

export interface AccountingEntry {
  id: string;
  date: Date;
  type: 'income' | 'expense' | 'receivable' | 'payable';
  category: string;
  amount: number;
  description: string;
  referenceNo?: string;
  customerId?: string;
  metadata?: Record<string, any>;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

// ========================================
// 會計同步服務
// ========================================

export class AccountingSyncService {
  private webhookService = getWebhookSyncService();

  /**
   * 同步訂單到會計系統
   */
  async syncOrder(orderId: string): Promise<Result<AccountingSync>> {
    try {
      const order = await db.gasOrder.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      if (!order) {
        return err(new Error('Order not found'));
      }

      // 創建會計分錄
      const entry: AccountingEntry = {
        id: order.id,
        date: order.orderDate,
        type: order.customer.paymentType === 'cash' ? 'income' : 'receivable',
        category: 'sales',
        amount: order.total,
        description: `瓦斯訂單 ${order.orderNo}`,
        referenceNo: order.orderNo,
        customerId: order.customerId,
        metadata: {
          customerId: order.customerId,
          customerName: order.customer.name,
          items: order.items.map(i => ({
            product: i.product.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })),
        },
      };

      // 記錄同步狀態
      const syncRecord = await db.accountingSync.create({
        data: {
          syncType: 'order',
          recordId: order.id,
          status: 'pending',
        },
      });

      // 發送到會計系統
      const webhookResult = await this.webhookService.triggerWebhook(
        'accounting.order',
        'GasOrder',
        order.id,
        entry
      );

      // 檢查是否至少有一個系統同步成功
      const hasSuccess = webhookResult.data?.some((r: any) => r.success);

      // 更新同步狀態
      await db.accountingSync.update({
        where: { id: syncRecord.id },
        data: {
          status: hasSuccess ? 'completed' : 'failed',
          errorMessage: hasSuccess
            ? null
            : webhookResult.data?.map((r: any) => r.error).join('; '),
        },
      });

      if (hasSuccess) {
        return ok(syncRecord);
      } else {
        return err(new Error('Failed to sync to all accounting systems'));
      }
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 同步付款到會計系統
   */
  async syncPayment(paymentData: {
    customerId: string;
    amount: number;
    method: string;
    date: Date;
  }): Promise<Result<AccountingSync>> {
    try {
      const customer = await db.customer.findUnique({
        where: { id: paymentData.customerId },
      });

      if (!customer) {
        return err(new Error('Customer not found'));
      }

      // 創建會計分錄
      const entry: AccountingEntry = {
        id: `payment_${Date.now()}`,
        date: paymentData.date,
        type: 'income',
        category: 'payment',
        amount: paymentData.amount,
        description: `客戶付款 - ${customer.name}`,
        customerId: customer.id,
        metadata: {
          customerName: customer.name,
          paymentMethod: paymentData.method,
        },
      };

      // 記錄同步狀態
      const syncRecord = await db.accountingSync.create({
        data: {
          syncType: 'payment',
          recordId: entry.id,
          status: 'pending',
        },
      });

      // 發送到會計系統
      const webhookResult = await this.webhookService.triggerWebhook(
        'accounting.payment',
        'Payment',
        entry.id,
        entry
      );

      const hasSuccess = webhookResult.data?.some((r: any) => r.success);

      await db.accountingSync.update({
        where: { id: syncRecord.id },
        data: {
          status: hasSuccess ? 'completed' : 'failed',
          errorMessage: hasSuccess
            ? null
            : webhookResult.data?.map((r: any) => r.error).join('; '),
        },
      });

      if (hasSuccess) {
        return ok(syncRecord);
      } else {
        return err(new Error('Failed to sync payment'));
      }
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 同步成本記錄到會計系統
   */
  async syncCost(costId: string): Promise<Result<AccountingSync>> {
    try {
      const cost = await db.costRecord.findUnique({
        where: { id: costId },
        include: { items: true },
      });

      if (!cost) {
        return err(new Error('Cost record not found'));
      }

      // 創建會計分錄
      const entry: AccountingEntry = {
        id: cost.id,
        date: cost.date,
        type: 'expense',
        category: cost.category,
        amount: cost.amount,
        description: cost.description,
        metadata: {
          type: cost.type,
          items: cost.items.map(i => ({
            item: i.item,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal,
          })),
        },
      };

      // 記錄同步狀態
      const syncRecord = await db.accountingSync.create({
        data: {
          syncType: 'cost',
          recordId: cost.id,
          status: 'pending',
        },
      });

      // 發送到會計系統
      const webhookResult = await this.webhookService.triggerWebhook(
        'accounting.cost',
        'CostRecord',
        cost.id,
        entry
      );

      const hasSuccess = webhookResult.data?.some((r: any) => r.success);

      await db.accountingSync.update({
        where: { id: syncRecord.id },
        data: {
          status: hasSuccess ? 'completed' : 'failed',
          errorMessage: hasSuccess
            ? null
            : webhookResult.data?.map((r: any) => r.error).join('; '),
        },
      });

      if (hasSuccess) {
        return ok(syncRecord);
      } else {
        return err(new Error('Failed to sync cost'));
      }
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 批次同步待處理的記錄
   */
  async syncPendingRecords(limit: number = 50): Promise<Result<SyncResult>> {
    try {
      // 獲取所有待處理的同步記錄
      const pendingSyncs = await db.accountingSync.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      let synced = 0;
      let failed = 0;
      const errors: Array<{ id: string; error: string }> = [];

      for (const sync of pendingSyncs) {
        try {
          let result: Result<any>;

          switch (sync.syncType) {
            case 'order':
              result = await this.syncOrder(sync.recordId);
              break;
            case 'cost':
              result = await this.syncCost(sync.recordId);
              break;
            default:
              result = err(new Error(`Unknown sync type: ${sync.syncType}`));
          }

          if (result.ok) {
            synced++;
          } else {
            failed++;
            errors.push({
              id: sync.id,
              error: result.error.message,
            });
          }
        } catch (error) {
          failed++;
          errors.push({
            id: sync.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return ok({
        synced,
        failed,
        errors,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 獲取同步狀態
   */
  async getSyncStatus(filters: {
    syncType?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Result<any[]>> {
    try {
      const records = await db.accountingSync.findMany({
        where: {
          ...(filters.syncType && { syncType: filters.syncType }),
          ...(filters.status && { status: filters.status }),
          ...(filters.startDate && {
            syncDate: { gte: filters.startDate },
          }),
          ...(filters.endDate && {
            syncDate: { lte: filters.endDate },
          }),
        },
        orderBy: { syncDate: 'desc' },
      });

      return ok(records);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 重新同步失敗的記錄
   */
  async retryFailedSyncs(limit: number = 20): Promise<Result<SyncResult>> {
    try {
      const failedSyncs = await db.accountingSync.findMany({
        where: { status: 'failed' },
        orderBy: { syncDate: 'desc' },
        take: limit,
      });

      // 先更新為 pending
      await db.accountingSync.updateMany({
        where: {
          id: { in: failedSyncs.map(s => s.id) },
        },
        data: { status: 'pending' },
      });

      // 再執行同步
      return await this.syncPendingRecords(limit);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// ========================================
// 單例模式
// ========================================

let serviceInstance: AccountingSyncService | null = null;

export function getAccountingSyncService(): AccountingSyncService {
  if (!serviceInstance) {
    serviceInstance = new AccountingSyncService();
  }
  return serviceInstance;
}
