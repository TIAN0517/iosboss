// ========================================
// 配送單號生成工具
// ========================================
// 配送單號格式：DN202412270001
// DN: 前綴 (Delivery Number)
// 20241227: 日期 (YYYYMMDD)
// 0001: 流水號 (4位數字，每日重置)
// ========================================

import { db } from './db';

/**
 * 生成配送單號
 * 格式：DN + YYYYMMDD + 每日流水號(4位)
 * 例如：DN202412270001
 */
export async function generateDeliveryNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = 'DN';

  // 查詢今日已有配送單數量
  const todayCount = await db.gasOrder.count({
    where: {
      deliveryNumber: {
        startsWith: `${prefix}${dateStr}`
      }
    }
  });

  // 生成流水號（從0001開始）
  const sequence = String(todayCount + 1).padStart(4, '0');

  return `${prefix}${dateStr}${sequence}`;
}

/**
 * 驗證配送單號格式
 */
export function validateDeliveryNumber(deliveryNumber: string): boolean {
  // 格式：DN + 8位數字日期 + 4位流水號
  const pattern = /^DN\d{8}\d{4}$/;
  return pattern.test(deliveryNumber);
}

/**
 * 從配送單號提取日期
 */
export function extractDateFromDeliveryNumber(deliveryNumber: string): Date | null {
  if (!validateDeliveryNumber(deliveryNumber)) {
    return null;
  }

  // 提取日期部分 (DN202412270001 -> 20241227)
  const dateStr = deliveryNumber.substring(2, 10);
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // 月份從0開始
  const day = parseInt(dateStr.substring(6, 8));

  return new Date(year, month, day);
}

/**
 * 檢查配送單號是否存在
 */
export async function checkDeliveryNumberExists(deliveryNumber: string): Promise<boolean> {
  const order = await db.gasOrder.findUnique({
    where: { deliveryNumber },
    select: { id: true }
  });

  return order !== null;
}

/**
 * 根據配送單號查找訂單
 */
export async function findOrderByDeliveryNumber(deliveryNumber: string) {
  return db.gasOrder.findUnique({
    where: { deliveryNumber },
    include: {
      customer: true,
      items: {
        include: {
          product: true
        }
      },
      driver: true,
      check: true
    }
  });
}

/**
 * 獲取指定日期範圍內的配送單
 */
export async function getDeliveryNumbersByDateRange(startDate: Date, endDate: Date) {
  const startPrefix = startDate.toISOString().slice(0, 10).replace(/-/g, '');
  const endPrefix = endDate.toISOString().slice(0, 10).replace(/-/g, '');

  return db.gasOrder.findMany({
    where: {
      deliveryNumber: {
        not: null
      },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      customer: true,
      driver: true
    },
    orderBy: {
      deliveryNumber: 'asc'
    }
  });
}
