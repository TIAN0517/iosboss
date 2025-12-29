/**
 * Check Repository
 * 支票数据访问层 - 支票管理核心逻辑
 */

import { Prisma } from '@prisma/client';
import { BaseRepository } from '../repository';
import {
  Result,
  ok,
  QueryOptions,
  NotFoundError,
  ValidationError,
  BusinessError,
} from '../types';

// ==================== 类型定义 ====================

export type CheckStatus = 'pending' | 'deposited' | 'cleared' | 'bounced' | 'cancelled';

export interface CheckCreateInput {
  customerId?: string;
  checkNo: string;
  bankName: string;
  checkDate: Date;
  amount: number;
  note?: string;
}

export interface CheckUpdateInput {
  customerId?: string;
  checkNo?: string;
  bankName?: string;
  checkDate?: Date;
  amount?: number;
  status?: CheckStatus;
  note?: string;
}

export interface CheckFilter {
  customerId?: string;
  status?: CheckStatus;
  bankName?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  isAssigned?: boolean;  // 是否已关联订单
}

export interface CheckStats {
  total: number;
  pending: number;
  deposited: number;
  cleared: number;
  bounced: number;
  cancelled: number;
  totalPendingAmount: number;
  totalClearedAmount: number;
  totalBouncedAmount: number;
}

// ==================== Check Repository ====================

export class CheckRepository extends BaseRepository<any, CheckCreateInput, CheckUpdateInput> {
  constructor() {
    super();
    this.modelName = 'check';
    this.includeRelations = {
      customer: true,
      order: true,
    };
  }

  // ==================== 核心业务逻辑 ====================

  /**
   * 创建支票
   */
  async createCheck(data: CheckCreateInput): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      // 1. 验证支票号唯一性
      const existing = await tx.check.findUnique({
        where: { checkNo: data.checkNo },
      });

      if (existing) {
        throw new ValidationError('Check number already exists');
      }

      // 2. 验证金额
      if (data.amount <= 0) {
        throw new ValidationError('Check amount must be positive');
      }

      // 3. 验证客户（如果提供）
      if (data.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: data.customerId },
        });

        if (!customer) {
          throw new NotFoundError('Customer', data.customerId);
        }
      }

      // 4. 创建支票
      const check = await tx.check.create({
        data: {
          customerId: data.customerId || null,
          checkNo: data.checkNo,
          bankName: data.bankName,
          checkDate: data.checkDate,
          amount: data.amount,
          note: data.note || null,
          status: 'pending',
        },
        include: this.includeRelations,
      });

      return check;
    });
  }

  /**
   * 更新支票
   */
  async updateCheck(checkId: string, data: CheckUpdateInput): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const check = await tx.check.findUnique({
        where: { id: checkId },
      });

      if (!check) {
        throw new NotFoundError('Check', checkId);
      }

      // 验证支票号唯一性
      if (data.checkNo && data.checkNo !== check.checkNo) {
        const existing = await tx.check.findUnique({
          where: { checkNo: data.checkNo },
        });

        if (existing) {
          throw new ValidationError('Check number already exists');
        }
      }

      // 验证状态转换
      if (data.status && data.status !== check.status) {
        this.validateStatusTransition(check.status, data.status);
      }

      // 验证金额
      if (data.amount !== undefined && data.amount <= 0) {
        throw new ValidationError('Check amount must be positive');
      }

      const updated = await tx.check.update({
        where: { id: checkId },
        data,
        include: this.includeRelations,
      });

      return updated;
    });
  }

  /**
   * 删除支票
   */
  async deleteCheck(checkId: string): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const check = await tx.check.findUnique({
        where: { id: checkId },
      });

      if (!check) {
        throw new NotFoundError('Check', checkId);
      }

      // 只允许删除 pending 状态的支票
      if (check.status !== 'pending') {
        throw new BusinessError(
          `Cannot delete check with status ${check.status}. Only pending checks can be deleted.`
        );
      }

      // 如果已关联订单，不允许删除
      if (check.orderId) {
        throw new BusinessError(
          'Cannot delete check that is already assigned to an order'
        );
      }

      const deleted = await tx.check.delete({
        where: { id: checkId },
        include: this.includeRelations,
      });

      return deleted;
    });
  }

  /**
   * 关联订单
   */
  async assignToOrder(checkId: string, orderId: string, customerId: string): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const check = await tx.check.findUnique({
        where: { id: checkId },
      });

      if (!check) {
        throw new NotFoundError('Check', checkId);
      }

      if (check.status !== 'pending') {
        throw new BusinessError('Cannot assign check with status ' + check.status);
      }

      if (check.orderId) {
        throw new BusinessError('Check is already assigned to an order');
      }

      const updated = await tx.check.update({
        where: { id: checkId },
        data: {
          orderId,
          customerId,
        },
        include: this.includeRelations,
      });

      return updated;
    });
  }

  /**
   * 更新状态
   */
  async updateStatus(checkId: string, status: CheckStatus, note?: string): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const check = await tx.check.findUnique({
        where: { id: checkId },
      });

      if (!check) {
        throw new NotFoundError('Check', checkId);
      }

      this.validateStatusTransition(check.status, status);

      const updated = await tx.check.update({
        where: { id: checkId },
        data: {
          status,
          note: note || check.note,
        },
        include: this.includeRelations,
      });

      return updated;
    });
  }

  // ==================== 查询方法 ====================

  /**
   * 按支票号查找
   */
  async findByCheckNo(checkNo: string): Promise<Result<any | null>> {
    try {
      const check = await this.prisma.check.findUnique({
        where: { checkNo },
        include: this.includeRelations,
      });
      return ok(check);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取待处理支票
   */
  async getPendingChecks(): Promise<Result<any[]>> {
    try {
      const checks = await this.prisma.check.findMany({
        where: { status: 'pending' },
        include: this.includeRelations,
        orderBy: { checkDate: 'asc' },
      });
      return ok(checks);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取即将到期的支票
   */
  async getDueChecks(days: number = 7): Promise<Result<any[]>> {
    try {
      const now = new Date();
      const future = new Date(now);
      future.setDate(future.getDate() + days);

      const checks = await this.prisma.check.findMany({
        where: {
          status: 'pending',
          checkDate: {
            gte: now,
            lte: future,
          },
        },
        include: this.includeRelations,
        orderBy: { checkDate: 'asc' },
      });
      return ok(checks);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取逾期支票
   */
  async getOverdueChecks(): Promise<Result<any[]>> {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const checks = await this.prisma.check.findMany({
        where: {
          status: 'pending',
          checkDate: { lt: now },
        },
        include: this.includeRelations,
        orderBy: { checkDate: 'asc' },
      });
      return ok(checks);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 按客户获取支票
   */
  async getByCustomer(customerId: string): Promise<Result<any[]>> {
    try {
      const checks = await this.prisma.check.findMany({
        where: { customerId },
        include: this.includeRelations,
        orderBy: { checkDate: 'desc' },
      });
      return ok(checks);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 高级筛选
   */
  async filter(filter: CheckFilter, options?: QueryOptions): Promise<Result<any[]>> {
    try {
      const where: Prisma.CheckWhereInput = {};

      if (filter.customerId) {
        where.customerId = filter.customerId;
      }

      if (filter.status) {
        where.status = filter.status;
      }

      if (filter.bankName) {
        where.bankName = { contains: filter.bankName, mode: 'insensitive' };
      }

      if (filter.startDate || filter.endDate) {
        where.checkDate = {};
        if (filter.startDate) {
          (where.checkDate as any).gte = filter.startDate;
        }
        if (filter.endDate) {
          (where.checkDate as any).lte = filter.endDate;
        }
      }

      if (filter.minAmount || filter.maxAmount) {
        where.amount = {};
        if (filter.minAmount) {
          (where.amount as any).gte = filter.minAmount;
        }
        if (filter.maxAmount) {
          (where.amount as any).lte = filter.maxAmount;
        }
      }

      if (filter.isAssigned !== undefined) {
        where.orderId = filter.isAssigned ? { not: null } : null;
      }

      const checks = await this.prisma.check.findMany({
        where,
        include: this.includeRelations,
        orderBy: this.buildOrderBy(options),
      });

      return ok(checks);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取统计
   */
  async getStatistics(): Promise<Result<CheckStats>> {
    try {
      const [total, pending, deposited, cleared, bounced, cancelled, amounts] = await Promise.all([
        this.prisma.check.count(),
        this.prisma.check.count({ where: { status: 'pending' } }),
        this.prisma.check.count({ where: { status: 'deposited' } }),
        this.prisma.check.count({ where: { status: 'cleared' } }),
        this.prisma.check.count({ where: { status: 'bounced' } }),
        this.prisma.check.count({ where: { status: 'cancelled' } }),
        this.prisma.check.groupBy({
          by: ['status'],
          _sum: { amount: true },
        }),
      ]);

      let totalPendingAmount = 0;
      let totalClearedAmount = 0;
      let totalBouncedAmount = 0;

      for (const item of amounts) {
        const amount = item._sum.amount || 0;
        switch (item.status) {
          case 'pending':
            totalPendingAmount += amount;
            break;
          case 'cleared':
            totalClearedAmount += amount;
            break;
          case 'bounced':
            totalBouncedAmount += amount;
            break;
        }
      }

      return ok({
        total,
        pending,
        deposited,
        cleared,
        bounced,
        cancelled,
        totalPendingAmount,
        totalClearedAmount,
        totalBouncedAmount,
      });
    } catch (e) {
      return this.handleError(e);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 验证状态转换
   */
  private validateStatusTransition(currentStatus: CheckStatus, newStatus: CheckStatus): void {
    const validTransitions: Record<CheckStatus, CheckStatus[]> = {
      pending: ['deposited', 'cancelled', 'bounced'],
      deposited: ['cleared', 'bounced'],
      cleared: [],
      bounced: ['pending'],
      cancelled: [],
    };

    const allowed = validTransitions[currentStatus] || [];

    if (!allowed.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition check from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private handleError(e: unknown): Result<never> {
    if (e instanceof NotFoundError ||
        e instanceof ValidationError ||
        e instanceof BusinessError) {
      return err(e);
    }
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
