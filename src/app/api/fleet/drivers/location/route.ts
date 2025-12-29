// ========================================
// 司機位置追蹤 API
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import {
  updateDriverLocation,
  getDriverLatestLocation,
  getAllDriverLocations,
  DriverLocationHistory,
} from '@/lib/fleet-service';

/**
 * GET /api/fleet/drivers/location - 獲取司機位置
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const driverId = searchParams.get('driverId');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    // 獲取所有司機位置
    if (!driverId) {
      const locations = await getAllDriverLocations();
      return NextResponse.json({ success: true, locations });
    }

    // 獲取歷史軌跡
    if (startTime && endTime) {
      const history = await DriverLocationHistory(
        driverId,
        new Date(startTime),
        new Date(endTime)
      );
      return NextResponse.json({ success: true, history });
    }

    // 獲取最新位置
    const location = await getDriverLatestLocation(driverId);
    return NextResponse.json({ success: true, location });
  } catch (error) {
    console.error('獲取司機位置錯誤:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '獲取失敗' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/fleet/drivers/location - 更新司機位置（司機APP調用）
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
    const { driverId, latitude, longitude, accuracy, speed, heading, address, note } = body

    if (!driverId || !latitude || !longitude) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數' },
        { status: 400 }
      );
    }

    const location = await updateDriverLocation({
      driverId,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      address,
      note,
    });

    return NextResponse.json({
      success: true,
      message: '位置更新成功',
      location,
    });
  } catch (error) {
    console.error('更新司機位置錯誤:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '更新失敗' },
      { status: 500 }
    );
  }
}
