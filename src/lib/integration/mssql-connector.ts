/**
 * MSSQL 連接池管理器
 * 用於連接川紀系統的 MSSQL 資料庫
 */

import sql from 'mssql';

export interface MSSQLConfig {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  domain?: string;              // Windows 域名
  useWindowsAuth: boolean;      // 是否使用 Windows 驗證
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
    enableArithAbort: boolean;
  };
  pool: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
  };
}

class MSSQLConnector {
  private pool: sql.ConnectionPool | null = null;
  private config: MSSQLConfig;

  constructor() {
    this.config = {
      server: process.env.CJ_MSSQL_HOST || 'localhost',
      port: parseInt(process.env.CJ_MSSQL_PORT || '1433'),
      database: process.env.CJ_MSSQL_DATABASE || '',
      user: process.env.CJ_MSSQL_USER || '',
      password: process.env.CJ_MSSQL_PASSWORD || '',
      domain: process.env.CJ_MSSQL_DOMAIN || undefined,
      useWindowsAuth: process.env.CJ_MSSQL_USE_WINDOWS_AUTH === 'true',
      options: {
        encrypt: process.env.CJ_MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.CJ_MSSQL_TRUST_CERT === 'true',
        enableArithAbort: true,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  /**
   * 建立連接池
   */
  async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    try {
      // 建構連接配置
      const config: sql.config = {
        server: this.config.server,
        port: this.config.port,
        database: this.config.database,
        options: this.config.options,
        pool: this.config.pool,
      };

      // Windows 身份驗證
      if (this.config.useWindowsAuth) {
        config.authentication = {
          type: 'ntlm',
          options: {
            domain: this.config.domain || '',
            user: this.config.user,
            password: this.config.password,
          },
        };
      } else {
        // SQL Server 身份驗證
        config.user = this.config.user;
        config.password = this.config.password;
      }

      this.pool = await sql.connect(config);
      console.log('[MSSQL] 連接池已建立');
    } catch (error) {
      console.error('[MSSQL] 連接失敗:', error);
      throw error;
    }
  }

  /**
   * 執行查詢
   */
  async query<T = any>(sqlText: string, params?: Record<string, any>): Promise<T[]> {
    await this.connect();

    const request = this.pool!.request();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    try {
      const result = await request.query(sqlText);
      return result.recordset;
    } catch (error) {
      console.error('[MSSQL] 查詢失敗:', sqlText, error);
      throw error;
    }
  }

  /**
   * 執行預存程序
   */
  async executeProcedure(
    procedureName: string,
    params?: Record<string, any>
  ): Promise<sql.IProcedureResult<any>> {
    await this.connect();

    const request = this.pool!.request();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }

    try {
      return await request.execute(procedureName);
    } catch (error) {
      console.error('[MSSQL] 預存程序執行失敗:', procedureName, error);
      throw error;
    }
  }

  /**
   * 檢查連接狀態
   */
  isConnected(): boolean {
    return this.pool?.connected || false;
  }

  /**
   * 關閉連接池
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
      console.log('[MSSQL] 連接池已關閉');
    }
  }
}

// 單例模式
export const mssqlConnector = new MSSQLConnector();

// 類型導出
export { sql };
