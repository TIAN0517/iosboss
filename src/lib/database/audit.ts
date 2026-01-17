/**
 * Audit Logger
 * 審計日誌系統 - 追蹤所有关键操作
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient } from '@prisma/client';
import { Result, ok, err, AuditLog, AuditAction } from './types';
import { db } from '@/lib/db';

// ==================== 審計日誌器 ====================

export class AuditLogger {
  private prisma: PrismaClient;
  private enabled: boolean = true;
  private buffer: AuditLog[] = [];
  private bufferSize: number = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(prisma?: PrismaClient, enabled: boolean = true) {
    this.prisma = prisma || db;
    this.enabled = enabled;
    this.startFlushInterval();
  }

  // ==================== 日誌記錄 ====================

  /**
   * 記錄審計日誌
   */
  async log(params: {
    userId?: string;
    username?: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<Result<void>> {
    if (!this.enabled) {
      return ok(undefined);
    }

    try {
      const log: AuditLog = {
        id: this.generateLogId(),
        userId: params.userId,
        username: params.username,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues,
        newValues: params.newValues,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        timestamp: new Date(),
        metadata: params.metadata,
      };

      // 新增到緩衝区
      this.buffer.push(log);

      // 緩衝区满了则重新整理
      if (this.buffer.length >= this.bufferSize) {
        await this.flush();
      }

      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 記錄創建操作
   */
  async logCreate(params: {
    userId?: string;
    username?: string;
    entityType: string;
    entityId: string;
    newValues: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Result<void>> {
    return this.log({
      ...params,
      action: 'create',
    });
  }

  /**
   * 記錄更新操作
   */
  async logUpdate(params: {
    userId?: string;
    username?: string;
    entityType: string;
    entityId: string;
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Result<void>> {
    return this.log({
      ...params,
      action: 'update',
    });
  }

  /**
   * 記錄刪除操作
   */
  async logDelete(params: {
    userId?: string;
    username?: string;
    entityType: string;
    entityId: string;
    oldValues: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Result<void>> {
    return this.log({
      ...params,
      action: 'delete',
    });
  }

  /**
   * 記錄登入操作
   */
  async logLogin(params: {
    userId: string;
    username: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Result<void>> {
    return this.log({
      ...params,
      action: 'login',
      entityType: 'User',
      entityId: params.userId,
    });
  }

  /**
   * 記錄登出操作
   */
  async logLogout(params: {
    userId: string;
    username: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Result<void>> {
    return this.log({
      ...params,
      action: 'logout',
      entityType: 'User',
      entityId: params.userId,
    });
  }

  // ==================== 查詢操作 ====================

  /**
   * 獲取使用者審計日誌
   */
  async getUserLogs(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      actions?: AuditAction[];
    }
  ): Promise<Result<AuditLog[]>> {
    try {
      const where: any = { userId };

      if (options?.startDate || options?.endDate) {
        where.timestamp = {};
        if (options.startDate) {
          where.timestamp.gte = options.startDate;
        }
        if (options.endDate) {
          where.timestamp.lte = options.endDate;
        }
      }

      if (options?.actions && options.actions.length > 0) {
        where.action = { in: options.actions };
      }

      const logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 100,
        skip: options?.offset || 0,
      });

      return ok(logs);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 獲取实体審計日誌
   */
  async getEntityLogs(
    entityType: string,
    entityId: string,
    options?: {
      limit?: number;
    }
  }): Promise<Result<AuditLog[]>> {
    try {
      const logs = await this.prisma.auditLog.findMany({
        where: {
          entityType,
          entityId,
        },
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 50,
      });

      return ok(logs);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 獲取所有審計日誌
   */
  async getAllLogs(options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    actions?: AuditAction[];
    entityType?: string;
  }): Promise<Result<PaginatedAuditLogs>> {
    try {
      const where: any = {};

      if (options?.startDate || options?.endDate) {
        where.timestamp = {};
        if (options.startDate) {
          where.timestamp.gte = options.startDate;
        }
        if (options.endDate) {
          where.timestamp.lte = options.endDate;
        }
      }

      if (options?.actions && options.actions.length > 0) {
        where.action = { in: options.actions };
      }

      if (options?.entityType) {
        where.entityType = options.entityType;
      }

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: options?.limit || 100,
          skip: options?.offset || 0,
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return ok({
        logs,
        total,
        limit: options?.limit || 100,
        offset: options?.offset || 0,
      });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  // ==================== 緩衝区管理 ====================

  /**
   * 重新整理緩衝区到數據庫
   */
  async flush(): Promise<Result<void>> {
    if (this.buffer.length === 0) {
      return ok(undefined);
    }

    try {
      await this.prisma.auditLog.createMany({
        data: this.buffer.map(log => ({
          id: log.id,
          userId: log.userId,
          username: log.username,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          oldValues: log.oldValues as any,
          newValues: log.newValues as any,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          timestamp: log.timestamp,
          metadata: log.metadata as any,
        })),
        skipDuplicates: true,
      });

      this.buffer = [];
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 獲取緩衝区大小
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * 强制重新整理
   */
  async forceFlush(): Promise<Result<void>> {
    return this.flush();
  }

  // ==================== 定期重新整理 ====================

  private startFlushInterval(): void {
    this.flushInterval = setInterval(async () => {
      if (this.buffer.length > 0) {
        await this.flush();
      }
    }, 10000); // 每10秒重新整理一次
  }

  /**
   * 銷毀日誌記錄器
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.buffer = [];
  }

  // ==================== 輔助方法 ====================

  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 从请求中提取 IP 地址
   */
  static extractIpAddress(request: Request): string {
    // 嘗試从各种头部獲取真实 IP
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'cf-connecting-ip',
      'x-client-ip',
      'x-forwarded',
      'forwarded-for',
    ];

    for (const header of headers) {
      const ip = request.headers.get(header);
      if (ip) {
        // 取第一个 IP（如果有多個）
        return ip.split(',')[0].trim();
      }
    }

    return 'unknown';
  }

  /**
   * 从请求中提取 User Agent
   */
  static extractUserAgent(request: Request): string {
    return request.headers.get('user-agent') || 'unknown';
  }

  /**
   * 比较新旧值并返回变更的字段
   */
  static getChanges(
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): { changed: Record<string, { old: any; new: any }>; hasChanges: boolean } {
    const changed: Record<string, { old: any; new: any }> = {};
    let hasChanges = false;

    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

    for (const key of allKeys) {
      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changed[key] = { old: oldValue, new: newValue };
        hasChanges = true;
      }
    }

    return { changed, hasChanges };
  }
}

// ==================== 類別型定义 ====================

interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

// ==================== 全局实例 ====================

export const auditLogger = new AuditLogger();

// ==================== 中间件輔助函數 ====================

/**
 * 創建審計日誌中间件輔助函數
 */
export function createAuditMiddleware(
  logger: AuditLogger,
  entityType: string
) {
  return {
    logCreate: async (userId: string, username: string, entityId: string, newValues: any) => {
      return logger.logCreate({ userId, username, entityType, entityId, newValues });
    },

    logUpdate: async (userId: string, username: string, entityId: string, oldValues: any, newValues: any) => {
      return logger.logUpdate({ userId, username, entityType, entityId, oldValues, newValues });
    },

    logDelete: async (userId: string, username: string, entityId: string, oldValues: any) => {
      return logger.logDelete({ userId, username, entityType, entityId, oldValues });
    },
  };
}
