/**
 * 川紀資料映射層
 * 將川紀系統的資料格式映射到本地 Customer 模型
 */

import { db } from '@/lib/db';

/**
 * 川紀客戶資料格式（根據實際 API/MSSQL 調整）
 */
export interface ChuanjiCustomer {
  // 常見欄位名稱（請根據實際情況調整）
  CustomerID?: string | number;
  CustomerName?: string;
  Name?: string;
  Phone?: string;
  Tel?: string;
  Address?: string;
  Addr?: string;
  PaymentType?: string;
  PayType?: string;
  Balance?: number;
  CreditLimit?: number;
  LastOrderDate?: Date | string;
  UpdateDate?: Date | string;
}

/**
 * 本地客戶資料格式
 */
export interface LocalCustomer {
  name: string;
  phone: string;
  address: string;
  paymentType: string;
  balance: number;
  creditLimit: number;
  lastOrderAt: Date | null;
}

/**
 * 川紀客戶映射器
 */
export class ChuanjiCustomerMapper {
  /**
   * 將川紀客戶資料映射到本地格式
   */
  static mapToLocal(cjCustomer: ChuanjiCustomer): LocalCustomer {
    return {
      name: this.extractName(cjCustomer),
      phone: this.normalizePhone(this.extractPhone(cjCustomer)),
      address: this.extractAddress(cjCustomer),
      paymentType: this.mapPaymentType(this.extractPaymentType(cjCustomer)),
      balance: cjCustomer.Balance || 0,
      creditLimit: cjCustomer.CreditLimit || 0,
      lastOrderAt: this.extractLastOrderDate(cjCustomer),
    };
  }

  /**
   * 提取客戶姓名
   */
  private static extractName(cjCustomer: ChuanjiCustomer): string {
    return cjCustomer.CustomerName || cjCustomer.Name || '未命名客戶';
  }

  /**
   * 提取電話號碼
   */
  private static extractPhone(cjCustomer: ChuanjiCustomer): string {
    return cjCustomer.Phone || cjCustomer.Tel || '';
  }

  /**
   * 提取地址
   */
  private static extractAddress(cjCustomer: ChuanjiCustomer): string {
    return cjCustomer.Address || cjCustomer.Addr || '';
  }

  /**
   * 提取付款類型
   */
  private static extractPaymentType(cjCustomer: ChuanjiCustomer): string {
    return cjCustomer.PaymentType || cjCustomer.PayType || 'CASH';
  }

  /**
   * 提取最後訂單日期
   */
  private static extractLastOrderDate(cjCustomer: ChuanjiCustomer): Date | null {
    if (!cjCustomer.LastOrderDate) return null;
    return new Date(cjCustomer.LastOrderDate);
  }

  /**
   * 標準化電話號碼格式
   * 移除分隔符號，將 886 開頭改為 0
   */
  static normalizePhone(phone: string): string {
    return phone
      .replace(/[-\s()]/g, '')  // 移除常見分隔符
      .replace(/^886/, '0')      // 886 → 0
      .replace(/^\+886/, '0');   // +886 → 0
  }

  /**
   * 映射付款類型
   * 支援多種常見格式
   */
  static mapPaymentType(cjType: string): string {
    const normalized = cjType.toUpperCase().trim();

    // 數字代碼映射
    if (normalized === '1' || normalized === '月結') return 'monthly';
    if (normalized === '2' || normalized === '現金') return 'cash';

    // 英文映射
    if (normalized.includes('MONTH')) return 'monthly';
    if (normalized.includes('CASH')) return 'cash';

    // 預設現金
    return 'cash';
  }

  /**
   * 將川紀客戶同步到本地 PostgreSQL
   */
  static async syncToPostgres(cjCustomer: ChuanjiCustomer): Promise<string> {
    const local = this.mapToLocal(cjCustomer);

    // 使用 upsert：存在則更新，不存在則新增
    const customer = await db.customer.upsert({
      where: { phone: local.phone },
      update: {
        name: local.name,
        address: local.address,
        paymentType: local.paymentType,
        balance: local.balance,
        creditLimit: local.creditLimit,
        lastOrderAt: local.lastOrderAt,
        updatedAt: new Date(),
      },
      create: {
        name: local.name,
        phone: local.phone,
        address: local.address,
        paymentType: local.paymentType,
        balance: local.balance,
        creditLimit: local.creditLimit,
        lastOrderAt: local.lastOrderAt,
      },
    });

    console.log(`[川紀映射] 客戶已同步: ${local.phone} (${local.name})`);
    return customer.id;
  }

  /**
   * 批量同步客戶
   */
  static async batchSync(
    cjCustomers: ChuanjiCustomer[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;

    for (const cjCustomer of cjCustomers) {
      try {
        await this.syncToPostgres(cjCustomer);
        success++;
      } catch (error) {
        const phone = this.extractPhone(cjCustomer);
        errors.push(`${phone}: ${(error as Error).message}`);
      }
    }

    return { success, failed: errors.length, errors };
  }
}
