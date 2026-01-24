// ========================================
// CSV 處理工具
// ========================================

import { db } from './db';

// ========================================
// CSV 格式定義
// ========================================

// 產品記錄 CSV 格式
export const PRODUCT_CSV_HEADERS = [
  'name',
  'code',
  'category',
  'price',
  'cost',
  'capacity',
  'unit',
  'initial_stock',
  'min_stock',
] as const;

// 客戶記錄 CSV 格式
export const CUSTOMER_CSV_HEADERS = [
  'customer_name',
  'phone',
  'address',
  'total_debt',
  'last_transaction',
  'payment_type',
  'customer_group',
] as const;

// 配送記錄 CSV 格式
export const DELIVERY_CSV_HEADERS = [
  'delivery_number',
  'order_no',
  'customer_name',
  'customer_phone',
  'delivery_date',
  'status',
  'total_amount',
  'paid_amount',
  'debt_amount',
  'driver_name',
  'note',
] as const;

// 收入記錄 CSV 格式
export const INCOME_CSV_HEADERS = [
  'date',
  'order_no',
  'customer_name',
  'amount',
  'payment_method',
  'check_number',
  'note',
] as const;

// 支出記錄 CSV 格式
export const EXPENSE_CSV_HEADERS = [
  'date',
  'category',
  'amount',
  'description',
  'note',
] as const;

// ========================================
// CSV 生成函數
// ========================================

/**
 * 生成 CSV 字符串
 */
export function generateCSV(headers: readonly string[], data: string[][]): string {
  // 添加 BOM 以支持中文
  const BOM = '\uFEFF';

  const csvRows: string[] = [];

  // 添加標題行
  csvRows.push(headers.join(','));

  // 添加數據行
  for (const row of data) {
    const escapedRow = row.map((cell) => escapeCSVCell(cell));
    csvRows.push(escapedRow.join(','));
  }

  return BOM + csvRows.join('\n');
}

/**
 * 轉義 CSV 單元格
 */
function escapeCSVCell(cell: string): string {
  if (cell === null || cell === undefined) {
    return '';
  }

  const str = String(cell);

  // 如果包含逗號、引號或換行，需要用引號包圍並轉義引號
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

// ========================================
// 產品記錄導出/導入
// ========================================

/**
 * 導出產品記錄為 CSV
 */
export async function exportProductsToCSV() {
  const products = await db.product.findMany({
    include: { category: true, inventory: true },
    orderBy: { name: 'asc' },
  });

  const csvData = products.map((p) => [
    p.name,
    p.code || '',
    p.category?.name || '',
    p.price.toString(),
    p.cost.toString(),
    p.capacity || '',
    p.unit,
    p.inventory?.quantity.toString() || '0',
    p.inventory?.minStock.toString() || '10',
  ]);

  return generateCSV(PRODUCT_CSV_HEADERS, csvData);
}

/**
 * 從 CSV 導入產品記錄（批量上架）
 */
export async function importProductsFromCSV(csvData: string) {
  const rows = parseCSV(csvData);
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ row: number; error: string }>,
  };

  // 跳過標題行
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    try {
      // 查找或創建分類
      let categoryId: string | null = null;
      if (row[2]) {
        // category
        const category = await db.productCategory.upsert({
          where: { name: row[2] },
          update: {},
          create: { name: row[2], displayName: row[2] },
        });
        categoryId = category.id;
      }

      const price = parseFloat(row[3]) || 0;
      const cost = parseFloat(row[4]) || 0;
      const initialStock = parseInt(row[7]) || 0;
      const minStock = parseInt(row[8]) || 10;

      // 創建或更新產品
      const product = await db.product.upsert({
        where: { code: row[1] || `AUTO-${Date.now()}-${i}` },
        update: {
          name: row[0],
          price,
          cost,
          capacity: row[5],
          unit: row[6] || '個',
          categoryId,
          isActive: true,
        },
        create: {
          name: row[0],
          code: row[1] || `AUTO-${Date.now()}-${i}`,
          price,
          cost,
          capacity: row[5],
          unit: row[6] || '個',
          categoryId,
          isActive: true,
        },
      });

      // 處理庫存
      if (initialStock > 0) {
        await db.inventory.upsert({
          where: { productId: product.id },
          update: {
            quantity: initialStock,
            minStock,
          },
          create: {
            productId: product.id,
            quantity: initialStock,
            minStock,
          },
        });

        // 記錄庫存交易（採購入庫）
        await db.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: 'purchase',
            quantity: initialStock,
            quantityBefore: 0,
            quantityAfter: initialStock,
            reason: `CSV 批量上架: ${product.name}`,
          },
        });
      }

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

// ========================================
// 客戶記錄導出
// ========================================

/**
 * 導出客戶記錄為 CSV
 */
export async function exportCustomersToCSV() {
  const customers = await db.customer.findMany({
    include: { group: true },
    orderBy: { name: 'asc' },
  });

  const csvData = customers.map((c) => [
    c.name,
    c.phone,
    c.address,
    c.balance?.toString() || '0',
    c.lastOrderAt?.toISOString() || '',
    c.paymentType,
    c.group?.name || '',
  ]);

  return generateCSV(CUSTOMER_CSV_HEADERS, csvData);
}

/**
 * 從 CSV 導入客戶記錄
 */
export async function importCustomersFromCSV(csvData: string) {
  const rows = parseCSV(csvData);
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ row: number; error: string }>,
  };

  // 跳過標題行
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    try {
      // 查找或創建客戶分組
      let groupId: string | null = null;
      if (row[6]) {
        // customer_group
        const group = await db.customerGroup.upsert({
          where: { name: row[6] },
          update: {},
          create: { name: row[6], discount: 0 },
        });
        groupId = group.id;
      }

      // 創建或更新客戶
      await db.customer.upsert({
        where: { phone: row[1] },
        update: {
          name: row[0],
          address: row[2],
          paymentType: row[5] as 'cash' | 'monthly',
          groupId,
        },
        create: {
          name: row[0],
          phone: row[1],
          address: row[2],
          paymentType: row[5] as 'cash' | 'monthly',
          groupId,
        },
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

// ========================================
// 配送記錄導出
// ========================================

/**
 * 導出配送記錄為 CSV
 */
export async function exportDeliveriesToCSV(startDate?: Date, endDate?: Date) {
  const where: any = {
    deliveryNumber: { not: null },
  };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const orders = await db.gasOrder.findMany({
    where,
    include: {
      customer: true,
      driver: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const csvData = orders.map((o) => [
    o.deliveryNumber || '',
    o.orderNo,
    o.customer.name,
    o.customer.phone,
    o.deliveryDate?.toISOString() || '',
    o.status,
    o.total.toString(),
    o.paidAmount.toString(),
    (o.total - o.paidAmount).toString(),
    o.driver?.name || '',
    o.note || '',
  ]);

  return generateCSV(DELIVERY_CSV_HEADERS, csvData);
}

// ========================================
// 收入記錄導出
// ========================================

/**
 * 導出收入記錄為 CSV
 */
export async function exportIncomeToCSV(startDate?: Date, endDate?: Date) {
  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const orders = await db.gasOrder.findMany({
    where,
    include: {
      customer: true,
      check: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const csvData = orders.map((o) => [
    o.orderDate.toISOString(),
    o.orderNo,
    o.customer.name,
    o.total.toString(),
    o.checkId ? '支票' : '現金',
    o.check?.checkNumber || '',
    o.note || '',
  ]);

  return generateCSV(INCOME_CSV_HEADERS, csvData);
}

// ========================================
// 支出記錄導出
// ========================================

/**
 * 導出支出記錄為 CSV
 */
export async function exportExpenseToCSV(startDate?: Date, endDate?: Date) {
  const where: any = {};

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const expenses = await db.costRecord.findMany({
    where,
    include: { items: true },
    orderBy: { date: 'desc' },
  });

  const csvData = expenses.map((e) => [
    e.date.toISOString(),
    e.category,
    e.totalAmount.toString(),
    e.items.map((i) => i.description).join('; '),
    e.note || '',
  ]);

  return generateCSV(EXPENSE_CSV_HEADERS, csvData);
}

// ========================================
// CSV 解析函數
// ========================================

/**
 * 解析 CSV 字符串
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 轉義引號
        currentCell += '"';
        i++; // 跳過下一個引號
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      }
      if (char === '\r' && nextChar === '\n') {
        i++; // 跳過 \n
      }
    } else {
      currentCell += char;
    }
  }

  // 添加最後一行
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * 生成 CSV 導入模板
 */
export function generateCSVTemplate(type: 'customers' | 'deliveries'): string {
  if (type === 'customers') {
    return generateCSV(CUSTOMER_CSV_HEADERS, [
      ['客戶名稱', '0912345678', '台北市...', '0', '', 'cash', '一般客戶'],
    ]);
  } else {
    return generateCSV(DELIVERY_CSV_HEADERS, [
      ['DN202412270001', 'ORD001', '客戶名稱', '0912345678', '2024-12-27', 'pending', '1000', '0', '1000', '司機名稱', '備註'],
    ]);
  }
}
