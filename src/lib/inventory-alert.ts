// ========================================
// 庫存警告工具
// ========================================

import { db } from './db';

// ========================================
// 配置
// ========================================

// 預設庫存警告線
export const DEFAULT_MIN_STOCK_ALERT_LEVEL = 10;

// 從環境變量讀取警告線
export const MIN_STOCK_ALERT_LEVEL = parseInt(process.env.MIN_STOCK_ALERT_LEVEL || String(DEFAULT_MIN_STOCK_ALERT_LEVEL), 10);

// ========================================
// 類型定義
// ========================================

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentQuantity: number;
  minLevel: number;
  unit: string;
}

export interface InventoryAlertSummary {
  total: number;
  resolved: number;
  pending: number;
  critical: number; // 庫存為 0 的產品數量
}

// ========================================
// 庫存檢查
// ========================================

/**
 * 檢查低庫存產品
 */
export async function checkLowStockAlerts(): Promise<LowStockAlert[]> {
  const inventories = await db.inventory.findMany({
    where: {
      quantity: { lte: MIN_STOCK_ALERT_LEVEL },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          unit: true,
          isActive: true,
        },
      },
    },
  });

  // 過濾掉已停用的產品
  const alerts: LowStockAlert[] = inventories
    .filter((inv) => inv.product.isActive)
    .map((inv) => ({
      productId: inv.product.id,
      productName: inv.product.name,
      currentQuantity: inv.quantity,
      minLevel: inv.minStock,
      unit: inv.product.unit,
    }));

  // 創建或更新警告記錄
  for (const alert of alerts) {
    const existingAlert = await db.inventoryAlert.findFirst({
      where: {
        productId: alert.productId,
        resolved: false,
      },
    });

    if (!existingAlert) {
      await db.inventoryAlert.create({
        data: {
          productId: alert.productId,
          quantity: alert.currentQuantity,
          alertLevel: alert.minLevel,
        },
      });
    } else {
      // 更新現有警告的數量
      await db.inventoryAlert.update({
        where: { id: existingAlert.id },
        data: { quantity: alert.currentQuantity },
      });
    }
  }

  return alerts;
}

/**
 * 檢查缺貨產品（庫存為 0）
 */
export async function checkOutOfStockProducts(): Promise<LowStockAlert[]> {
  const inventories = await db.inventory.findMany({
    where: {
      quantity: 0,
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          unit: true,
          isActive: true,
        },
      },
    },
  });

  return inventories
    .filter((inv) => inv.product.isActive)
    .map((inv) => ({
      productId: inv.product.id,
      productName: inv.product.name,
      currentQuantity: 0,
      minLevel: inv.minStock,
      unit: inv.product.unit,
    }));
}

/**
 * 獲取庫存警告摘要
 */
export async function getInventoryAlertSummary(): Promise<InventoryAlertSummary> {
  const [total, resolved, pending, critical] = await Promise.all([
    db.inventoryAlert.count(),
    db.inventoryAlert.count({ where: { resolved: true } }),
    db.inventoryAlert.count({ where: { resolved: false } }),
    db.inventory.count({ where: { quantity: 0 } }),
  ]);

  return {
    total,
    resolved,
    pending,
    critical,
  };
}

/**
 * 獲取所有未解決的庫存警告
 */
export async function getPendingAlerts() {
  return db.inventoryAlert.findMany({
    where: { resolved: false },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          code: true,
          unit: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 標記警告為已解決
 */
export async function resolveAlert(alertId: string) {
  return db.inventoryAlert.update({
    where: { id: alertId },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });
}

/**
 * 批量標記警告為已解決
 */
export async function resolveAlertsByProduct(productId: string) {
  return db.inventoryAlert.updateMany({
    where: {
      productId,
      resolved: false,
    },
    data: {
      resolved: true,
      resolvedAt: new Date(),
    },
  });
}

// ========================================
// 庫存警告通知
// ========================================

/**
 * 發送庫存警告通知
 */
export async function sendAlertNotification(alert: LowStockAlert): Promise<void> {
  // TODO: 實現通知邏輯
  // 可以整合以下通知方式：
  // 1. 推播通知
  // 2. LINE Bot 通知
  // 3. 電子郵件
  // 4. 簡訊

  console.warn('[庫存警告]', {
    產品: alert.productName,
    當前庫存: alert.currentQuantity,
    警告線: alert.minLevel,
    單位: alert.unit,
  });
}

/**
 * 批量發送庫存警告通知
 */
export async function sendBatchAlertNotifications(): Promise<void> {
  const alerts = await checkLowStockAlerts();

  for (const alert of alerts) {
    await sendAlertNotification(alert);
  }
}

// ========================================
// 庫存警告自動檢查
// ========================================

/**
 * 檢查並創建庫存警告（由定時任務或事件觸發）
 */
export async function runInventoryAlertCheck(): Promise<{
  newAlerts: number;
  totalAlerts: number;
}> {
  // 檢查低庫存
  const lowStockAlerts = await checkLowStockAlerts();

  return {
    newAlerts: lowStockAlerts.length,
    totalAlerts: lowStockAlerts.length,
  };
}

/**
 * 獲取產品的庫存狀態
 */
export async function getProductStockStatus(productId: string) {
  const inventory = await db.inventory.findUnique({
    where: { productId },
    include: { product: true },
  });

  if (!inventory) {
    return null;
  }

  const isLowStock = inventory.quantity <= MIN_STOCK_ALERT_LEVEL;
  const isOutOfStock = inventory.quantity === 0;

  return {
    productId,
    productName: inventory.product.name,
    quantity: inventory.quantity,
    minStock: inventory.minStock,
    isLowStock,
    isOutOfStock,
    status: isOutOfStock ? 'out_of_stock' : isLowStock ? 'low_stock' : 'normal',
  };
}
