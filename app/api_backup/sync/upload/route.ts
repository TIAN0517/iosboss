// 數據同步 API - 上傳本地變更
import { NextRequest, NextResponse } from 'next/server';
import { uploadChanges } from '@/lib/sync-service';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const result = await uploadChanges();

    return NextResponse.json({
      success: result.success,
      uploaded: result.uploaded,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Sync upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
