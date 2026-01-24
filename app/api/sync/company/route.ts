// ========================================
// 公司系統同步 API 路由
// ========================================

import { performSync, startSyncScheduler, stopSyncScheduler } from '@/lib/company-sync';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/sync/company - 獲取同步狀態
 */
export async function GET() {
  return NextResponse.json({
    configured: true,
    status: 'running',
    config: {
      direction: process.env.SYNC_DIRECTION || 'bidirectional',
      interval: process.env.SYNC_INTERVAL || '300',
    },
    endpoints: {
      webhook: '/api/sync/company/webhook',
      manual: '/api/sync/company/manual',
      status: '/api/sync/company/status',
    },
  });
}

/**
 * POST /api/sync/company - 同步控制
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
    const { action } = body

    switch (action) {
      case 'sync':
        const result = await performSync();
        return NextResponse.json(result);

      case 'start':
        startSyncScheduler();
        return NextResponse.json({ success: true, message: '同步排程已啟動' });

      case 'stop':
        stopSyncScheduler();
        return NextResponse.json({ success: true, message: '同步排程已停止' });

      default:
        return NextResponse.json({ error: '未知的操作' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '同步失敗' },
      { status: 500 }
    );
  }
}
