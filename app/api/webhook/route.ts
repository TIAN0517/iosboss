/**
 * Webhook 管理 API
 * 管理外部系統的 Webhook 配置和發送記錄
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getWebhookSyncService } from '@/lib/database/services/webhook-sync.service';
import { getAuditLogService } from '@/lib/database/services/audit-log.service';

/**
 * GET /api/webhook
 * 查詢 Webhook 發送歷史
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('systemId');
    const eventType = searchParams.get('eventType');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    const webhookService = getWebhookSyncService();
    const result = await webhookService.getWebhookHistory({
      systemId: systemId || undefined,
      eventType: eventType || undefined,
      status: status || undefined,
      limit,
    });

    if (result.ok) {
      return NextResponse.json({ data: result.data });
    } else {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Webhook] Query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhook/retry
 * 重試失敗的 Webhook
 */
export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const { limit = 10 } = body

    const webhookService = getWebhookSyncService();
    const auditService = getAuditLogService();

    const result = await webhookService.retryFailedWebhooks(limit);

    // 記錄審計日誌
    await auditService.log({
      action: 'system.webhook_retry',
      entityType: 'WebhookLog',
      entityId: 'batch',
      newValues: { limit },
    });

    if (result.ok) {
      return NextResponse.json({ data: result.data });
    } else {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Webhook] Retry error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
