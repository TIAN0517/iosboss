/**
 * 数据库服务层 - 基础类型定义
 * 企业级数据库抽象层
 */

// ==================== Result 类型 ====================

/**
 * 操作结果类型 - 用于错误处理
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 成功结果
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * 失败结果
 */
export function err<E extends Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * 从可能抛出错误的函数创建 Result
 */
export async function safeResult<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * 同步版本的 safeResult
 */
export function safeResultSync<T>(fn: () => T): Result<T> {
  try {
    const data = fn();
    return ok(data);
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

// ==================== 分页类型 ====================

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * 默认分页参数
 */
export const DEFAULT_PAGINATION: PaginationParams = {
  page: 1,
  pageSize: 20,
  orderDirection: 'desc',
};

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * 创建分页结果
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / params.pageSize);
  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrevious: params.page > 1,
  };
}

// ==================== 查询构建器类型 ====================

/**
 * 查询操作符
 */
export type Operator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'null'
  | 'notNull'
  | 'between'
  | 'search';

/**
 * 查询条件
 */
export interface WhereCondition<T = any> {
  field: keyof T | string;
  operator: Operator;
  value?: any;
  values?: any[];
}

/**
 * 查询选项
 */
export interface QueryOptions {
  where?: WhereCondition[];
  pagination?: PaginationParams;
  include?: Record<string, boolean>;
  select?: Record<string, boolean>;
}

// ==================== 事务类型 ====================

/**
 * 事务上下文
 */
export interface TransactionContext {
  id: string;
  startTime: Date;
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

/**
 * 事务选项
 */
export interface TransactionOptions {
  isolationLevel?: TransactionContext['isolationLevel'];
  timeout?: number;
  maxRetries?: number;
}

// ==================== 审计日志类型 ====================

/**
 * 审计操作类型
 */
export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'restore';

/**
 * 审计日志条目
 */
export interface AuditLog {
  id: string;
  userId?: string;
  username?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ==================== 业务错误类型 ====================

/**
 * 业务错误基类
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends BusinessError {
  constructor(
    message: string,
    public field?: string,
    details?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * 未找到错误
 */
export class NotFoundError extends BusinessError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

/**
 * 冲突错误
 */
export class ConflictError extends BusinessError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT_ERROR', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * 权限错误
 */
export class UnauthorizedError extends BusinessError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 禁止访问错误
 */
export class ForbiddenError extends BusinessError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

// ==================== 缓存类型 ====================

/**
 * 缓存键生成器
 */
export type CacheKeyGenerator<T> = (args: any[]) => string;

/**
 * 缓存选项
 */
export interface CacheOptions {
  ttl?: number; // 过期时间（秒）
  tags?: string[]; // 缓存标签，用于批量失效
  key?: string; // 自定义缓存键
}

/**
 * 缓存条目
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: Date;
  tags: string[];
  createdAt: Date;
  accessedAt: Date;
  hitCount: number;
}

// ==================== 统计类型 ====================

/**
 * 统计数据
 */
export interface Statistics {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  createdThisMonth: number;
  createdThisYear: number;
}

/**
 * 趋势数据点
 */
export interface TrendDataPoint {
  date: Date;
  count: number;
  amount?: number;
}

/**
 * 时间范围
 */
export type DateRange =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

/**
 * 日期范围参数
 */
export interface DateRangeParams {
  range: DateRange;
  startDate?: Date;
  endDate?: Date;
}
