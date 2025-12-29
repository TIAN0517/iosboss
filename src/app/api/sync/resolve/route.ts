// 數據同步 API - 解決衝突
import { NextRequest, NextResponse } from 'next/server';
import { resolveConflict } from '@/lib/sync-service';

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
    const { changeId, resolution } = body

    if (!changeId || !resolution) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: changeId, resolution',
        },
        { status: 400 }
      );
    }

    if (resolution !== 'local' && resolution !== 'remote') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid resolution. Must be "local" or "remote"',
        },
        { status: 400 }
      );
    }

    const result = await resolveConflict(changeId, resolution);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Resolve conflict error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
