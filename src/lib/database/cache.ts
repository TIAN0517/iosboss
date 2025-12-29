/**
 * Cache Manager
 * 缓存管理器 - 提供内存缓存和分布式缓存支持
 */

import { Result, ok, err, CacheEntry, CacheOptions } from './types';

// ==================== 内存缓存实现 ====================

interface MemoryCacheStore {
  [key: string]: CacheEntry<any>;
}

export class CacheManager {
  private cache: MemoryCacheStore = {};
  private readonly defaultTTL = 300; // 5分钟
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };

  constructor() {
    // 定期清理过期缓存
    this.startCleanup();
  }

  // ==================== 基础操作 ====================

  /**
   * 获取缓存
   */
  async get<T>(key: string): Promise<Result<T | null>> {
    try {
      const entry = this.cache[key];

      if (!entry) {
        this.stats.misses++;
        return ok(null);
      }

      // 检查是否过期
      if (entry.expiresAt < new Date()) {
        delete this.cache[key];
        this.stats.evictions++;
        this.stats.misses++;
        return ok(null);
      }

      this.stats.hits++;
      entry.accessedAt = new Date();
      entry.hitCount++;

      return ok(entry.value as T);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 设置缓存
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<Result<void>> {
    try {
      const ttl = options?.ttl ?? this.defaultTTL;
      const expiresAt = new Date(Date.now() + ttl * 1000);

      this.cache[key] = {
        value,
        expiresAt,
        tags: options?.tags || [],
        createdAt: new Date(),
        accessedAt: new Date(),
        hitCount: 0,
      };

      this.stats.sets++;
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<Result<boolean>> {
    try {
      const existed = key in this.cache;
      delete this.cache[key];
      if (existed) {
        this.stats.deletes++;
      }
      return ok(existed);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<Result<void>> {
    try {
      this.cache = {};
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量获取
   */
  async getMany<T>(keys: string[]): Promise<Result<Map<string, T>>> {
    try {
      const results = new Map<string, T>();

      for (const key of keys) {
        const result = await this.get<T>(key);
        if (result.success && result.data !== null) {
          results.set(key, result.data);
        }
      }

      return ok(results);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 批量设置
   */
  async setMany<T>(
    items: Map<string, T>,
    options?: CacheOptions
  ): Promise<Result<void>> {
    try {
      for (const [key, value] of items.entries()) {
        await this.set(key, value, options);
      }
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 按标签失效缓存
   */
  async invalidateByTag(tag: string): Promise<Result<number>> {
    try {
      let count = 0;
      const now = new Date();

      for (const [key, entry] of Object.entries(this.cache)) {
        if (entry.tags.includes(tag) && entry.expiresAt > now) {
          delete this.cache[key];
          count++;
        }
      }

      return ok(count);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * 按前缀失效缓存
   */
  async invalidateByPrefix(prefix: string): Promise<Result<number>> {
    try {
      let count = 0;

      for (const key of Object.keys(this.cache)) {
        if (key.startsWith(prefix)) {
          delete this.cache[key];
          count++;
        }
      }

      return ok(count);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  // ==================== 装饰器模式 ====================

  /**
   * 缓存装饰器 - 自动缓存函数结果
   */
  cached<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options?: {
      keyPrefix?: string;
      ttl?: number;
      keyGenerator?: (...args: Parameters<T>) => string;
    }
  ): T {
    return (async (...args: Parameters<T>) => {
      // 生成缓存键
      const key = options?.keyGenerator
        ? options.keyGenerator(...args)
        : `${options?.keyPrefix || fn.name}:${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cached = await this.get(key);
      if (cached.success && cached.data !== null) {
        return cached.data;
      }

      // 执行函数
      const result = await fn(...args);

      // 存入缓存
      await this.set(key, result, { ttl: options?.ttl });

      return result;
    }) as T;
  }

  // ==================== 统计信息 ====================

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      ...this.stats,
      size: Object.keys(this.cache).length,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  // ==================== 清理机制 ====================

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of Object.entries(this.cache)) {
      if (entry.expiresAt < now) {
        delete this.cache[key];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.evictions += cleaned;
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 停止清理
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache = {};
  }
}

// ==================== 全局实例 ====================

export const cacheManager = new CacheManager();

// ==================== 缓存键生成器 ====================

export const CacheKeys = {
  // 客户缓存
  customer: (id: string) => `customer:${id}`,
  customers: (filter?: string) => `customers:${filter || 'all'}`,
  customerStats: () => 'customers:stats',

  // 订单缓存
  order: (id: string) => `order:${id}`,
  orders: (filter?: string) => `orders:${filter || 'all'}`,
  orderStats: (period?: string) => `orders:stats:${period || 'all'}`,
  todayOrders: () => 'orders:today',

  // 产品缓存
  product: (id: string) => `product:${id}`,
  products: () => 'products:all',
  inventory: (id: string) => `inventory:${id}`,
  inventoryAlerts: () => 'inventory:alerts',

  // 库存缓存
  inventory: () => 'inventory:all',
  lowStockProducts: () => 'inventory:low',

  // 统计缓存
  dashboardStats: () => 'stats:dashboard',
  revenueStats: (period: string) => `stats:revenue:${period}`,

  // 设置缓存
  settings: () => 'settings:all',
};
