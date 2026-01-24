/**
 * 川紀批量同步 API
 * POST /api/integration/chuanji/sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';
import { chuanjiApiService } from '@/lib/integration/chuanji-api.service';

// 認證檢查
function requireAuth(request: NextRequest) {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * POST - 手動觸發批量同步
 */
export async function POST(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 });
  }

  // 權限檢查：只有 admin 可以執行同步
  if (user.role !== 'admin') {
    return NextResponse.json({ error: '權限不足，僅管理員可執行同步' }, { status: 403 });
  }

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
    const { syncDate } = body

    console.log(`[川紀 API] 開始批量同步 (使用者: ${user.name})`);

    const result = await chuanjiApiService.syncCustomers(
      syncDate ? new Date(syncDate) : undefined
    );

    return NextResponse.json({
      success: true,
      synced: result.synced,
      failed: result.errors.length,
      errors: result.errors,
      message: `同步完成：成功 ${result.synced} 筆，失敗 ${result.errors.length} 筆`,
    });
  } catch (error) {
    console.error('[川紀 API] 批量同步失敗:', error);
    return NextResponse.json(
      { error: '同步失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET - 獲取同步狀態
 */
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 });
  }

  try {
    // 測試連接狀態
    const connectionStatus = await chuanjiApiService.testConnection();

    return NextResponse.json({
      enabled: chuanjiApiService.isEnabled(),
      connection: connectionStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: '狀態檢查失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}
