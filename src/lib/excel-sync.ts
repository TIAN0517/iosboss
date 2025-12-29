// ========================================
// Excel 同步服務
// 用於從公司系統導入數據
// ========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================
// Excel 導入處理
// ========================================

export interface OrderImportData {
  orderNo: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  totalAmount: number;
  deliveryDate?: string;
  note?: string;
}

export interface CustomerImportData {
  name: string;
  phone: string;
  address: string;
  paymentType?: 'cash' | 'monthly';
  note?: string;
}

/**
 * 導入訂單數據（從 Excel）
 */
export async function importOrdersFromExcel(data: OrderImportData[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ row: number; error: string }>,
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // 查找或創建客戶
      let customer = await prisma.customer.findFirst({
        where: {
          phone: row.customerPhone,
        },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: row.customerName,
            phone: row.customerPhone,
            address: row.customerAddress,
            paymentType: row.paymentType || 'cash',
          },
        });
      }

      // 檢查訂單是否已存在
      const existingOrder = await prisma.gasOrder.findUnique({
        where: { orderNo: row.orderNo },
      });

      if (existingOrder) {
        // 更新現有訂單
        await prisma.gasOrder.update({
          where: { id: existingOrder.id },
          data: {
            totalAmount: row.totalAmount,
            note: row.note,
          },
        });
      } else {
        // 創建新訂單
        await prisma.gasOrder.create({
          data: {
            orderNo: row.orderNo,
            customerId: customer.id,
            total: row.totalAmount,
            subtotal: row.totalAmount,
            deliveryDate: row.deliveryDate ? new Date(row.deliveryDate) : null,
            note: row.note,
            status: 'pending',
            items: {
              create: await Promise.all(
                row.items.map(async (item) => {
                  // 查找產品
                  let product = await prisma.product.findFirst({
                    where: { name: item.productName },
                  });

                  if (!product) {
                    // 創建產品
                    product = await prisma.product.create({
                      data: {
                        name: item.productName,
                        code: item.productName,
                        price: item.unitPrice,
                        cost: item.unitPrice * 0.7, // 假設成本是70%
                        categoryId: (await prisma.productCategory.findFirst())?.id || '',
                      },
                    });
                  }

                  return {
                    productId: product.id,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subtotal: item.quantity * item.unitPrice,
                  };
                })
              ),
            },
          },
        });
      }

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : '未知錯誤',
      });
    }
  }

  return results;
}

/**
 * 導入客戶數據（從 Excel）
 */
export async function importCustomersFromExcel(data: CustomerImportData[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Array<{ row: number; error: string }>,
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      // 使用 upsert：存在則更新，不存在則創建
      await prisma.customer.upsert({
        where: { phone: row.phone },
        update: {
          name: row.name,
          address: row.address,
          paymentType: row.paymentType || 'cash',
          note: row.note,
        },
        create: {
          name: row.name,
          phone: row.phone,
          address: row.address,
          paymentType: row.paymentType || 'cash',
          note: row.note,
        },
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : '未知錯誤',
      });
    }
  }

  return results;
}

/**
 * 導出訂單數據（為 Excel）
 */
export async function exportOrdersForExcel(startDate?: Date, endDate?: Date) {
  const orders = await prisma.gasOrder.findMany({
    where: {
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    },
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 轉換為 Excel 友好格式
  return orders.map((order) => ({
    訂單編號: order.orderNo,
    客戶姓名: order.customer.name,
    客戶電話: order.customer.phone,
    客戶地址: order.customer.address,
    訂單金額: order.total,
    配送日期: order.deliveryDate,
    訂單狀態: order.status,
    備註: order.note,
    產品明細: order.items
      .map((item) => `${item.product.name} x${item.quantity}`)
      .join(', '),
    建立時間: order.createdAt,
  }));
}

/**
 * 導出客戶數據（為 Excel）
 */
export async function exportCustomersForExcel() {
  const customers = await prisma.customer.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return customers.map((customer) => ({
    客戶姓名: customer.name,
    聯絡電話: customer.phone,
    配送地址: customer.address,
    付款方式: customer.paymentType === 'cash' ? '現金' : '月結',
    目前餘額: customer.balance,
    備註: customer.note,
    最後訂單: customer.lastOrderAt,
  }));
}

// ========================================
// Excel 模板生成
// ========================================

/**
 * 生成訂單導入模板
 */
export function generateOrderImportTemplate() {
  return [
    {
      訂單編號: 'ORD-20241226-001',
      客戶姓名: '王小明',
      客戶電話: '0912345678',
      客戶地址: '台北市信義區忠孝東路五段123號',
      產品名稱: '瓦斯桶20公斤',
      數量: 1,
      單價: 800,
      總金額: 800,
      配送日期: '2024-12-26',
      備註: '請配送到一樓',
    },
    {
      訂單編號: 'ORD-20241226-002',
      客戶姓名: '李小華',
      客戶電話: '0923456789',
      客戶地址: '台北市大安區和平東路二段456號',
      產品名稱: '瓦斯桶20公斤',
      數量: 2,
      單價: 800,
      總金額: 1600,
      配送日期: '2024-12-26',
      備註: '電話聯絡',
    },
  ];
}

/**
 * 生成客戶導入模板
 */
export function generateCustomerImportTemplate() {
  return [
    {
      客戶姓名: '王小明',
      聯絡電話: '0912345678',
      配送地址: '台北市信義區忠孝東路五段123號',
      付款方式: '現金',
      備註: '長期客戶',
    },
    {
      客戶姓名: '李小華',
      聯絡電話: '0923456789',
      配送地址: '台北市大安區和平東路二段456號',
      付款方式: '月結',
      備註: '公司戶',
    },
  ];
}
