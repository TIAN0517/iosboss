/**
 * Inventory Repository
 * 庫存數據访问层 - 庫存管理核心逻辑
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

// ==================== 類別型定义 ====================

export interface StockAdjustmentInput {
  productId: string;
  quantity: number;  // 正数=增加，负数=减少
  type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'damage' | 'loss';
  reason: string;
  userId?: string;
}

export interface InventoryAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  status: 'low' | 'out' | 'ok';
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  createdAt: Date;
}

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValue: number;
  transactionsToday: number;
  recentTransactions: InventoryTransaction[];
}

// ==================== Inventory Repository ====================

export class InventoryRepository extends BaseRepository<any, any, any> {
  constructor() {
    super();
    this.modelName = 'inventory';
    this.includeRelations = {
      product: {
        include: {
          category: true,
        },
      },
    };
  }

  // ==================== 核心業務逻辑 ====================

  /**
   * 调整庫存（在事務中调用）
   */
  async adjustStock(data: StockAdjustmentInput): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      // 1. 獲取當前庫存
      const inventory = await tx.inventory.findUnique({
        where: { productId: data.productId },
        include: { product: true },
      });

      if (!inventory) {
        throw new NotFoundError('Inventory', data.productId);
      }

      // 2. 计算新庫存
      const newQuantity = inventory.quantity + data.quantity;

      if (newQuantity < 0) {
        throw new ValidationError(
          `Insufficient stock. Current: ${inventory.quantity}, Requested change: ${data.quantity}`
        );
      }

      // 3. 驗證產品状态
      if (!inventory.product.isActive) {
        throw new ValidationError('Cannot adjust stock for inactive product');
      }

      // 4. 更新庫存
      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: { quantity: newQuantity },
        include: this.includeRelations,
      });

      // 5. 記錄庫存变动
      await tx.inventoryTransaction.create({
        data: {
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          quantityBefore: inventory.quantity,
          quantityAfter: newQuantity,
          reason: data.reason,
        },
      });

      return {
        inventory: updated,
        previousStock: inventory.quantity,
        newStock: newQuantity,
        change: data.quantity,
      };
    });
  }

  /**
   * 批次调整庫存
   */
  async adjustStockBatch(adjustments: StockAdjustmentInput[]): Promise<Result<any[]>> {
    return this.withTransaction(async (tx) => {
      const results = [];

      for (const adjustment of adjustments) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: adjustment.productId },
        });

        if (!inventory) {
          throw new NotFoundError('Inventory', adjustment.productId);
        }

        const newQuantity = inventory.quantity + adjustment.quantity;

        if (newQuantity < 0) {
          throw new ValidationError(
            `Insufficient stock for product ${adjustment.productId}`
          );
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: newQuantity },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: adjustment.productId,
            type: adjustment.type,
            quantity: adjustment.quantity,
            quantityBefore: inventory.quantity,
            quantityAfter: newQuantity,
            reason: adjustment.reason,
          },
        });

        results.push({
          productId: adjustment.productId,
          previousStock: inventory.quantity,
          newStock: newQuantity,
          change: adjustment.quantity,
        });
      }

      return results;
    });
  }

  /**
   * 补货（采购入库）
   */
  async restock(productId: string, quantity: number, reason?: string): Promise<Result<any>> {
    if (quantity <= 0) {
      throw new ValidationError('Restock quantity must be positive');
    }

    return this.adjustStock({
      productId,
      quantity,
      type: 'purchase',
      reason: reason || `采购入库 +${quantity}`,
    });
  }

  /**
   * 损耗（报损）
   */
  async reportDamage(productId: string, quantity: number, reason?: string): Promise<Result<any>> {
    if (quantity <= 0) {
      throw new ValidationError('Damage quantity must be positive');
    }

    return this.adjustStock({
      productId,
      quantity: -quantity,
      type: 'damage',
      reason: reason || `报损 -${quantity}`,
    });
  }

  /**
   * 盘点调整
   */
  async stockAdjustment(
    productId: string,
    actualQuantity: number,
    reason?: string
  ): Promise<Result<any>> {
    const inventory = await this.prisma.inventory.findUnique({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundError('Inventory', productId);
    }

    const difference = actualQuantity - inventory.quantity;

    if (difference === 0) {
      return ok({ message: 'No adjustment needed', inventory });
    }

    return this.adjustStock({
      productId,
      quantity: difference,
      type: 'adjustment',
      reason: reason || `盘点调整: ${inventory.quantity} → ${actualQuantity}`,
    });
  }

  // ==================== 查詢方法 ====================

  /**
   * 獲取庫存告警
   */
  async getAlerts(): Promise<Result<InventoryAlert[]>> {
    try {
      const inventories = await this.prisma.inventory.findMany({
        where: {
          product: { isActive: true },
        },
        include: this.includeRelations,
      });

      const alerts: InventoryAlert[] = inventories
        .map((inv) => ({
          productId: inv.productId,
          productName: inv.product.name,
          currentStock: inv.quantity,
          minStock: inv.minStock,
          status: inv.quantity === 0 ? 'out' : inv.quantity <= inv.minStock ? 'low' : 'ok',
        }))
        .filter((alert) => alert.status !== 'ok');

      return ok(alerts.sort((a, b) => a.currentStock - b.currentStock));
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 獲取庫存統計
   */
  async getStatistics(): Promise<Result<InventoryStats>> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [totalProducts, inventories, transactionsCount, recentTransactions, valueResult] =
        await Promise.all([
          this.prisma.product.count({ where: { isActive: true } }),
          this.prisma.inventory.findMany({
            where: { product: { isActive: true } },
          }),
          this.prisma.inventoryTransaction.count({
            where: { createdAt: { gte: today } },
          }),
          this.prisma.inventoryTransaction.findMany({
            where: { createdAt: { gte: today } },
            include: { product: true },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          this.prisma.inventory.aggregate({
            _sum: { quantity: 0 },
          }),
        ]);

      const lowStockCount = inventories.filter((inv) => inv.quantity <= inv.minStock).length;
      const outOfStockCount = inventories.filter((inv) => inv.quantity === 0).length;

      // 计算庫存总值
      let totalValue = 0;
      for (const inv of inventories) {
        const product = await this.prisma.product.findUnique({
          where: { id: inv.productId },
          select: { cost: true },
        });
        if (product) {
          totalValue += inv.quantity * product.cost;
        }
      }

      return ok({
        totalProducts,
        lowStockCount,
        outOfStockCount,
        totalValue,
        transactionsToday: transactionsCount,
        recentTransactions: recentTransactions.map((t) => ({
          id: t.id,
          productId: t.productId,
          type: t.type,
          quantity: t.quantity,
          quantityBefore: t.quantityBefore,
          quantityAfter: t.quantityAfter,
          reason: t.reason || '',
          createdAt: t.createdAt,
        })),
      });
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 獲取庫存变动記錄
   */
  async getTransactions(options?: {
    productId?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Result<InventoryTransaction[]>> {
    try {
      const where: Prisma.InventoryTransactionWhereInput = {};

      if (options?.productId) {
        where.productId = options.productId;
      }

      if (options?.type) {
        where.type = options.type;
      }

      if (options?.startDate || options?.endDate) {
        where.createdAt = {};
        if (options.startDate) {
          (where.createdAt as any).gte = options.startDate;
        }
        if (options.endDate) {
          (where.createdAt as any).lte = options.endDate;
        }
      }

      const transactions = await this.prisma.inventoryTransaction.findMany({
        where,
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 100,
      });

      return ok(
        transactions.map((t) => ({
          id: t.id,
          productId: t.productId,
          type: t.type,
          quantity: t.quantity,
          quantityBefore: t.quantityBefore,
          quantityAfter: t.quantityAfter,
          reason: t.reason || '',
          createdAt: t.createdAt,
        }))
      );
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 檢查庫存是否足够
   */
  async checkAvailability(items: Array<{ productId: string; quantity: number }>): Promise<Result<{
    available: boolean;
    unavailableItems: Array<{ productId: string; requested: number; available: number }>;
  }>> {
    try {
      const unavailableItems: Array<{ productId: string; requested: number; available: number }> = [];

      for (const item of items) {
        const inventory = await this.prisma.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory) {
          unavailableItems.push({
            productId: item.productId,
            requested: item.quantity,
            available: 0,
          });
        } else if (inventory.quantity < item.quantity) {
          unavailableItems.push({
            productId: item.productId,
            requested: item.quantity,
            available: inventory.quantity,
          });
        }
      }

      return ok({
        available: unavailableItems.length === 0,
        unavailableItems,
      });
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 预留庫存（訂單創建时调用）
   */
  async reserveStock(items: Array<{ productId: string; quantity: number }>): Promise<Result<void>> {
    return this.withTransaction(async (tx) => {
      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory) {
          throw new NotFoundError('Inventory', item.productId);
        }

        if (inventory.quantity < item.quantity) {
          throw new ValidationError(
            `Insufficient stock for product ${item.productId}. Available: ${inventory.quantity}, Requested: ${item.quantity}`
          );
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: inventory.quantity - item.quantity },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: 'sale',
            quantity: -item.quantity,
            quantityBefore: inventory.quantity,
            quantityAfter: inventory.quantity - item.quantity,
            reason: '訂單预留',
          },
        });
      }

      return undefined;
    });
  }

  /**
   * 释放庫存（訂單取消时调用）
   */
  async releaseStock(items: Array<{ productId: string; quantity: number }>): Promise<Result<void>> {
    return this.withTransaction(async (tx) => {
      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });

        if (!inventory) {
          throw new NotFoundError('Inventory', item.productId);
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: inventory.quantity + item.quantity },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            type: 'return',
            quantity: item.quantity,
            quantityBefore: inventory.quantity,
            quantityAfter: inventory.quantity + item.quantity,
            reason: '訂單取消释放',
          },
        });
      }

      return undefined;
    });
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
