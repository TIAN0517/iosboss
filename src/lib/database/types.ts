/**
 * 數據庫服務層 - 基礎類型定義
 * 企業級數據庫抽象層
 */

// ==================== Result 類型 ====================

/**
 * 操作結果類型 - 用於錯誤處理
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * 成功結果
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * 失敗結果
 */
export function err<E extends Error>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * 從可能拋出錯誤的函數創建 Result
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

// ==================== 分頁類別型 ====================

/**
 * 分頁參數
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * 默認分頁參數
 */
export const DEFAULT_PAGINATION: PaginationParams = {
  page: 1,
  pageSize: 20,
  orderDirection: 'desc',
};

/**
 * 分頁结果
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
 * 創建分頁结果
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

// ==================== 查詢构建器類別型 ====================

/**
 * 查詢操作符
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
 * 查詢条件
 */
export interface WhereCondition<T = any> {
  field: keyof T | string;
  operator: Operator;
  value?: any;
  values?: any[];
}

/**
 * 查詢选项
 */
export interface QueryOptions {
  where?: WhereCondition[];
  pagination?: PaginationParams;
  include?: Record<string, boolean>;
  select?: Record<string, boolean>;
}

// ==================== 事務類別型 ====================

/**
 * 事務上下文
 */
export interface TransactionContext {
  id: string;
  startTime: Date;
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}

/**
 * 事務选项
 */
export interface TransactionOptions {
  isolationLevel?: TransactionContext['isolationLevel'];
  timeout?: number;
  maxRetries?: number;
}

// ==================== 審計日誌類別型 ====================

/**
 * 審計操作類別型
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
 * 審計日誌条目
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

// ==================== 業務錯誤類別型 ====================

/**
 * 業務錯誤基類別
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
 * 驗證錯誤
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
 * 未找到錯誤
 */
export class NotFoundError extends BusinessError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

/**
 * 衝突錯誤
 */
export class ConflictError extends BusinessError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT_ERROR', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * 權限錯誤
 */
export class UnauthorizedError extends BusinessError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 禁止訪問錯誤
 */
export class ForbiddenError extends BusinessError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

// ==================== 緩存類別型 ====================

/**
 * 緩存键生成器
 */
export type CacheKeyGenerator<T> = (args: any[]) => string;

/**
 * 緩存选项
 */
export interface CacheOptions {
  ttl?: number; // 過期時間（秒）
  tags?: string[]; // 緩存標籤，用于批次失效
  key?: string; // 自訂緩存键
}

/**
 * 緩存条目
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: Date;
  tags: string[];
  createdAt: Date;
  accessedAt: Date;
  hitCount: number;
}

// ==================== 統計類別型 ====================

/**
 * 統計數據
 */
export interface Statistics {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  createdThisMonth: number;
  createdThisYear: number;
}

/**
 * 趨勢數據点
 */
export interface TrendDataPoint {
  date: Date;
  count: number;
  amount?: number;
}

/**
 * 時間范围
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
 * 日期范围參數
 */
export interface DateRangeParams {
  range: DateRange;
  startDate?: Date;
  endDate?: Date;
}
