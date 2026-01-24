/**
 * 川紀客戶查詢 API
 * GET /api/integration/chuanji/customers?phone=xxx&syncLocal=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken } from '@/lib/auth';
import { chuanjiApiService } from '@/lib/integration/chuanji-api.service';
import { ChuanjiCustomerMapper } from '@/lib/integration/chuanji-mapper';

// 認證檢查
function requireAuth(request: NextRequest) {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * GET - 從川紀查詢客戶
 */
export async function GET(request: NextRequest) {
  // 認證檢查
  const user = requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 });
  }

  // 權限檢查
  if (!['admin', 'staff'].includes(user.role)) {
    return NextResponse.json({ error: '權限不足' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const syncLocal = searchParams.get('syncLocal') === 'true';

  // 電話號碼必填
  if (!phone) {
    return NextResponse.json({ error: '請提供電話號碼' }, { status: 400 });
  }

  // 標準化電話號碼
  const normalizedPhone = ChuanjiCustomerMapper.normalizePhone(phone);

  try {
    console.log(`[川紀 API] 查詢客戶: ${normalizedPhone} (使用者: ${user.name})`);

    // 從川紀查詢客戶
    const cjCustomer = await chuanjiApiService.getCustomerByPhone(normalizedPhone);

    if (!cjCustomer) {
      return NextResponse.json({
        found: false,
        message: '在川紀系統中找不到此客戶',
      });
    }

    // 如果需要同步到本地
    let localCustomerId: string | null = null;
    if (syncLocal) {
      try {
        localCustomerId = await ChuanjiCustomerMapper.syncToPostgres(cjCustomer);
      } catch (syncError) {
        console.error('[川紀 API] 同步失敗:', syncError);
        return NextResponse.json(
          { error: '查詢成功但同步失敗', details: (syncError as Error).message },
          { status: 500 }
        );
      }
    }

    // 映射到本地格式
    const localCustomer = ChuanjiCustomerMapper.mapToLocal(cjCustomer);

    return NextResponse.json({
      found: true,
      source: 'chuanji',
      customer: {
        ...localCustomer,
        id: localCustomerId,
      },
      synced: !!localCustomerId,
    });
  } catch (error) {
    console.error('[川紀 API] 查詢失敗:', error);
    return NextResponse.json(
      { error: '查詢失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}
