// ========================================
// 派單管理 API
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import {
  dispatchToDriver,
  acceptDispatch,
  rejectDispatch,
  updateDispatchStatus,
  getDriverDispatches,
  getOrderDispatches,
  batchDispatch,
  DispatchStatus,
} from '@/lib/fleet-service';

/**
 * GET /api/fleet/dispatch - 獲取派單列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get('driverId');
    const orderId = searchParams.get('orderId');

    if (orderId) {
      // 獲取訂單的派單記錄
      const dispatches = await getOrderDispatches(orderId);
      return NextResponse.json({ success: true, dispatches });
    }

    if (driverId) {
      // 獲取司機的派單列表
      const dispatches = await getDriverDispatches(driverId);
      return NextResponse.json({ success: true, dispatches });
    }

    return NextResponse.json(
      { success: false, error: '需要提供 driverId 或 orderId' },
      { status: 400 }
    );
  } catch (error) {
    console.error('獲取派單錯誤:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '獲取失敗' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fleet/dispatch - 派單操作
 */
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
    const { action } = body

    switch (action) {
      case 'dispatch': {
        // 派單給司機
        const { orderId, driverId, note } = body;
        const dispatch = await dispatchToDriver({ orderId, driverId, note });
        return NextResponse.json({
          success: true,
          message: '派單成功',
          dispatch,
        });
      }

      case 'batch': {
        // 批量派單
        const { orderIds, driverId } = body;
        const results = await batchDispatch(orderIds, driverId);
        return NextResponse.json({
          success: true,
          message: '批量派單完成',
          results,
        });
      }

      case 'accept': {
        // 司機接受派單
        const { dispatchId } = body;
        const dispatch = await acceptDispatch(dispatchId);
        return NextResponse.json({
          success: true,
          message: '已接受派單',
          dispatch,
        });
      }

      case 'reject': {
        // 司機拒絕派單
        const { dispatchId, reason } = body;
        const dispatch = await rejectDispatch(dispatchId, reason);
        return NextResponse.json({
          success: true,
          message: '已拒絕派單',
          dispatch,
        });
      }

      case 'updateStatus': {
        // 更新派單狀態
        const { dispatchId, status } = body;
        if (!Object.values(DispatchStatus).includes(status)) {
          return NextResponse.json(
            { success: false, error: '無效的狀態' },
            { status: 400 }
          );
        }
        const dispatch = await updateDispatchStatus(dispatchId, status);
        return NextResponse.json({
          success: true,
          message: '狀態更新成功',
          dispatch,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: '未知的操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('派單操作錯誤:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '操作失敗' },
      { status: 500 }
    );
  }
}
