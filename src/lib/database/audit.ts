/**
 * Audit Logger
 * 审计日志系统 - 追踪所有关键操作
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient } from '@prisma/client';
import { Result, ok, err, AuditLog, AuditAction } from './types';
import { db } from '@/lib/db';

// ==================== 审计日志器 ====================

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

  // ==================== 日志记录 ====================

  /**
   * 记录审计日志
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

      // 添加到缓冲区
      this.buffer.push(log);

      // 缓冲区满了则刷新
      if (this.buffer.length >= this.bufferSize) {
        await this.flush();
      }

      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 记录创建操作
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
   * 记录更新操作
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
   * 记录删除操作
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
   * 记录登录操作
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
   * 记录登出操作
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

  // ==================== 查询操作 ====================

  /**
   * 获取用户审计日志
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
   * 获取实体审计日志
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
   * 获取所有审计日志
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

  // ==================== 缓冲区管理 ====================

  /**
   * 刷新缓冲区到数据库
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
   * 获取缓冲区大小
   */
  getBufferSize(): number {
    return this.buffer.length;
  }

  /**
   * 强制刷新
   */
  async forceFlush(): Promise<Result<void>> {
    return this.flush();
  }

  // ==================== 定期刷新 ====================

  private startFlushInterval(): void {
    this.flushInterval = setInterval(async () => {
      if (this.buffer.length > 0) {
        await this.flush();
      }
    }, 10000); // 每10秒刷新一次
  }

  /**
   * 销毁日志记录器
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.buffer = [];
  }

  // ==================== 辅助方法 ====================

  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 从请求中提取 IP 地址
   */
  static extractIpAddress(request: Request): string {
    // 尝试从各种头部获取真实 IP
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
        // 取第一个 IP（如果有多个）
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

// ==================== 类型定义 ====================

interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

// ==================== 全局实例 ====================

export const auditLogger = new AuditLogger();

// ==================== 中间件辅助函数 ====================

/**
 * 创建审计日志中间件辅助函数
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
