/**
 * 基础 Repository 类
 * 提供通用的数据访问操作
 */

import { Prisma, PrismaClient } from '@prisma/client';
import {
  Result,
  ok,
  err,
  PaginatedResult,
  createPaginatedResult,
  PaginationParams,
  DEFAULT_PAGINATION,
  QueryOptions,
  WhereCondition,
  NotFoundError,
  ValidationError,
} from './types';
import { db } from '@/lib/db';

/**
 * Repository 基类
 * 提供标准的 CRUD 操作
 */
export abstract class BaseRepository<T, CreateInput, UpdateInput> {
  protected readonly prisma: PrismaClient;
  protected readonly modelName: string;
  protected readonly includeRelations: Record<string, boolean> = {};

  constructor(prisma: PrismaClient = db) {
    this.prisma = prisma;
  }

  // ==================== CRUD 操作 ====================

  /**
   * 根据 ID 查找记录
   */
  async findById(
    id: string,
    options?: { include?: Record<string, boolean> }
  ): Promise<Result<T | null>> {
    try {
      const data = await (this.prisma as any)[this.modelName].findUnique({
        where: { id },
        include: options?.include || this.includeRelations,
      });
      return ok(data);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 根据 ID 查找记录，不存在则抛出错误
   */
  async findByIdOrThrow(id: string): Promise<Result<T>> {
    const result = await this.findById(id);
    if (!result.success) return result;
    if (!result.data) {
      return err(new NotFoundError(this.modelName, id));
    }
    return ok(result.data);
  }

  /**
   * 查找单条记录
   */
  async findOne(
    where: Prisma.InputType<any>,
    options?: { include?: Record<string, boolean> }
  ): Promise<Result<T | null>> {
    try {
      const data = await (this.prisma as any)[this.modelName].findFirst({
        where,
        include: options?.include || this.includeRelations,
      });
      return ok(data);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 查找所有记录
   */
  async findMany(options?: QueryOptions): Promise<Result<T[]>> {
    try {
      const where = this.buildWhere(options?.where);
      const data = await (this.prisma as any)[this.modelName].findMany({
        where,
        include: options?.include || this.includeRelations,
        orderBy: this.buildOrderBy(options),
      });
      return ok(data);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 分页查询
   */
  async findPaginated(
    options: QueryOptions & { pagination: PaginationParams }
  ): Promise<Result<PaginatedResult<T>>> {
    try {
      const where = this.buildWhere(options?.where);
      const pagination = options.pagination;
      const skip = (pagination.page - 1) * pagination.pageSize;

      const [items, total] = await Promise.all([
        (this.prisma as any)[this.modelName].findMany({
          where,
          include: options?.include || this.includeRelations,
          orderBy: this.buildOrderBy(options),
          skip,
          take: pagination.pageSize,
        }),
        (this.prisma as any)[this.modelName].count({ where }),
      ]);

      return ok(createPaginatedResult(items, total, pagination));
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 创建记录
   */
  async create(data: CreateInput): Promise<Result<T>> {
    try {
      const result = await (this.prisma as any)[this.modelName].create({
        data,
        include: this.includeRelations,
      });
      return ok(result);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 批量创建记录
   */
  async createMany(data: CreateInput[]): Promise<Result<{ count: number }>> {
    try {
      const result = await (this.prisma as any)[this.modelName].createMany({
        data: data as any[],
        skipDuplicates: true,
      });
      return ok({ count: result.count });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 更新记录
   */
  async update(
    id: string,
    data: UpdateInput
  ): Promise<Result<T>> {
    try {
      // 检查记录是否存在
      const existing = await this.findById(id);
      if (!existing.success) return existing;
      if (!existing.data) {
        return err(new NotFoundError(this.modelName, id));
      }

      const result = await (this.prisma as any)[this.modelName].update({
        where: { id },
        data,
        include: this.includeRelations,
      });
      return ok(result);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 批量更新记录
   */
  async updateMany(
    where: Prisma.InputType<any>,
    data: UpdateInput
  ): Promise<Result<{ count: number }>> {
    try {
      const result = await (this.prisma as any)[this.modelName].updateMany({
        where,
        data,
      });
      return ok({ count: result.count });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 删除记录
   */
  async delete(id: string): Promise<Result<T>> {
    try {
      // 检查记录是否存在
      const existing = await this.findById(id);
      if (!existing.success) return existing;
      if (!existing.data) {
        return err(new NotFoundError(this.modelName, id));
      }

      const result = await (this.prisma as any)[this.modelName].delete({
        where: { id },
      });
      return ok(result);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 批量删除记录
   */
  async deleteMany(
    where: Prisma.InputType<any>
  ): Promise<Result<{ count: number }>> {
    try {
      const result = await (this.prisma as any)[this.modelName].deleteMany({
        where,
      });
      return ok({ count: result.count });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 统计记录数
   */
  async count(where?: Prisma.InputType<any>): Promise<Result<number>> {
    try {
      const count = await (this.prisma as any)[this.modelName].count({ where });
      return ok(count);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 检查记录是否存在
   */
  async exists(id: string): Promise<Result<boolean>> {
    const result = await this.count({ id } as any);
    if (!result.success) return result;
    return ok(result.data > 0);
  }

  // ==================== 查询构建器 ====================

  /**
   * 构建查询条件
   */
  protected buildWhere(conditions?: WhereCondition[]): Prisma.InputType<any> | undefined {
    if (!conditions || conditions.length === 0) return undefined;

    const andConditions: any[] = [];

    for (const condition of conditions) {
      const prismaCondition = this.buildCondition(condition);
      if (prismaCondition) {
        andConditions.push(prismaCondition);
      }
    }

    return andConditions.length > 0 ? { AND: andConditions } : undefined;
  }

  /**
   * 构建单个条件
   */
  protected buildCondition(condition: WhereCondition): any {
    const { field, operator, value, values } = condition;

    switch (operator) {
      case 'eq':
        return { [field]: value };
      case 'ne':
        return { [field]: { not: value } };
      case 'gt':
        return { [field]: { gt: value } };
      case 'gte':
        return { [field]: { gte: value } };
      case 'lt':
        return { [field]: { lt: value } };
      case 'lte':
        return { [field]: { lte: value } };
      case 'in':
        return { [field]: { in: values } };
      case 'notIn':
        return { [field]: { notIn: values } };
      case 'contains':
        return { [field]: { contains: value, mode: 'insensitive' } };
      case 'startsWith':
        return { [field]: { startsWith: value, mode: 'insensitive' } };
      case 'endsWith':
        return { [field]: { endsWith: value, mode: 'insensitive' } };
      case 'null':
        return { [field]: null };
      case 'notNull':
        return { [field]: { not: null } };
      case 'between':
        return { [field]: { gte: values?.[0], lte: values?.[1] } };
      case 'search':
        return {
          OR: [
            { [field]: { contains: value, mode: 'insensitive' } },
          ],
        };
      default:
        return { [field]: value };
    }
  }

  /**
   * 构建排序
   */
  protected buildOrderBy(options?: QueryOptions): Prisma.InputType<any> | undefined {
    if (!options?.pagination?.orderBy) return undefined;

    const { orderBy, orderDirection } = options.pagination;
    return { [orderBy]: orderDirection || 'desc' };
  }

  // ==================== 事务支持 ====================

  /**
   * 使用事务执行操作
   */
  async withTransaction<R>(
    fn: (tx: PrismaClient) => Promise<R>
  ): Promise<Result<R>> {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        return await fn(tx);
      });
      return ok(result);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量操作（带重试）
   */
  async batchOperation<R>(
    operations: Array<(tx: PrismaClient) => Promise<R>>,
    options?: { maxRetries?: number }
  ): Promise<Result<R[]>> {
    const maxRetries = options?.maxRetries || 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const results = await this.prisma.$transaction(async (tx) => {
          return Promise.all(operations.map(op => op(tx)));
        });
        return ok(results);
      } catch (e) {
        attempt++;
        if (attempt >= maxRetries) {
          return err(e instanceof Error ? e : new Error(String(e)));
        }
        // 指数退避
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    return err(new Error('Max retries exceeded'));
  }
}
