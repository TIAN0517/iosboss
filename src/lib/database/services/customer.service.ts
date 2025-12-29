/**
 * Customer Service
 * 客户业务服务层 - 协调多个 Repository 实现复杂业务逻辑
 */

import { PrismaClient } from '@prisma/client';
import { CustomerRepository } from '../repositories/customer.repository';
import { OrderRepository } from '../repositories/order.repository';
import { Result, ok, NotFoundError, ValidationError, BusinessError } from '../types';

// ==================== 类型定义 ====================

export interface CreateCustomerDto {
  name: string;
  phone: string;
  address: string;
  groupId?: string;
  paymentType?: 'cash' | 'monthly';
  note?: string;
  creditLimit?: number;
  lineUserId?: string;
  // Customer extra fields
  contactPerson?: string;
  fax?: string;
  email?: string;
  taxId?: string;
  billingAddress?: string;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  address?: string;
  groupId?: string;
  paymentType?: 'cash' | 'monthly';
  note?: string;
  creditLimit?: number;
  lineUserId?: string;
  // Customer extra fields
  contactPerson?: string;
  fax?: string;
  email?: string;
  taxId?: string;
  billingAddress?: string;
}

export interface CustomerValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface CustomerStatistics {
  orders: {
    total: number;
    thisMonth: number;
    thisYear: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    thisYear: number;
    averageOrderValue: number;
  };
  payments: {
    balance: number;
    creditLimit: number;
    availableCredit: number;
    overduePayments: number;
  };
  lastOrder: {
    date: Date | null;
    amount: number;
  } | null;
}

// ==================== Customer Service ====================

export class CustomerService {
  private customerRepo: CustomerRepository;
  private orderRepo: OrderRepository;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || (require('@/lib/db').db as PrismaClient);
    this.customerRepo = new CustomerRepository();
    this.orderRepo = new OrderRepository();
  }

  // ==================== 核心业务方法 ====================

  /**
   * 创建客户（带完整业务验证）
   */
  async createCustomer(dto: CreateCustomerDto): Promise<Result<any>> {
    // 1. 验证客户数据
    const validation = await this.validateCustomer(dto);
    if (!validation.valid) {
      return err(new ValidationError(
        `Customer validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      ));
    }

    // 2. 准备客户数据
    const customerData = {
      name: dto.name,
      phone: dto.phone,
      address: dto.address,
      groupId: dto.groupId || null,
      paymentType: dto.paymentType || 'cash',
      note: dto.note || null,
      creditLimit: dto.creditLimit || 0,
      lineUserId: dto.lineUserId || null,
    };

    // 3. 创建客户
    const result = await this.customerRepo.create(customerData);

    if (!result.success) {
      return result;
    }

    const customer = result.data;

    // 4. 创建扩展信息
    const hasExtraData =
      dto.contactPerson ||
      dto.fax ||
      dto.email ||
      dto.taxId ||
      dto.billingAddress;

    if (hasExtraData) {
      await this.db.customerExtra.create({
        data: {
          customerId: customer.id,
          contactPerson: dto.contactPerson || null,
          fax: dto.fax || null,
          email: dto.email || null,
          taxId: dto.taxId || null,
          billingAddress: dto.billingAddress || null,
        },
      });
    }

    // 5. 重新获取包含扩展信息的客户
    const fullCustomer = await this.db.customer.findUnique({
      where: { id: customer.id },
      include: {
        group: true,
        extra: true,
      },
    });

    return ok(fullCustomer);
  }

  /**
   * 更新客户
   */
  async updateCustomer(customerId: string, dto: UpdateCustomerDto): Promise<Result<any>> {
    // 1. 验证客户存在
    const existing = await this.customerRepo.findById(customerId);
    if (!existing.success || !existing.data) {
      return err(new NotFoundError('Customer', customerId));
    }

    // 2. 验证数据
    if (dto.phone && dto.phone !== existing.data.phone) {
      const phoneExists = await this.customerRepo.findByPhone(dto.phone);
      if (phoneExists.success && phoneExists.data) {
        return err(new ValidationError('Phone number already exists'));
      }
    }

    // 3. 更新基本信息
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.groupId !== undefined) updateData.groupId = dto.groupId;
    if (dto.paymentType !== undefined) updateData.paymentType = dto.paymentType;
    if (dto.note !== undefined) updateData.note = dto.note;
    if (dto.creditLimit !== undefined) updateData.creditLimit = dto.creditLimit;
    if (dto.lineUserId !== undefined) updateData.lineUserId = dto.lineUserId;

    const result = await this.customerRepo.update(customerId, updateData);

    if (!result.success) {
      return result;
    }

    // 4. 更新扩展信息
    const hasExtraData =
      dto.contactPerson !== undefined ||
      dto.fax !== undefined ||
      dto.email !== undefined ||
      dto.taxId !== undefined ||
      dto.billingAddress !== undefined;

    if (hasExtraData) {
      const extra = await this.db.customerExtra.findUnique({
        where: { customerId },
      });

      const extraData: any = {};
      if (dto.contactPerson !== undefined) extraData.contactPerson = dto.contactPerson;
      if (dto.fax !== undefined) extraData.fax = dto.fax;
      if (dto.email !== undefined) extraData.email = dto.email;
      if (dto.taxId !== undefined) extraData.taxId = dto.taxId;
      if (dto.billingAddress !== undefined) extraData.billingAddress = dto.billingAddress;

      if (extra) {
        await this.db.customerExtra.update({
          where: { customerId },
          data: extraData,
        });
      } else {
        await this.db.customerExtra.create({
          data: {
            customerId,
            ...extraData,
          },
        });
      }
    }

    // 5. 重新获取完整信息
    const fullCustomer = await this.db.customer.findUnique({
      where: { id: customerId },
      include: {
        group: true,
        extra: true,
      },
    });

    return ok(fullCustomer);
  }

  /**
   * 删除客户
   */
  async deleteCustomer(customerId: string): Promise<Result<any>> {
    // 1. 检查是否有未完成订单
    const pendingOrders = await this.db.gasOrder.count({
      where: {
        customerId,
        status: { in: ['pending', 'processing', 'delivering'] },
      },
    });

    if (pendingOrders > 0) {
      return err(new BusinessError(
        `Cannot delete customer with ${pendingOrders} pending orders`
      ));
    }

    // 2. 检查月结客户余额
    const customer = await this.db.customer.findUnique({
      where: { id: customerId },
    });

    if (customer?.paymentType === 'monthly' && customer.balance > 0) {
      return err(new BusinessError(
        `Cannot delete monthly customer with outstanding balance (${customer.balance})`
      ));
    }

    // 3. 删除
    return this.customerRepo.delete(customerId);
  }

  /**
   * 获取客户统计
   */
  async getStatistics(customerId: string): Promise<Result<CustomerStatistics>> {
    try {
      const customer = await this.db.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        return err(new NotFoundError('Customer', customerId));
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // 订单统计
      const [totalOrders, ordersThisMonth, ordersThisYear] = await Promise.all([
        this.db.gasOrder.count({ where: { customerId } }),
        this.db.gasOrder.count({
          where: { customerId, orderDate: { gte: monthStart } },
        }),
        this.db.gasOrder.count({
          where: { customerId, orderDate: { gte: yearStart } },
        }),
      ]);

      // 营收统计
      const [revenueTotal, revenueThisMonth, revenueThisYear] = await Promise.all([
        this.db.gasOrder.aggregate({
          where: { customerId, status: { in: ['completed', 'delivering'] } },
          _sum: { total: true },
        }),
        this.db.gasOrder.aggregate({
          where: {
            customerId,
            status: { in: ['completed', 'delivering'] },
            orderDate: { gte: monthStart },
          },
          _sum: { total: true },
        }),
        this.db.gasOrder.aggregate({
          where: {
            customerId,
            status: { in: ['completed', 'delivering'] },
            orderDate: { gte: yearStart },
          },
          _sum: { total: true },
        }),
      ]);

      // 最后订单
      const lastOrder = await this.db.gasOrder.findFirst({
        where: { customerId, status: { in: ['completed', 'delivering'] } },
        orderBy: { orderDate: 'desc' },
      });

      // 計算逾期付款（已發送且未繳清的月結單據）
      const overdueStatements = await this.db.monthlyStatement.findMany({
        where: {
          customerId,
          status: 'sent', // 已發送但未繳清
          balance: { gt: 0 }, // 有餘額
          periodEnd: { lt: new Date() }, // 已過期
        },
      });

      // 計算逾期金額（超過 30 天未付款的）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const overdueAmount = overdueStatements
        .filter(s => s.periodEnd < thirtyDaysAgo)
        .reduce((sum, s) => sum + s.balance, 0);

      const statistics: CustomerStatistics = {
        orders: {
          total: totalOrders,
          thisMonth: ordersThisMonth,
          thisYear: ordersThisYear,
        },
        revenue: {
          total: revenueTotal._sum.total || 0,
          thisMonth: revenueThisMonth._sum.total || 0,
          thisYear: revenueThisYear._sum.total || 0,
          averageOrderValue:
            totalOrders > 0 ? (revenueTotal._sum.total || 0) / totalOrders : 0,
        },
        payments: {
          balance: customer.balance,
          creditLimit: customer.creditLimit,
          availableCredit: customer.creditLimit - customer.balance,
          overduePayments: overdueAmount,
        },
        lastOrder: lastOrder
          ? { date: lastOrder.orderDate, amount: lastOrder.total }
          : null,
      };

      return ok(statistics);
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
    type: 'charge' | 'payment' | 'adjustment',
    note?: string
  ): Promise<Result<any>> {
    const customer = await this.db.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return err(new NotFoundError('Customer', customerId));
    }

    if (customer.paymentType !== 'monthly') {
      return err(new ValidationError('Cannot update balance for cash customer'));
    }

    const newBalance = customer.balance + amount;

    if (newBalance < 0) {
      return err(new ValidationError('Balance cannot be negative'));
    }

    if (newBalance > customer.creditLimit) {
      return err(new ValidationError('Balance exceeds credit limit'));
    }

    const updated = await this.db.customer.update({
      where: { id: customerId },
      data: { balance: newBalance },
    });

    // 記錄餘額變動日誌
    await this.db.auditLog.create({
      data: {
        action: 'balance_update',
        entityType: 'Customer',
        entityId: customerId,
        oldValues: { balance: customer.balance },
        newValues: { balance: newBalance, amount, type, note },
      },
    });

    return ok(updated);
  }

  /**
   * 记录付款
   */
  async recordPayment(
    customerId: string,
    amount: number,
    method: 'cash' | 'transfer' | 'check',
    note?: string
  ): Promise<Result<any>> {
    if (amount <= 0) {
      return err(new ValidationError('Payment amount must be positive'));
    }

    return this.updateBalance(customerId, -amount, 'payment', note);
  }

  // ==================== 验证方法 ====================

  /**
   * 验证客户数据
   */
  private async validateCustomer(dto: CreateCustomerDto): Promise<CustomerValidationResult> {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // 基本验证
    if (!dto.name || dto.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Customer name is required' });
    }

    if (!dto.phone || dto.phone.trim().length === 0) {
      errors.push({ field: 'phone', message: 'Phone number is required' });
    } else {
      // 验证电话格式（台湾手机号）
      const phoneRegex = /^09\d{8}$/;
      if (!phoneRegex.test(dto.phone)) {
        errors.push({ field: 'phone', message: 'Invalid phone number format (09xxxxxxxx)' });
      } else {
        // 检查是否已存在
        const existing = await this.customerRepo.findByPhone(dto.phone);
        if (existing.success && existing.data) {
          errors.push({ field: 'phone', message: 'Phone number already exists' });
        }
      }
    }

    if (!dto.address || dto.address.trim().length === 0) {
      errors.push({ field: 'address', message: 'Address is required' });
    }

    // 验证客户分组
    if (dto.groupId) {
      const group = await this.db.customerGroup.findUnique({
        where: { id: dto.groupId },
      });

      if (!group) {
        errors.push({ field: 'groupId', message: 'Customer group not found' });
      } else if (!group.isActive) {
        warnings.push({ field: 'groupId', message: 'Customer group is inactive' });
      }
    }

    // 验证信用额度
    if (dto.paymentType === 'monthly') {
      if (dto.creditLimit === undefined || dto.creditLimit <= 0) {
        warnings.push({
          field: 'creditLimit',
          message: 'Monthly customer should have a credit limit',
        });
      }
    }

    // 验证 LINE User ID
    if (dto.lineUserId) {
      const existing = await this.db.customer.findUnique({
        where: { lineUserId: dto.lineUserId },
      });

      if (existing) {
        warnings.push({
          field: 'lineUserId',
          message: 'LINE User ID is already linked to another customer',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 搜索客户
   */
  async searchCustomers(query: string): Promise<Result<any[]>> {
    try {
      const customers = await this.db.customer.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { address: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: {
          group: true,
          extra: true,
        },
        orderBy: { name: 'asc' },
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
    return this.customerRepo.getMonthlyCustomers();
  }

  /**
   * 获取余额超过限额的客户
   */
  async getOverCreditCustomers(): Promise<Result<any[]>> {
    try {
      const customers = await this.db.customer.findMany({
        where: {
          paymentType: 'monthly',
          balance: { gt: this.db.customer.fields.creditLimit },
        },
        include: {
          group: true,
          extra: true,
        },
        orderBy: { balance: 'desc' },
      });

      return ok(customers);
    } catch (e) {
      return this.handleError(e);
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
