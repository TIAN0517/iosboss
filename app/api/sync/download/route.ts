// 數據同步 API - 下載外部變更
import { NextRequest, NextResponse } from 'next/server';
import { downloadChanges } from '@/lib/sync-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: '請求格式錯誤' },
        { status: 400 }
      )
    }
    const { lastSyncAt } = body

    const result = await downloadChanges(lastSyncAt ? new Date(lastSyncAt) : undefined);

    return NextResponse.json({
      success: result.success,
      downloaded: result.downloaded,
      changes: result.changes,
    });
  } catch (error) {
    console.error('Sync download error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
