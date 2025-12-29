/**
 * Transaction Manager
 * 事务管理器 - 提供统一的事务处理和错误恢复机制
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { Result, ok, err, TransactionOptions, TransactionContext } from './types';
import { db } from '@/lib/db';

// ==================== 事务状态 ====================

type TransactionStatus = 'idle' | 'active' | 'committed' | 'rolledback';

// ==================== 事务管理器 ====================

export class TransactionManager {
  private prisma: PrismaClient;
  private activeTransactions: Map<string, TransactionContext> = new Map();

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || db;
  }

  /**
   * 执行事务
   */
  async run<R>(
    fn: (tx: PrismaClient) => Promise<R>,
    options?: TransactionOptions
  ): Promise<Result<R>> {
    const txId = this.generateTxId();
    const context: TransactionContext = {
      id: txId,
      startTime: new Date(),
      isolationLevel: options?.isolationLevel,
    };

    this.activeTransactions.set(txId, context);

    try {
      const maxRetries = options?.maxRetries || 3;
      const result = await this.prisma.$transaction(
        async (tx) => {
          return await fn(tx);
        },
        {
          maxWait: options?.timeout ? options.timeout * 1000 : 20000,
          timeout: options?.timeout ? options.timeout * 1000 : 20000,
          isolationLevel: options?.isolationLevel || 'ReadCommitted',
        }
      );

      this.activeTransactions.delete(txId);
      return ok(result);
    } catch (e) {
      this.activeTransactions.delete(txId);
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 执行批量操作（在单个事务中）
   */
  async batch<R>(
    operations: Array<(tx: PrismaClient) => Promise<R>>,
    options?: TransactionOptions
  ): Promise<Result<R[]>> {
    return this.run(async (tx) => {
      return await Promise.all(operations.map(op => op(tx)));
    }, options);
  }

  /**
   * 执行可重试的操作
   */
  async retry<R>(
    fn: (tx: PrismaClient) => Promise<R>,
    options?: { maxRetries?: number; retryDelay?: number }
  ): Promise<Result<R>> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn(this.prisma);
        return ok(result);
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));

        // 检查是否为可重试的错误
        if (!this.isRetryableError(lastError)) {
          return err(lastError);
        }

        // 最后一次尝试失败，不再重试
        if (attempt >= maxRetries) {
          break;
        }

        // 等待后重试
        await this.delay(retryDelay * Math.pow(2, attempt));
      }
    }

    return err(lastError || new Error('Unknown error in retry operation'));
  }

  /**
   * 执行隔离的操作（快照读）
   */
  async isolated<R>(
    fn: (tx: PrismaClient) => Promise<R>
  ): Promise<Result<R>> {
    return this.run(fn, {
      isolationLevel: 'Serializable',
    });
  }

  /**
   * 获取当前活动的事务
   */
  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * 检查是否有活动的事务
   */
  hasActiveTransactions(): boolean {
    return this.activeTransactions.size > 0;
  }

  // ==================== 辅助方法 ====================

  private generateTxId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isRetryableError(error: Error): boolean {
    const retryableCodes = [
      'P1000', // Timeout
      'P1001', // Connection closed
      'P1002', // Connection rejected
      'P1008', // Transaction concurrency
      'P2034', // Unique constraint violation (concurrent update)
    ];

    return retryableCodes.some(code => error.message.includes(code));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==================== 全局实例 ====================

export const transactionManager = new TransactionManager();
