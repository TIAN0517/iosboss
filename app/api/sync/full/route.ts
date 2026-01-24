// 數據同步 API - 完整同步（上傳 + 下載）
import { NextRequest, NextResponse } from 'next/server';
import { fullSync } from '@/lib/sync-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const result = await fullSync();

    return NextResponse.json({
      success: true,
      upload: {
        uploaded: result.uploadResult.uploaded,
        failed: result.uploadResult.failed,
      },
      download: {
        downloaded: result.downloadResult.downloaded,
      },
    });
  } catch (error) {
    console.error('Full sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
