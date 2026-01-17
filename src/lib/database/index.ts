/**
 * Database Module
 * 企業级數據庫服务层 - 統一匯出
 *
 * 架构层次：
 * 1. API Routes (调用 Service)
 * 2. Service Layer (業務逻辑，调用 Repository + Transaction)
 * 3. Repository Layer (數據访问，封装 Prisma)
 * 4. Prisma ORM (數據庫操作)
 *
 * 横切關注点：
 * - TransactionManager: 事務管理
 * - CacheManager: 緩存管理
 * - AuditLogger: 審計日誌
 */

// ==================== 核心類別型 ====================

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

// ==================== 業務仓储 ====================

export { CustomerRepository } from './repositories/customer.repository';
export { OrderRepository } from './repositories/order.repository';
export { ProductRepository } from './repositories/product.repository';
export { InventoryRepository } from './repositories/inventory.repository';
export { CheckRepository } from './repositories/check.repository';

// ==================== 業務服务 ====================

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

// ==================== 便捷匯出 ====================

/**
 * 使用範例：
 *
 * ```ts
 * import { db, customerRepo, orderService } from '@/lib/database'
 *
 * // 查詢客戶
 * const customer = await customerRepo.findByPhone('0912345678')
 *
 * // 創建訂單
 * const order = await orderService.createOrder({
 *   customerId: 'xxx',
 *   items: [{ productId: 'yyy', quantity: 2 }]
 * })
 *
 * // 使用事務
 * const result = await transactionManager.run(async (tx) => {
 *   // 操作
 * })
 *
 * // 使用緩存
 * await cacheManager.set('key', data, { ttl: 300 })
 * const cached = await cacheManager.get('key')
 *
 * // 記錄審計日誌
 * await auditLogger.logCreate({
 *   userId: 'xxx',
 *   username: 'admin',
 *   entityType: 'Order',
 *   entityId: 'yyy',
 *   newValues: orderData,
 * })
 * ```
 */

// 默认匯出 - 數據庫实例
export { db as database } from '@/lib/db';
