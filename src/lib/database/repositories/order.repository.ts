/**
 * Order Repository
 * 訂單數據访问层 - 核心業務逻辑
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
import { generateDeliveryNumber } from '../../lib/delivery-number';

// ==================== 類別型定义 ====================

export interface OrderItemInput {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export interface OrderCreateInput {
  customerId: string;
  items: OrderItemInput[];
  deliveryDate?: Date;
  note?: string;
  checkId?: string | null;
  driverId?: string;
  deliveryFee?: number;
}

export interface OrderUpdateInput {
  status?: string;
  deliveryDate?: Date;
  driverId?: string;
  note?: string;
  checkId?: string | null;
  paidAmount?: number;
}

export interface OrderFilter {
  customerId?: string;
  status?: string;
  driverId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface OrderSummary {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

// ==================== Order Repository ====================

export class OrderRepository extends BaseRepository<any, OrderCreateInput, OrderUpdateInput> {
  constructor() {
    super();
    this.modelName = 'gasOrder';
    this.includeRelations = {
      customer: { include: { group: true } },
      items: { include: { product: true } },
      check: true,
      driver: true,
      delivery: true,
    };
  }

  // ==================== 核心業務逻辑 ====================

  /**
   * 創建訂單（带庫存檢查和扣减）
   */
  async createOrder(data: OrderCreateInput): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      // 1. 驗證客戶
      const customer = await tx.customer.findUnique({
        where: { id: data.customerId },
        include: { group: true },
      });

      if (!customer) {
        throw new NotFoundError('Customer', data.customerId);
      }

      // 2. 驗證產品并计算金额
      const itemsWithDetails = [];
      let subtotal = 0;

      for (const item of data.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true },
        });

        if (!product) {
          throw new NotFoundError('Product', item.productId);
        }

        if (!product.isActive) {
          throw new ValidationError(`Product ${product.name} is not available for sale`);
        }

        // 檢查庫存
        const inventory = product.inventory;
        const availableStock = inventory ? inventory.quantity : 0;

        if (availableStock < item.quantity) {
          throw new ValidationError(
            `Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`,
            'items'
          );
        }

        const unitPrice = item.unitPrice || product.price;
        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        itemsWithDetails.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice,
          subtotal: itemSubtotal,
        });
      }

      // 3. 计算折扣
      let discount = 0;
      if (customer.group && customer.group.discount > 0) {
        discount = subtotal * customer.group.discount;
      }

      // 4. 计算总价
      const deliveryFee = data.deliveryFee || 0;
      const total = subtotal - discount + deliveryFee;

      // 5. 生成訂單号
      const orderNo = await this.generateOrderNo(tx);

      // 5.5. 生成配送單號
      const deliveryNumber = await generateDeliveryNumber();

      // 6. 創建訂單
      const order = await tx.gasOrder.create({
        data: {
          orderNo,
          deliveryNumber, // 新增配送單號
          customerId: data.customerId,
          orderDate: new Date(),
          deliveryDate: data.deliveryDate,
          note: data.note,
          checkId: data.checkId || null,
          driverId: data.driverId || null,
          subtotal,
          discount,
          deliveryFee,
          total,
          paidAmount: 0,
          status: 'pending',
          items: {
            create: itemsWithDetails,
          },
        },
        include: {
          customer: { include: { group: true } },
          items: { include: { product: true } },
          check: true,
        },
      });

      // 7. 扣减庫存
      for (const item of data.items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (inventory) {
          const newQuantity = inventory.quantity - item.quantity;
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: newQuantity },
          });

          // 記錄庫存变动
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'sale',
              quantity: item.quantity,
              quantityBefore: inventory.quantity,
              quantityAfter: newQuantity,
              reason: `Order ${orderNo}`,
            },
          });
        }
      }

      // 8. 如果使用了支票，更新支票状态
      if (data.checkId) {
        await tx.check.update({
          where: { id: data.checkId },
          data: { orderId: order.id, customerId: data.customerId },
        });
      }

      return order;
    });
  }

  /**
   * 更新訂單状态
   */
  async updateStatus(
    orderId: string,
    status: string,
    options?: { driverId?: string; completedAt?: Date }
  ): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const order = await tx.gasOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // 状态转换驗證
      const validTransitions: Record<string, string[]> = {
        pending: ['processing', 'delivering', 'cancelled'],
        processing: ['delivering', 'cancelled'],
        delivering: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      };

      const currentStatus = order.status;
      const allowedTransitions = validTransitions[currentStatus] || [];

      if (!allowedTransitions.includes(status)) {
        throw new ValidationError(
          `Cannot transition from ${currentStatus} to ${status}`
        );
      }

      // 更新訂單状态
      const updateData: any = { status };

      if (status === 'completed' && options?.completedAt) {
        updateData.completedAt = options.completedAt;
      }

      if (options?.driverId) {
        updateData.driverId = options.driverId;
      }

      const updated = await tx.gasOrder.update({
        where: { id: orderId },
        data: updateData,
        include: this.includeRelations,
      });

      return updated;
    });
  }

  /**
   * 確認配送（確認訂單開始配送）
   * 檢查庫存並更新訂單狀態
   */
  async confirmDelivery(
    orderId: string,
    options?: { driverId?: string; note?: string }
  ): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      // 1. 獲取訂單詳情
      const order = await tx.gasOrder.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: { include: { inventory: true } } } },
          customer: true,
        },
      });

      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // 2. 檢查訂單狀態
      if (order.status === 'completed' || order.status === 'cancelled') {
        throw new ValidationError(
          `Cannot confirm delivery for order with status ${order.status}`
        );
      }

      // 3. 檢查庫存是否足夠（以防庫存數據不一致）
      for (const item of order.items) {
        const inventory = item.product.inventory;
        const currentStock = inventory ? inventory.quantity : 0;

        if (currentStock < 0) {
          throw new ValidationError(
            `庫存異常: ${item.product.name} 庫存為負數 (${currentStock})`,
            'inventory'
          );
        }
      }

      // 4. 更新訂單狀態為配送中
      const updateData: any = {
        status: 'delivering',
      };

      if (options?.driverId) {
        updateData.driverId = options.driverId;
      }

      // 5. 創建配送記錄（如果不存在）
      let deliveryRecord;
      if (!order.delivery) {
        deliveryRecord = await tx.deliveryRecord.create({
          data: {
            orderId: order.id,
            customerId: order.customerId,
            userId: options?.driverId || order.driverId,
            deliveryDate: new Date(),
            status: 'delivering',
            note: options?.note || order.note,
          },
        });
      }

      const updated = await tx.gasOrder.update({
        where: { id: orderId },
        data: updateData,
        include: this.includeRelations,
      });

      return ok({
        ...updated,
        deliveryRecord,
      });
    });
  }

  /**
   * 完成配送（訂單完成，計算欠款）
   */
  async completeDelivery(
    orderId: string,
    options?: { actualQuantity?: Record<string, number>; note?: string }
  ): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const order = await tx.gasOrder.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { product: true } },
          customer: true,
          delivery: true,
        },
      });

      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // 1. 計算欠款
      let debtAmount = 0;
      if (order.customer.paymentType === 'monthly') {
        debtAmount = order.total - (order.paidAmount || 0);
      }

      // 2. 更新訂單狀態
      const updated = await tx.gasOrder.update({
        where: { id: orderId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
        include: this.includeRelations,
      });

      // 3. 更新配送記錄
      if (order.delivery) {
        await tx.deliveryRecord.update({
          where: { id: order.delivery.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            note: options?.note,
          },
        });
      }

      // 4. 更新客戶欠款（如果是月結客戶）
      if (debtAmount > 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            balance: { increment: debtAmount },
          },
        });
      }

      return ok(updated);
    });
  }

  /**
   * 刪除訂單（恢復庫存）
   */
  async deleteOrder(orderId: string): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const order = await tx.gasOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new NotFoundError('Order', orderId);
      }

      // 只允许刪除 pending 状态的訂單
      if (order.status !== 'pending') {
        throw new ValidationError(
          `Cannot delete order with status ${order.status}. Only pending orders can be deleted.`
        );
      }

      // 恢復庫存
      for (const item of order.items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (inventory) {
          const newQuantity = inventory.quantity + item.quantity;
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: newQuantity },
          });

          // 記錄庫存变动
          await tx.inventoryTransaction.create({
            data: {
              productId: item.productId,
              type: 'return',
              quantity: item.quantity,
              quantityBefore: inventory.quantity,
              quantityAfter: newQuantity,
              reason: `Cancelled order ${order.orderNo}`,
            },
          });
        }
      }

      // 刪除訂單项
      await tx.gasOrderItem.deleteMany({
        where: { orderId },
      });

      // 刪除訂單
      const deleted = await tx.gasOrder.delete({
        where: { id: orderId },
      });

      return deleted;
    });
  }

  // ==================== 查詢方法 ====================

  /**
   * 獲取訂單摘要
   */
  async getSummary(options?: {
    startDate?: Date;
    endDate?: Date;
    customerId?: string;
  }): Promise<Result<OrderSummary>> {
    try {
      const where: Prisma.GasOrderWhereInput = {};

      if (options?.customerId) {
        where.customerId = options.customerId;
      }

      if (options?.startDate || options?.endDate) {
        where.orderDate = {};
        if (options.startDate) {
          (where.orderDate as any).gte = options.startDate;
        }
        if (options.endDate) {
          (where.orderDate as any).lte = options.endDate;
        }
      }

      const [total, pending, completed, cancelled, revenueResult] = await Promise.all([
        this.prisma.gasOrder.count({ where }),
        this.prisma.gasOrder.count({ where: { ...where, status: 'pending' } }),
        this.prisma.gasOrder.count({ where: { ...where, status: 'completed' } }),
        this.prisma.gasOrder.count({ where: { ...where, status: 'cancelled' } }),
        this.prisma.gasOrder.aggregate({
          where: { ...where, status: { in: ['completed', 'delivering'] } },
          _sum: { total: true },
        }),
      ]);

      const summary: OrderSummary = {
        totalOrders: total,
        pendingOrders: pending,
        completedOrders: completed,
        cancelledOrders: cancelled,
        totalRevenue: revenueResult._sum.total || 0,
        averageOrderValue: total > 0 ? (revenueResult._sum.total || 0) / total : 0,
      };

      return ok(summary);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 獲取待配送訂單
   */
  async getPendingDelivery(): Promise<Result<any[]>> {
    try {
      const orders = await this.prisma.gasOrder.findMany({
        where: {
          status: { in: ['pending', 'processing', 'delivering'] },
        },
        include: this.includeRelations,
        orderBy: { orderDate: 'asc' },
      });
      return ok(orders);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 獲取司机訂單
   */
  async getDriverOrders(driverId: string): Promise<Result<any[]>> {
    try {
      const orders = await this.prisma.gasOrder.findMany({
        where: {
          driverId,
          status: { in: ['delivering', 'pending'] },
        },
        include: this.includeRelations,
        orderBy: { orderDate: 'asc' },
      });
      return ok(orders);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 獲取今日訂單
   */
  async getTodayOrders(): Promise<Result<any[]>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const orders = await this.prisma.gasOrder.findMany({
        where: {
          orderDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: this.includeRelations,
        orderBy: { orderDate: 'desc' },
      });

      return ok(orders);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 高级篩選訂單
   */
  async filter(filter: OrderFilter, options?: QueryOptions): Promise<Result<any[]>> {
    try {
      const where: Prisma.GasOrderWhereInput = {};

      if (filter.customerId) {
        where.customerId = filter.customerId;
      }

      if (filter.status) {
        where.status = filter.status;
      }

      if (filter.driverId) {
        where.driverId = filter.driverId;
      }

      if (filter.startDate || filter.endDate) {
        where.orderDate = {};
        if (filter.startDate) {
          (where.orderDate as any).gte = filter.startDate;
        }
        if (filter.endDate) {
          (where.orderDate as any).lte = filter.endDate;
        }
      }

      if (filter.minAmount || filter.maxAmount) {
        where.total = {};
        if (filter.minAmount) {
          (where.total as any).gte = filter.minAmount;
        }
        if (filter.maxAmount) {
          (where.total as any).lte = filter.maxAmount;
        }
      }

      const orders = await this.prisma.gasOrder.findMany({
        where,
        include: this.includeRelations,
        orderBy: this.buildOrderBy(options),
      });

      return ok(orders);
    } catch (e) {
      return this.handleError(e);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 生成訂單号
   */
  private async generateOrderNo(tx: PrismaClient): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    // 查找今天已有多少訂單
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await tx.gasOrder.count({
      where: {
        orderDate: { gte: today },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `SO${dateStr}${sequence}`;
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
