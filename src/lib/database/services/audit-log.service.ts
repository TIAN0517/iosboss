/**
 * 審計日誌服務
 * 企業級審計追蹤系統 - 記錄所有關鍵操作
 */

import { db } from '@/lib/db';
import { Result, ok, err } from '../types';

// ========================================
// 類型定義
// ========================================

export interface AuditLogEntry {
  userId?: string;
  username?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditSummary {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByEntity: Record<string, number>;
  topUsers: Array<{ userId: string; username: string; count: number }>;
}

// ========================================
// 審計日誌服務
// ========================================

export class AuditLogService {
  /**
   * 記錄審計日誌
   */
  async log(entry: AuditLogEntry): Promise<Result<any>> {
    try {
      const log = await db.auditLog.create({
        data: {
          userId: entry.userId,
          username: entry.username,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata,
          timestamp: new Date(),
        },
      });

      return ok(log);
    } catch (error) {
      console.error('[AuditLog] Failed to create log:', error);
      // 不拋出錯誤，避免影響主業務流程
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 批次記錄審計日誌
   */
  async logBatch(entries: AuditLogEntry[]): Promise<Result<number>> {
    try {
      const result = await db.auditLog.createMany({
        data: entries.map(entry => ({
          userId: entry.userId,
          username: entry.username,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          metadata: entry.metadata,
          timestamp: new Date(),
        })),
      });

      return ok(result.count);
    } catch (error) {
      console.error('[AuditLog] Failed to create batch logs:', error);
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 查詢審計日誌
   */
  async query(filters: AuditLogFilters): Promise<Result<any[]>> {
    try {
      const {
        userId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        limit = 100,
        offset = 0,
      } = filters;

      const logs = await db.auditLog.findMany({
        where: {
          ...(userId && { userId }),
          ...(action && { action }),
          ...(entityType && { entityType }),
          ...(entityId && { entityId }),
          ...(startDate && { timestamp: { gte: startDate } }),
          ...(endDate && { timestamp: { lte: endDate } }),
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      return ok(logs);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 獲取實體歷史記錄
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<Result<any[]>> {
    try {
      const logs = await db.auditLog.findMany({
        where: {
          entityType,
          entityId,
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return ok(logs);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 獲取用戶活動記錄
   */
  async getUserActivity(
    userId: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<Result<any[]>> {
    try {
      const logs = await db.auditLog.findMany({
        where: {
          userId,
          ...(startDate && { timestamp: { gte: startDate } }),
          ...(endDate && { timestamp: { lte: endDate } }),
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return ok(logs);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 獲取審計摘要統計
   */
  async getSummary(
    startDate: Date,
    endDate: Date
  ): Promise<Result<AuditSummary>> {
    try {
      const logs = await db.auditLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // 統計操作類型
      const actionsByType: Record<string, number> = {};
      logs.forEach(log => {
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      });

      // 統計實體類型
      const actionsByEntity: Record<string, number> = {};
      logs.forEach(log => {
        actionsByEntity[log.entityType] = (actionsByEntity[log.entityType] || 0) + 1;
      });

      // 統計活躍用戶
      const userCounts: Record<string, { username: string; count: number }> = {};
      logs.forEach(log => {
        if (log.userId) {
          if (!userCounts[log.userId]) {
            userCounts[log.userId] = {
              username: log.username || 'Unknown',
              count: 0,
            };
          }
          userCounts[log.userId].count++;
        }
      });

      const topUsers = Object.entries(userCounts)
        .map(([userId, data]) => ({
          userId,
          username: data.username,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return ok({
        totalActions: logs.length,
        actionsByType,
        actionsByEntity,
        topUsers,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 清理舊的審計日誌
   */
  async cleanup(beforeDate: Date, batchSize: number = 1000): Promise<Result<number>> {
    try {
      let deletedCount = 0;

      while (true) {
        const result = await db.auditLog.deleteMany({
          where: {
            timestamp: { lt: beforeDate },
          },
          take: batchSize,
        });

        deletedCount += result.count;

        if (result.count < batchSize) {
          break;
        }

        // 避免阻塞太久
        await this.sleep(100);
      }

      return ok(deletedCount);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 導出審計日誌
   */
  async export(filters: AuditLogFilters, format: 'json' | 'csv' = 'json'): Promise<Result<string>> {
    try {
      const { limit = 10000 } = filters;
      const logs = await this.query({ ...filters, limit });

      if (!logs.ok) {
        return err(logs.error);
      }

      if (format === 'json') {
        return ok(JSON.stringify(logs.data, null, 2));
      } else {
        // CSV 格式
        const headers = [
          'timestamp',
          'userId',
          'username',
          'action',
          'entityType',
          'entityId',
          'oldValues',
          'newValues',
          'ipAddress',
        ];

        const csvRows = [
          headers.join(','),
          ...logs.data.map((log: any) =>
            headers
              .map(h => {
                const value = log[h];
                if (typeof value === 'object' && value !== null) {
                  return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                }
                return `"${value || ''}"`;
              })
              .join(',')
          ),
        ];

        return ok(csvRows.join('\n'));
      }
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ========================================
// 輔助函數 - 創建常見的審計日誌
// ========================================

export const AuditActions = {
  // 用戶操作
  USER_LOGIN: 'login',
  USER_LOGOUT: 'logout',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  // 客戶操作
  CUSTOMER_CREATE: 'customer.create',
  CUSTOMER_UPDATE: 'customer.update',
  CUSTOMER_DELETE: 'customer.delete',
  BALANCE_UPDATE: 'customer.balance_update',

  // 訂單操作
  ORDER_CREATE: 'order.create',
  ORDER_UPDATE: 'order.update',
  ORDER_DELETE: 'order.delete',
  ORDER_STATUS_CHANGE: 'order.status_change',

  // 產品操作
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  INVENTORY_UPDATE: 'inventory.update',

  // 財務操作
  PAYMENT_CREATE: 'payment.create',
  CHECK_CREATE: 'check.create',
  CHECK_UPDATE: 'check.update',

  // 系統操作
  SYSTEM_CONFIG_UPDATE: 'system.config_update',
  SYSTEM_EXPORT: 'system.export',
  SYSTEM_IMPORT: 'system.import',
  SYSTEM_SYNC: 'system.sync',
};

// ========================================
// 單例模式
// ========================================

let serviceInstance: AuditLogService | null = null;

export function getAuditLogService(): AuditLogService {
  if (!serviceInstance) {
    serviceInstance = new AuditLogService();
  }
  return serviceInstance;
}

// ========================================
// 裝飾器 - 自動記錄審計日誌
// ========================================

/**
 * 方法裝飾器 - 自動記錄審計日誌
 */
export function AuditLog(action: string, entityType: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const auditService = getAuditLogService();
      const result = await originalMethod.apply(this, args);

      // 嘗試提取實體 ID
      let entityId = 'unknown';
      if (args[0] && typeof args[0] === 'string') {
        entityId = args[0];
      } else if (args[0]?.id) {
        entityId = args[0].id;
      }

      // 獲取用戶資訊（從請求上下文）
      const userId = (this as any).userId || (this as any).user?.id;
      const username = (this as any).username || (this as any).user?.name;

      // 記錄日誌
      await auditService.log({
        userId,
        username,
        action,
        entityType,
        entityId,
        oldValues: result.oldValues,
        newValues: result.newValues,
      });

      return result;
    };

    return descriptor;
  };
}
