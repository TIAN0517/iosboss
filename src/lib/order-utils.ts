/**
 * 訂單相關工具函數
 * 統一訂單處理邏輯，避免重複
 */

/**
 * 計算配送費
 * 規則：滿 2000 元免運費，否則 50 元
 */
export function calculateDeliveryFee(subtotal: number): number {
  return subtotal >= 2000 ? 0 : 50;
}

/**
 * 計算訂單總額
 */
export function calculateOrderTotal(subtotal: number, discount: number = 0, deliveryFee: number = 0): number {
  return Math.max(0, subtotal - discount) + deliveryFee;
}

/**
 * 計算折扣金額
 * @param subtotal 小計
 * @param discountRate 折扣率（0-1）
 */
export function calculateDiscount(subtotal: number, discountRate: number = 0): number {
  return subtotal * Math.max(0, Math.min(1, discountRate));
}

/**
 * 生成訂單編號
 */
export function generateOrderNo(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${year}${month}${day}${random}`;
}

/**
 * 驗證訂單項目
 */
export function validateOrderItems(items: any[]): { valid: boolean; error?: string } {
  if (!Array.isArray(items)) {
    return { valid: false, error: '訂單項目必須是陣列' };
  }

  if (items.length === 0) {
    return { valid: false, error: '請至少添加一個商品' };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!item.productId) {
      return { valid: false, error: `第 ${i + 1} 項商品缺少 ID` };
    }

    if (!item.quantity || item.quantity < 1) {
      return { valid: false, error: `第 ${i + 1} 項商品數量無效` };
    }

    if (item.quantity > 999) {
      return { valid: false, error: `第 ${i + 1} 項商品數量超過上限` };
    }
  }

  return { valid: true };
}
