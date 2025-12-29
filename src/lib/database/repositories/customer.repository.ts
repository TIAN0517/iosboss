/**
 * Customer Repository
 * 客户数据访问层
 */

import { Prisma } from '@prisma/client';
import { BaseRepository } from '../repository';
import { Result, ok, PaginatedResult, QueryOptions, NotFoundError, ValidationError, ConflictError } from '../types';

// ==================== 类型定义 ====================

export interface CustomerCreateInput {
  name: string;
  phone: string;
  address: string;
  paymentType?: 'cash' | 'monthly';
  groupId?: string | null;
  note?: string;
  creditLimit?: number;
}

export interface CustomerUpdateInput {
  name?: string;
  phone?: string;
  address?: string;
  paymentType?: 'cash' | 'monthly';
  groupId?: string | null;
  note?: string;
  balance?: number;
  creditLimit?: number;
}

export interface CustomerFilter {
  search?: string;
  paymentType?: 'cash' | 'monthly';
  groupId?: string;
  isActive?: boolean;
  hasDebt?: boolean;
}

export interface CustomerStats {
  totalCustomers: number;
  cashCustomers: number;
  monthlyCustomers: number;
  totalBalance: number;
  totalCreditLimit: number;
}

// ==================== Customer Repository ====================

export class CustomerRepository extends BaseRepository<
  any,
  CustomerCreateInput,
  CustomerUpdateInput
> {
  constructor() {
    super();
    this.modelName = 'customer';
    this.includeRelations = {
      group: true,
    };
  }

  // ==================== 自定义查询 ====================

  /**
   * 根据电话号码查找客户
   */
  async findByPhone(phone: string): Promise<Result<any | null>> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { phone },
        include: { group: true },
      });
      return ok(customer);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 搜索客户（按姓名或电话）
   */
  async search(keyword: string): Promise<Result<any[]>> {
    try {
      const customers = await this.prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { phone: { contains: keyword, mode: 'insensitive' } },
          ],
        },
        include: { group: true },
        take: 20,
      });
      return ok(customers);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取月结客户
   */
  async getMonthlyCustomers(): Promise<Result<any[]>> {
    try {
      const customers = await this.prisma.customer.findMany({
        where: { paymentType: 'monthly' },
        include: { group: true },
        orderBy: { name: 'asc' },
      });
      return ok(customers);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取有欠款的客户
   */
  async getCustomersWithDebt(): Promise<Result<any[]>> {
    try {
      const customers = await this.prisma.customer.findMany({
        where: {
          paymentType: 'monthly',
          balance: { gt: 0 },
        },
        include: { group: true },
        orderBy: { balance: 'desc' },
      });
      return ok(customers);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 高级筛选客户
   */
  async filter(filter: CustomerFilter, options?: QueryOptions): Promise<Result<PaginatedResult<any>>> {
    try {
      const where: Prisma.CustomerWhereInput = {};

      // 搜索条件
      if (filter.search) {
        where.OR = [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { phone: { contains: filter.search, mode: 'insensitive' } },
          { address: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      // 付款类型筛选
      if (filter.paymentType) {
        where.paymentType = filter.paymentType;
      }

      // 客户分组筛选
      if (filter.groupId) {
        where.groupId = filter.groupId;
      }

      // 有欠款筛选
      if (filter.hasDebt) {
        where.balance = { gt: 0 };
      }

      const pagination = options?.pagination || { page: 1, pageSize: 20 };
      const skip = (pagination.page - 1) * pagination.pageSize;

      const [items, total] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          include: { group: true },
          orderBy: this.buildOrderBy(options),
          skip,
          take: pagination.pageSize,
        }),
        this.prisma.customer.count({ where }),
      ]);

      return ok(this.createPaginatedResult(items, total, pagination));
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取客户统计
   */
  async getStats(): Promise<Result<CustomerStats>> {
    try {
      const [total, cash, monthly, balanceResult, creditResult] = await Promise.all([
        this.prisma.customer.count(),
        this.prisma.customer.count({ where: { paymentType: 'cash' } }),
        this.prisma.customer.count({ where: { paymentType: 'monthly' } }),
        this.prisma.customer.aggregate({ _sum: { balance: true } }),
        this.prisma.customer.aggregate({ _sum: { creditLimit: true } }),
      ]);

      return ok({
        totalCustomers: total,
        cashCustomers: cash,
        monthlyCustomers: monthly,
        totalBalance: balanceResult._sum.balance || 0,
        totalCreditLimit: creditResult._sum.creditLimit || 0,
      });
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 更新客户余额
   */
  async updateBalance(
    customerId: string,
    amount: number,
    options?: { checkCreditLimit?: boolean }
  ): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundError('Customer', customerId);
      }

      const newBalance = customer.balance + amount;

      // 检查信用额度
      if (options?.checkCreditLimit && newBalance > customer.creditLimit) {
        throw new ValidationError(
          `Balance exceeds credit limit: ${customer.creditLimit}`,
          'balance',
          { currentBalance: customer.balance, amount, creditLimit: customer.creditLimit }
        );
      }

      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { balance: newBalance },
      });

      return updated;
    });
  }

  /**
   * 记录客户付款
   */
  async recordPayment(
    customerId: string,
    amount: number,
    options?: { method?: 'cash' | 'check' | 'transfer'; checkId?: string; note?: string }
  ): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new NotFoundError('Customer', customerId);
      }

      if (customer.paymentType !== 'monthly') {
        throw new ValidationError('Only monthly customers can record payments');
      }

      if (amount <= 0) {
        throw new ValidationError('Payment amount must be positive', 'amount');
      }

      // 更新余额
      const newBalance = customer.balance - amount;
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { balance: Math.max(0, newBalance) },
      });

      // 如果使用支票，更新支票状态
      if (options?.checkId) {
        await tx.check.update({
          where: { id: options.checkId },
          data: { status: 'deposited', customerId },
        });
      }

      return updated;
    });
  }

  /**
   * 获取客户订单历史
   */
  async getOrderHistory(
    customerId: string,
    options?: { limit?: number; status?: string }
  ): Promise<Result<any[]>> {
    try {
      const where: Prisma.GasOrderWhereInput = { customerId };
      if (options?.status) {
        where.status = options.status;
      }

      const orders = await this.prisma.gasOrder.findMany({
        where,
        include: {
          items: { include: { product: true } },
          check: true,
        },
        orderBy: { orderDate: 'desc' },
        take: options?.limit || 10,
      });

      return ok(orders);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取客户月结单
   */
  async getMonthlyStatements(
    customerId: string,
    options?: { year?: number; limit?: number }
  ): Promise<Result<any[]>> {
    try {
      const where: Prisma.MonthlyStatementWhereInput = { customerId };

      if (options?.year) {
        where.month = { startsWith: options.year.toString() };
      }

      const statements = await this.prisma.monthlyStatement.findMany({
        where,
        orderBy: { periodEnd: 'desc' },
        take: options?.limit || 12,
      });

      return ok(statements);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 检查客户是否可以删除
   */
  async canDelete(customerId: string): Promise<Result<boolean>> {
    try {
      const [orderCount, checkCount, balance] = await Promise.all([
        this.prisma.gasOrder.count({ where: { customerId } }),
        this.prisma.check.count({ where: { customerId } }),
        this.prisma.customer.findUnique({
          where: { id: customerId },
          select: { balance: true },
        }),
      ]);

      if (!balance) {
        return ok(false);
      }

      const hasOrders = orderCount > 0;
      const hasChecks = checkCount > 0;
      const hasDebt = balance.balance > 0;

      if (hasOrders || hasChecks || hasDebt) {
        return ok(false);
      }

      return ok(true);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 创建客户（带验证）
   */
  async createWithValidation(data: CustomerCreateInput): Promise<Result<any>> {
    try {
      // 验证电话号码唯一性
      const existing = await this.prisma.customer.findUnique({
        where: { phone: data.phone },
      });

      if (existing) {
        throw new ConflictError(`Customer with phone ${data.phone} already exists`);
      }

      // 验证客户分组
      if (data.groupId) {
        const group = await this.prisma.customerGroup.findUnique({
          where: { id: data.groupId },
        });

        if (!group) {
          throw new NotFoundError('CustomerGroup', data.groupId);
        }

        if (!group.isActive) {
          throw new ValidationError('Selected customer group is not active');
        }
      }

      // 创建客户
      const customer = await this.prisma.customer.create({
        data: {
          ...data,
          groupId: data.groupId || null,
          balance: 0,
        },
        include: { group: true },
      });

      return ok(customer);
    } catch (e) {
      return this.handleError(e);
    }
  }

  // ==================== 辅助方法 ====================

  private handleError(e: unknown): Result<never> {
    if (e instanceof NotFoundError ||
        e instanceof ValidationError ||
        e instanceof ConflictError) {
      return err(e);
    }
    return err(e instanceof Error ? e : new Error(String(e)));
  }

  private createPaginatedResult<T>(
    items: T[],
    total: number,
    pagination: any
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / pagination.pageSize);
    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }
}
