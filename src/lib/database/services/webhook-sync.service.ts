/**
 * 外部系統整合服務
 * 負責與外部系統（會計系統、ERP 等）進行數據同步
 */

import { db } from '@/lib/db';
import { Result, ok, err } from '../types';

// ========================================
// 類型定義
// ========================================

export interface WebhookPayload {
  eventType: string;
  entityType: string;
  entityId: string;
  data: any;
  timestamp: string;
}

export interface WebhookResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
  duration: number;
}

export interface SyncConfig {
  retryCount: number;
  timeout: number;
  headers?: Record<string, string>;
}

// ========================================
// Webhook 同步服務
// ========================================

export class WebhookSyncService {
  /**
   * 發送 Webhook 到所有訂閱該事件的外部系統
   */
  async triggerWebhook(
    eventType: string,
    entityType: string,
    entityId: string,
    data: any
  ): Promise<Result<WebhookResult[]>> {
    try {
      // 獲取所有訂閱該事件的啟用系統
      const systems = await db.externalSystem.findMany({
        where: {
          isActive: true,
          events: {
            has: eventType,
          },
        },
      });

      if (systems.length === 0) {
        console.log(`[WebhookSync] No systems subscribed to event: ${eventType}`);
        return ok([]);
      }

      // 並行發送到所有系統
      const results = await Promise.allSettled(
        systems.map(system =>
          this.sendToSystem(system, eventType, entityType, entityId, data)
        )
      );

      // 處理結果
      const webhookResults: WebhookResult[] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason?.message || 'Unknown error',
            duration: 0,
          };
        }
      });

      return ok(webhookResults);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 發送數據到單個外部系統
   */
  private async sendToSystem(
    system: any,
    eventType: string,
    entityType: string,
    entityId: string,
    data: any
  ): Promise<WebhookResult> {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = system.retryCount || 3;

    // 構建 payload
    const payload: WebhookPayload = {
      eventType,
      entityType,
      entityId,
      data,
      timestamp: new Date().toISOString(),
    };

    // 記錄 Webhook 日誌
    const log = await db.webhookLog.create({
      data: {
        systemId: system.id,
        eventType,
        recordId: entityId,
        payload: payload as any,
        status: 'pending',
      },
    });

    // 嘗試發送（含重試）
    while (retryCount <= maxRetries) {
      try {
        const response = await this.executeRequest(system, payload);

        const duration = Date.now() - startTime;

        // 更新日誌為成功
        await db.webhookLog.update({
          where: { id: log.id },
          data: {
            status: 'success',
            statusCode: response.statusCode,
            response: response.response,
            duration,
          },
        });

        // 更新系統最後同步狀態
        await db.externalSystem.update({
          where: { id: system.id },
          data: {
            lastSyncAt: new Date(),
            lastStatus: 'success',
          },
        });

        return {
          success: true,
          statusCode: response.statusCode,
          response: response.response,
          duration,
        };
      } catch (error) {
        retryCount++;

        if (retryCount > maxRetries) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

          // 更新日誌為失敗
          await db.webhookLog.update({
            where: { id: log.id },
            data: {
              status: 'failed',
              errorMessage,
              duration,
              retryCount,
              retried: true,
            },
          });

          // 更新系統最後同步狀態
          await db.externalSystem.update({
            where: { id: system.id },
            data: {
              lastSyncAt: new Date(),
              lastStatus: 'failed',
            },
          });

          return {
            success: false,
            error: errorMessage,
            duration,
          };
        }

        // 指數退避
        await this.sleep(Math.pow(2, retryCount) * 1000);
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      duration: Date.now() - startTime,
    };
  }

  /**
   * 執行 HTTP 請求
   */
  private async executeRequest(system: any, payload: WebhookPayload): Promise<{
    statusCode: number;
    response: string;
  }> {
    const controller = new AbortController();
    const timeout = system.timeout || 30000;

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // 構建 headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(system.headers as Record<string, string> || {}),
      };

      // 新增 API Key
      if (system.apiKey) {
        headers['Authorization'] = `Bearer ${system.apiKey}`;
      }

      // 計算簽名（如果有 secret）
      if (system.apiSecret) {
        const signature = this.calculateSignature(payload, system.apiSecret);
        headers['X-Signature'] = signature;
      }

      const response = await fetch(system.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      return {
        statusCode: response.status,
        response: responseText,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 計算請求簽名
   */
  private calculateSignature(payload: any, secret: string): string {
    const crypto = require('crypto');
    const payloadStr = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadStr)
      .digest('hex');
  }

  /**
   * 延遲函數
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 獲取 Webhook 發送歷史
   */
  async getWebhookHistory(filters: {
    systemId?: string;
    eventType?: string;
    status?: string;
    limit?: number;
  }): Promise<Result<any[]>> {
    try {
      const { systemId, eventType, status, limit = 50 } = filters;

      const logs = await db.webhookLog.findMany({
        where: {
          ...(systemId && { systemId }),
          ...(eventType && { eventType }),
          ...(status && { status }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          // 如果需要關聯系統資訊
        },
      });

      return ok(logs);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 重試失敗的 Webhook
   */
  async retryFailedWebhooks(limit: number = 10): Promise<Result<{
    retried: number;
    success: number;
    failed: number;
  }>> {
    try {
      // 獲取最近的失敗 webhook
      const failedLogs = await db.webhookLog.findMany({
        where: {
          status: 'failed',
          retried: false,
          retryCount: { lt: 3 },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      let success = 0;
      let failed = 0;

      for (const log of failedLogs) {
        try {
          // 獲取系統配置
          const system = await db.externalSystem.findUnique({
            where: { id: log.systemId },
          });

          if (!system || !system.isActive) {
            failed++;
            continue;
          }

          // 重新發送
          const result = await this.sendToSystem(
            system,
            log.eventType,
            'unknown', // 從 payload 中解析
            log.recordId,
            log.payload
          );

          if (result.success) {
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      return ok({
        retried: failedLogs.length,
        success,
        failed,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// ========================================
// 單例模式
// ========================================

let serviceInstance: WebhookSyncService | null = null;

export function getWebhookSyncService(): WebhookSyncService {
  if (!serviceInstance) {
    serviceInstance = new WebhookSyncService();
  }
  return serviceInstance;
}
