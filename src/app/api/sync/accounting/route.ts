/**
 * 會計同步 API
 * 提供會計數據同步功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAccountingSyncService } from '@/lib/database/services/accounting-sync.service';
import { getAuditLogService } from '@/lib/database/services/audit-log.service';

/**
 * POST /api/sync/accounting
 * 手動觸發會計同步
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
    const { type, id } = body

    const syncService = getAccountingSyncService();
    const auditService = getAuditLogService();

    let result;

    switch (type) {
      case 'order':
        result = await syncService.syncOrder(id);
        break;

      case 'cost':
        result = await syncService.syncCost(id);
        break;

      case 'batch':
        const batchResult = await syncService.syncPendingRecords(body.limit || 50);
        return NextResponse.json(batchResult);

      default:
        return NextResponse.json(
          { error: 'Invalid sync type' },
          { status: 400 }
        );
    }

    // 記錄審計日誌
    await auditService.log({
      action: 'system.sync',
      entityType: 'AccountingSync',
      entityId: id || 'batch',
      newValues: { type, id },
    });

    if (result.ok) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[AccountingSync] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/accounting
 * 查詢同步狀態
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const syncType = searchParams.get('type');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const syncService = getAccountingSyncService();

    const result = await syncService.getSyncStatus({
      syncType: syncType || undefined,
      status: status || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
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
    console.error('[AccountingSync] Query error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
