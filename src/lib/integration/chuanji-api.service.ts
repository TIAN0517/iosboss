/**
 * 川紀 API 整合服務
 * 支援 REST API 和 MSSQL 直連兩種查詢方式
 */

import { mssqlConnector } from './mssql-connector';
import { ChuanjiCustomerMapper, ChuanjiCustomer } from './chuanji-mapper';

/**
 * 川紀配置
 */
export interface ChuanjiConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
  timeout: number;
}

/**
 * 川紀 API 回應格式
 */
interface ChuanjiApiResponse {
  success: boolean;
  customer?: ChuanjiCustomer;
  customers?: ChuanjiCustomer[];
  message?: string;
}

/**
 * 川紀 API 整合服務
 */
export class ChuanjiApiService {
  private config: ChuanjiConfig;

  constructor() {
    this.config = {
      enabled: process.env.CJ_ENABLED === 'true',
      apiUrl: process.env.CJ_API_URL || '',
      apiKey: process.env.CJ_API_KEY || '',
      timeout: parseInt(process.env.CJ_API_TIMEOUT || '10000'),
    };
  }

  /**
   * 檢查是否啟用
   */
  isEnabled(): boolean {
    return this.config.enabled && (this.config.apiUrl !== '' || mssqlConnector.isConnected());
  }

  /**
   * 根據電話號碼查詢客戶
   * 優先使用 REST API，失敗則查詢 MSSQL
   */
  async getCustomerByPhone(phone: string): Promise<ChuanjiCustomer | null> {
    if (!this.isEnabled()) {
      console.warn('[川紀 API] 服務未啟用');
      return null;
    }

    console.log(`[川紀 API] 查詢客戶: ${phone}`);

    // 方法一：REST API（如果配置了 URL）
    if (this.config.apiUrl) {
      try {
        const customer = await this.queryByAPI(phone);
        if (customer) {
          console.log(`[川紀 API] 從 API 找到客戶`);
          return customer;
        }
      } catch (error) {
        console.warn(`[川紀 API] API 查詢失敗，嘗試 MSSQL:`, (error as Error).message);
      }
    }

    // 方法二：MSSQL 直連
    try {
      const customer = await this.queryByMSSQL(phone);
      if (customer) {
        console.log(`[川紀 API] 從 MSSQL 找到客戶`);
        return customer;
      }
    } catch (error) {
      console.error('[川紀 API] MSSQL 查詢失敗:', error);
    }

    console.log(`[川紀 API] 未找到客戶: ${phone}`);
    return null;
  }

  /**
   * 通過 REST API 查詢客戶
   */
  private async queryByAPI(phone: string): Promise<ChuanjiCustomer | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.apiUrl}/customers/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify({ phone }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data: ChuanjiApiResponse = await response.json();

      if (data.success && data.customer) {
        return data.customer;
      }

      return null;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('API 查詢超時');
      }
      throw error;
    }
  }

  /**
   * 通過 MSSQL 查詢客戶
   * 注意：欄位名稱需要根據實際資料庫調整
   */
  private async queryByMSSQL(phone: string): Promise<ChuanjiCustomer | null> {
    // 根據實際資料庫表結構調整查詢
    const customers = await mssqlConnector.query<ChuanjiCustomer>(
      `
      SELECT TOP 1
        CustomerID,
        CustomerName,
        Phone,
        Address,
        PaymentType,
        Balance,
        CreditLimit,
        LastOrderDate
      FROM dbo.Customers
      WHERE Phone = @phone
         OR Tel = @phone
      ORDER BY LastOrderDate DESC
      `,
      { phone }
    );

    return customers.length > 0 ? customers[0] : null;
  }

  /**
   * 批量同步客戶
   */
  async syncCustomers(syncDate?: Date): Promise<{ synced: number; errors: string[] }> {
    if (!mssqlConnector.isConnected()) {
      throw new Error('MSSQL 未連接');
    }

    console.log('[川紀 API] 開始批量同步...');

    const errors: string[] = [];
    let synced = 0;

    try {
      // 根據實際資料庫表結構調整查詢
      const customers = await mssqlConnector.query<ChuanjiCustomer>(
        `
        SELECT
          CustomerID,
          CustomerName,
          Phone,
          Address,
          PaymentType,
          Balance,
          CreditLimit,
          LastOrderDate
        FROM dbo.Customers
        WHERE 1=1
          AND (@syncDate IS NULL OR UpdateDate >= @syncDate)
        ORDER BY UpdateDate DESC
        `,
        { syncDate: syncDate || null }
      );

      console.log(`[川紀 API] 找到 ${customers.length} 筆客戶資料`);

      // 批量同步
      const result = await ChuanjiCustomerMapper.batchSync(customers);
      synced = result.success;
      errors.push(...result.errors);

      console.log(`[川紀 API] 同步完成: 成功 ${synced}, 失敗 ${errors.length}`);
    } catch (error) {
      console.error('[川紀 API] 批量同步失敗:', error);
      throw error;
    }

    return { synced, errors };
  }

  /**
   * 測試連接
   */
  async testConnection(): Promise<{ api: boolean; mssql: boolean }> {
    const result = { api: false, mssql: false };

    // 測試 API
    if (this.config.apiUrl) {
      try {
        const response = await fetch(`${this.config.apiUrl}/health`, {
          method: 'GET',
          headers: { 'X-API-Key': this.config.apiKey },
          signal: AbortSignal.timeout(5000),
        });
        result.api = response.ok;
      } catch {
        result.api = false;
      }
    }

    // 測試 MSSQL
    try {
      await mssqlConnector.connect();
      result.mssql = mssqlConnector.isConnected();
    } catch {
      result.mssql = false;
    }

    return result;
  }
}

// 單例模式
export const chuanjiApiService = new ChuanjiApiService();
