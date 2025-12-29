/**
 * Database Module
 * 企业级数据库服务层 - 统一导出
 *
 * 架构层次：
 * 1. API Routes (调用 Service)
 * 2. Service Layer (业务逻辑，调用 Repository + Transaction)
 * 3. Repository Layer (数据访问，封装 Prisma)
 * 4. Prisma ORM (数据库操作)
 *
 * 横切关注点：
 * - TransactionManager: 事务管理
 * - CacheManager: 缓存管理
 * - AuditLogger: 审计日志
 */

// ==================== 核心类型 ====================

export type {
  // Result Type
  Result,
  Ok,
  Err,

  // Pagination
  PaginatedResult,
  QueryOptions,
  SortOrder,

  // Business Errors
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessError,

  // Audit
  AuditLog,
  AuditAction,

  // Cache
  CacheEntry,
  CacheOptions,

  // Transaction
  TransactionOptions,
  TransactionContext,
  IsolationLevel,
} from './types';

export { ok, err } from './types';

// ==================== 基础仓储 ====================

export { BaseRepository } from './repository';

// ==================== 业务仓储 ====================

export { CustomerRepository } from './repositories/customer.repository';
export { OrderRepository } from './repositories/order.repository';
export { ProductRepository } from './repositories/product.repository';
export { InventoryRepository } from './repositories/inventory.repository';
export { CheckRepository } from './repositories/check.repository';

// ==================== 业务服务 ====================

export {
  OrderService,
  type CreateOrderDto,
  type UpdateOrderStatusDto,
  type OrderValidationResult,
  type OrderStatistics,
} from './services/order.service';

export {
  CustomerService,
  type CreateCustomerDto,
  type UpdateCustomerDto,
  type CustomerValidationResult,
  type CustomerStatistics,
} from './services/customer.service';

// ==================== 管理器 ====================

export { TransactionManager, transactionManager } from './transaction';
export { CacheManager, cacheManager, CacheKeys } from './cache';
export { AuditLogger, auditLogger, createAuditMiddleware } from './audit';

// ==================== 便捷导出 ====================

/**
 * 使用示例：
 *
 * ```ts
 * import { db, customerRepo, orderService } from '@/lib/database'
 *
 * // 查询客户
 * const customer = await customerRepo.findByPhone('0912345678')
 *
 * // 创建订单
 * const order = await orderService.createOrder({
 *   customerId: 'xxx',
 *   items: [{ productId: 'yyy', quantity: 2 }]
 * })
 *
 * // 使用事务
 * const result = await transactionManager.run(async (tx) => {
 *   // 操作
 * })
 *
 * // 使用缓存
 * await cacheManager.set('key', data, { ttl: 300 })
 * const cached = await cacheManager.get('key')
 *
 * // 记录审计日志
 * await auditLogger.logCreate({
 *   userId: 'xxx',
 *   username: 'admin',
 *   entityType: 'Order',
 *   entityId: 'yyy',
 *   newValues: orderData,
 * })
 * ```
 */

// 默认导出 - 数据库实例
export { db as database } from '@/lib/db';
