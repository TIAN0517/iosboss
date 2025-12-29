/**
 * Product Repository
 * 产品数据访问层 - 产品管理核心逻辑
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

export interface ProductCreateInput {
  categoryId: string;
  name: string;
  code?: string;
  price: number;
  cost: number;
  capacity?: string;
  unit?: string;
  isActive?: boolean;
}

export interface ProductUpdateInput {
  categoryId?: string;
  name?: string;
  code?: string;
  price?: number;
  cost?: number;
  capacity?: string;
  unit?: string;
  isActive?: boolean;
}

export interface ProductFilter {
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  hasLowStock?: boolean;
}

// ==================== Product Repository ====================

export class ProductRepository extends BaseRepository<any, ProductCreateInput, ProductUpdateInput> {
  constructor() {
    super();
    this.modelName = 'product';
    this.includeRelations = {
      category: true,
      inventory: true,
    };
  }

  // ==================== 核心业务逻辑 ====================

  /**
   * 创建产品
   */
  async createProduct(data: ProductCreateInput): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      // 1. 验证分类
      const category = await tx.productCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new NotFoundError('ProductCategory', data.categoryId);
      }

      if (!category.isActive) {
        throw new ValidationError('Cannot create product in inactive category');
      }

      // 2. 验证价格
      if (data.price <= 0) {
        throw new ValidationError('Price must be positive');
      }

      if (data.cost < 0) {
        throw new ValidationError('Cost cannot be negative');
      }

      if (data.cost >= data.price) {
        throw new ValidationError('Cost should be less than price for profit margin');
      }

      // 3. 验证编码唯一性
      if (data.code) {
        const existing = await tx.product.findUnique({
          where: { code: data.code },
        });

        if (existing) {
          throw new ValidationError('Product code already exists');
        }
      }

      // 4. 创建产品
      const product = await tx.product.create({
        data: {
          categoryId: data.categoryId,
          name: data.name,
          code: data.code || null,
          price: data.price,
          cost: data.cost,
          capacity: data.capacity || null,
          unit: data.unit || '個',
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
        include: this.includeRelations,
      });

      // 5. 创建库存记录
      await tx.inventory.create({
        data: {
          productId: product.id,
          quantity: 0,
          minStock: 10,
        },
      });

      return product;
    });
  }

  /**
   * 更新产品
   */
  async updateProduct(productId: string, data: ProductUpdateInput): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      // 验证编码唯一性
      if (data.code && data.code !== product.code) {
        const existing = await tx.product.findUnique({
          where: { code: data.code },
        });

        if (existing) {
          throw new ValidationError('Product code already exists');
        }
      }

      // 验证价格
      const price = data.price ?? product.price;
      const cost = data.cost ?? product.cost;

      if (data.price !== undefined && data.price <= 0) {
        throw new ValidationError('Price must be positive');
      }

      if (data.cost !== undefined && data.cost < 0) {
        throw new ValidationError('Cost cannot be negative');
      }

      if (cost >= price) {
        throw new ValidationError('Cost should be less than price for profit margin');
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data,
        include: this.includeRelations,
      });

      return updated;
    });
  }

  /**
   * 删除产品（软删除 - 设为不活跃）
   */
  async deleteProduct(productId: string): Promise<Result<any>> {
    return this.withTransaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { inventory: true },
      });

      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      // 检查是否有库存
      const stock = product.inventory?.quantity || 0;
      if (stock > 0) {
        throw new BusinessError(
          `Cannot delete product with existing stock (${stock} units). Please clear inventory first.`
        );
      }

      // 检查是否有未完成的订单
      const pendingOrders = await tx.gasOrderItem.count({
        where: {
          productId,
          order: {
            status: { in: ['pending', 'processing', 'delivering'] },
          },
        },
      });

      if (pendingOrders > 0) {
        throw new BusinessError(
          `Cannot delete product with ${pendingOrders} pending orders`
        );
      }

      // 软删除
      const deactivated = await tx.product.update({
        where: { id: productId },
        data: { isActive: false },
        include: this.includeRelations,
      });

      return deactivated;
    });
  }

  // ==================== 查询方法 ====================

  /**
   * 按编码查找产品
   */
  async findByCode(code: string): Promise<Result<any | null>> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { code },
        include: this.includeRelations,
      });
      return ok(product);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取活跃产品
   */
  async getActiveProducts(): Promise<Result<any[]>> {
    try {
      const products = await this.prisma.product.findMany({
        where: { isActive: true },
        include: this.includeRelations,
        orderBy: { name: 'asc' },
      });
      return ok(products);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取低库存产品
   */
  async getLowStockProducts(): Promise<Result<any[]>> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          isActive: true,
          inventory: {
            quantity: { lte: this.prisma.inventory.fields.minStock },
          },
        },
        include: this.includeRelations,
        orderBy: {
          inventory: { quantity: 'asc' },
        },
      });
      return ok(products);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 按分类获取产品
   */
  async getByCategory(categoryId: string): Promise<Result<any[]>> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          categoryId,
          isActive: true,
        },
        include: this.includeRelations,
        orderBy: { name: 'asc' },
      });
      return ok(products);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 搜索产品
   */
  async searchProducts(query: string): Promise<Result<any[]>> {
    try {
      const products = await this.prisma.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
          ],
        },
        include: this.includeRelations,
        orderBy: { name: 'asc' },
      });
      return ok(products);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 高级筛选产品
   */
  async filter(filter: ProductFilter, options?: QueryOptions): Promise<Result<any[]>> {
    try {
      const where: Prisma.ProductWhereInput = {};

      if (filter.categoryId) {
        where.categoryId = filter.categoryId;
      }

      if (filter.isActive !== undefined) {
        where.isActive = filter.isActive;
      }

      if (filter.search) {
        where.OR = [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { code: { contains: filter.search, mode: 'insensitive' } },
        ];
      }

      if (filter.minPrice || filter.maxPrice) {
        where.price = {};
        if (filter.minPrice) {
          (where.price as any).gte = filter.minPrice;
        }
        if (filter.maxPrice) {
          (where.price as any).lte = filter.maxPrice;
        }
      }

      if (filter.hasLowStock) {
        where.inventory = {
          quantity: { lte: this.prisma.inventory.fields.minStock },
        };
      }

      const products = await this.prisma.product.findMany({
        where,
        include: this.includeRelations,
        orderBy: this.buildOrderBy(options),
      });

      return ok(products);
    } catch (e) {
      return this.handleError(e);
    }
  }

  /**
   * 获取产品统计
   */
  async getStatistics(): Promise<Result<{
    total: number;
    active: number;
    inactive: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  }>> {
    try {
      const [total, active, inactive, lowStock, outOfStock, valueResult] = await Promise.all([
        this.prisma.product.count(),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.product.count({ where: { isActive: false } }),
        this.prisma.product.count({
          where: {
            isActive: true,
            inventory: { quantity: { lte: this.prisma.inventory.fields.minStock } },
          },
        }),
        this.prisma.product.count({
          where: {
            isActive: true,
            inventory: { quantity: 0 },
          },
        }),
        this.prisma.product.aggregate({
          where: { isActive: true },
          _sum: { cost: true },
        }),
      ]);

      return ok({
        total,
        active,
        inactive,
        lowStock,
        outOfStock,
        totalValue: valueResult._sum.cost || 0,
      });
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
