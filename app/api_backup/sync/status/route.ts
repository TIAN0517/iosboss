// 數據同步 API - 獲取同步狀態
import { NextRequest, NextResponse } from 'next/server';
import { getSyncStatus } from '@/lib/sync-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const status = await getSyncStatus();

    return NextResponse.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
