/**
 * Order Service
 * 订单业务服务层 - 协调多个 Repository 实现复杂业务逻辑
 */

import { PrismaClient } from '@prisma/client';
import { OrderRepository } from '../repositories/order.repository';
import { CustomerRepository } from '../repositories/customer.repository';
import { Result, ok, NotFoundError, ValidationError, BusinessError } from '../types';
import { db } from '@/lib/db';

// ==================== 类型定义 ====================

export interface CreateOrderDto {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  deliveryDate?: Date;
  note?: string;
  checkId?: string;
  driverId?: string;
}

export interface UpdateOrderStatusDto {
  status: 'pending' | 'processing' | 'delivering' | 'completed' | 'cancelled';
  driverId?: string;
  completedAt?: Date;
  note?: string;
}

export interface OrderValidationResult {
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

export interface OrderStatistics {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  orders: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

// ==================== Order Service ====================

export class OrderService {
  private orderRepo: OrderRepository;
  private customerRepo: CustomerRepository;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || db;
    this.orderRepo = new OrderRepository();
    this.customerRepo = new CustomerRepository();
  }

  // ==================== 核心业务方法 ====================

  /**
   * 创建订单（带完整业务验证）
   */
  async createOrder(dto: CreateOrderDto): Promise<Result<any>> {
    // 1. 验证订单数据
    const validation = await this.validateOrder(dto);
    if (!validation.valid) {
      return err(new ValidationError(
        `Order validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      ));
    }

    // 2. 准备订单数据
    const orderData = {
      customerId: dto.customerId,
      items: dto.items,
      deliveryDate: dto.deliveryDate,
      note: dto.note,
      checkId: dto.checkId,
      driverId: dto.driverId,
    };

    // 3. 创建订单
    const result = await this.orderRepo.createOrder(orderData);

    if (!result.success) {
      return result;
    }

    const order = result.data;

    // 4. 发送通知（可选）
    await this.sendOrderNotification(order);

    // 5. 更新客户最后订单时间
    await this.db.customer.update({
      where: { id: dto.customerId },
      data: { lastOrderAt: new Date() },
    });

    return ok(order);
  }

  /**
   * 更新订单状态
   */
  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto
  ): Promise<Result<any>> {
    return this.orderRepo.withTransaction(async (tx) => {
      const order = await tx.gasOrder.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // 业务规则验证
      await this.validateStatusTransition(order.status, dto.status);

      // 更新状态
      const result = await this.orderRepo.updateStatus(orderId, dto.status, {
        driverId: dto.driverId,
        completedAt: dto.completedAt,
      });

      if (!result.success) {
        throw result.error;
      }

      const updatedOrder = result.data;

      // 状态变更后的业务处理
      await this.handleStatusChange(updatedOrder, tx);

      return updatedOrder;
    });
  }

  /**
   * 取消订单
   */
  async cancelOrder(
    orderId: string,
    reason?: string
  ): Promise<Result<any>> {
    const result = await this.updateOrderStatus(orderId, {
      status: 'cancelled',
    });

    if (!result.success) {
      return result;
    }

    // 记录取消原因
    if (reason) {
      await this.db.gasOrder.update({
        where: { id: orderId },
        data: { note: reason },
      });
    }

    return result;
  }

  /**
   * 删除订单
   */
  async deleteOrder(orderId: string): Promise<Result<any>> {
    return this.orderRepo.deleteOrder(orderId);
  }

  /**
   * 获取订单统计
   */
  async getStatistics(options?: {
    startDate?: Date;
    endDate?: Date;
    customerId?: string;
  }): Promise<Result<OrderStatistics>> {
    try {
      const prisma = this.prisma;

      // 获取日期范围
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      // 营收统计
      const [revenueToday, revenueThisWeek, revenueThisMonth, revenueThisYear] = await Promise.all([
        this.sumRevenueWhere({ orderDate: { gte: today } }),
        this.sumRevenueWhere({ orderDate: { gte: weekStart } }),
        this.sumRevenueWhere({ orderDate: { gte: monthStart } }),
        this.sumRevenueWhere({ orderDate: { gte: yearStart } }),
      ]);

      // 订单统计
      const [ordersToday, ordersThisWeek, ordersThisMonth, ordersThisYear] = await Promise.all([
        db.gasOrder.count({ where: { orderDate: { gte: today } } }),
        db.gasOrder.count({ where: { orderDate: { gte: weekStart } } }),
        db.gasOrder.count({ where: { orderDate: { gte: monthStart } } }),
        db.gasOrder.count({ where: { orderDate: { gte: yearStart } } }),
      ]);

      // 平均订单价值
      const avgOrderResult = await db.gasOrder.aggregate({
        where: {
          status: { in: ['completed', 'delivering'] },
          orderDate: { gte: monthStart },
        },
        _avg: { total: true },
      });

      // 热销产品
      const topItems = await db.gasOrderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            orderDate: { gte: monthStart },
            status: { in: ['completed', 'delivering'] },
          },
        },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      });

      const topProducts = await Promise.all(
        topItems.map(async (item) => {
          const product = await db.product.findUnique({
            where: { id: item.productId },
          });
          return {
            productId: item.productId,
            productName: product?.name || 'Unknown',
            quantity: item._sum.quantity || 0,
            revenue: item._sum.subtotal || 0,
          };
        })
      );

      const statistics: OrderStatistics = {
        revenue: {
          today: revenueToday,
          thisWeek: revenueThisWeek,
          thisMonth: revenueThisMonth,
          thisYear: revenueThisYear,
        },
        orders: {
          today: ordersToday,
          thisWeek: ordersThisWeek,
          thisMonth: ordersThisMonth,
          thisYear: ordersThisYear,
        },
        averageOrderValue: avgOrderResult._avg.total || 0,
        topProducts,
      };

      return ok(statistics);
    } catch (e) {
      return this.handleError(e);
    }
  }

  // ==================== 验证方法 ====================

  /**
   * 验证订单数据
   */
  private async validateOrder(dto: CreateOrderDto): Promise<OrderValidationResult> {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // 基本验证
    if (!dto.customerId) {
      errors.push({ field: 'customerId', message: 'Customer is required' });
    }

    if (!dto.items || dto.items.length === 0) {
      errors.push({ field: 'items', message: 'At least one item is required' });
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // 业务验证
    const customer = await this.db.customer.findUnique({
      where: { id: dto.customerId },
      include: { group: true },
    });

    if (!customer) {
      errors.push({ field: 'customerId', message: 'Customer not found' });
    }

    // 验证订单项
    let totalAmount = 0;
    for (const item of dto.items) {
      const product = await this.db.product.findUnique({
        where: { id: item.productId },
        include: { inventory: true },
      });

      if (!product) {
        errors.push({ field: 'items', message: `Product ${item.productId} not found` });
        continue;
      }

      if (item.quantity <= 0) {
        errors.push({
          field: 'items',
          message: `Quantity must be positive for ${product.name}`,
        });
        continue;
      }

      const stock = product.inventory?.quantity || 0;
      if (stock < item.quantity) {
        errors.push({
          field: 'items',
          message: `Insufficient stock for ${product.name}. Available: ${stock}, Requested: ${item.quantity}`,
        });
      }

      totalAmount += product.price * item.quantity;
    }

    // 验证支票
    if (dto.checkId) {
      const check = await this.db.check.findUnique({
        where: { id: dto.checkId },
      });

      if (!check) {
        errors.push({ field: 'checkId', message: 'Check not found' });
      } else if (check.status !== 'pending') {
        errors.push({
          field: 'checkId',
          message: `Check is ${check.status}, cannot be used`,
        });
      } else if (check.amount !== null && Math.abs(check.amount - totalAmount) > 1) {
        warnings.push({
          field: 'checkId',
          message: `Check amount (${check.amount}) differs from order total (${totalAmount})`,
        });
      }
    }

    // 验证司机
    if (dto.driverId) {
      const driver = await this.db.user.findUnique({
        where: { id: dto.driverId },
      });

      if (!driver || driver.role !== 'driver') {
        errors.push({ field: 'driverId', message: 'Invalid driver' });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 验证状态转换
   */
  private async validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): Promise<void> {
    const validTransitions: Record<string, string[]> = {
      pending: ['processing', 'delivering', 'cancelled'],
      processing: ['delivering', 'cancelled'],
      delivering: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new ValidationError(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * 处理状态变更后的业务逻辑
   */
  private async handleStatusChange(
    order: any,
    tx: PrismaClient
  ): Promise<void> {
    switch (order.status) {
      case 'completed':
        // 创建配送记录
        if (!order.delivery) {
          await tx.deliveryRecord.create({
            data: {
              orderId: order.id,
              customerId: order.customerId,
              driverId: order.driverId,
              status: 'completed',
              deliveryDate: new Date(),
              completedAt: order.completedAt || new Date(),
            },
          });
        }

        // 更新月结客户的余额
        if (order.customer.paymentType === 'monthly') {
          await tx.customer.update({
            where: { id: order.customerId },
            data: {
              balance: { increment: order.total },
            },
          });
        }
        break;

      case 'cancelled':
        // 库存已在 deleteOrder 中恢复
        break;
    }
  }

  /**
   * 发送订单通知
   */
  private async sendOrderNotification(order: any): Promise<void> {
    try {
      // 發送到 LINE 群組通知
      await this.sendLineBotNotification(order);

      // TODO: 實現短信通知（需要整合短信服務 API）
      // await this.sendSmsNotification(order);

      console.log(`[OrderService] Order ${order.orderNo} notifications sent`);
    } catch (error) {
      console.error('[OrderService] Failed to send notifications:', error);
      // 不拋出錯誤，避免影響訂單創建
    }
  }

  /**
   * 發送 LINE Bot 群組通知
   */
  private async sendLineBotNotification(order: any): Promise<void> {
    try {
      const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      if (!lineToken) {
        console.warn('[OrderService] LINE_CHANNEL_ACCESS_TOKEN not configured');
        return;
      }

      // 獲取所有啟用的員工群組和管理群組
      const targetGroups = await this.db.lineGroup.findMany({
        where: {
          isActive: true,
          groupType: { in: ['staff', 'admin'] },
        },
        select: { groupId: true },
      });

      if (targetGroups.length === 0) {
        console.log('[OrderService] No active LINE groups to notify');
        return;
      }

      // 構建訂單訊息
      const items = order.items || [];
      const itemSummary = items.map((item: any) =>
        `${item.product?.name || item.product?.capacity || '瓦斯'} x${item.quantity}`
      ).join('、');

      const message = `🛒 **新訂單通知**

📋 訂單編號：${order.orderNo}
👤 客戶：${order.customer?.name || '未知'}
📱 電話：${order.customer?.phone || '-'}
📍 地址：${order.customer?.address || '-'}
📦 商品：${itemSummary}
💰 金額：NT$${order.total?.toLocaleString() || '0'}
📅 訂單日期：${new Date(order.createdAt).toLocaleString('zh-TW')}
⏰ 狀態：${this.getStatusLabel(order.status)}

⚡ 請及時處理！`;

      // 發送到每個群組
      const notifications = targetGroups.map(group =>
        fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lineToken}`,
          },
          body: JSON.stringify({
            to: group.groupId,
            messages: [
              {
                type: 'text',
                text: message,
              },
            ],
          }),
        })
      );

      // 等待所有通知發送完成（設定超時）
      const results = await Promise.allSettled(notifications);

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      console.log(`[OrderService] LINE notifications sent: ${successCount} success, ${failCount} failed`);
    } catch (error) {
      console.error('[OrderService] LINE notification error:', error);
    }
  }

  /**
   * 獲取狀態標籤
   */
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '⏳ 待處理',
      delivering: '🚚 配送中',
      completed: '✅ 已完成',
      cancelled: '❌ 已取消',
    };
    return labels[status] || status;
  }

  /**
   * 计算指定条件的营收总和
   */
  private async sumRevenueWhere(where: any): Promise<number> {
    const result = await this.db.gasOrder.aggregate({
      where: {
        ...where,
        status: { in: ['completed', 'delivering'] },
      },
      _sum: { total: true },
    });
    return result._sum.total || 0;
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
