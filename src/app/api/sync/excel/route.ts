// ========================================
// Excel 同步 API
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import {
  importOrdersFromExcel,
  importCustomersFromExcel,
  exportOrdersForExcel,
  exportCustomersForExcel,
  generateOrderImportTemplate,
  generateCustomerImportTemplate,
} from '@/lib/excel-sync';

/**
 * GET /api/sync/excel - 導出數據或獲取模板
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // orders | customers | template
    const template = searchParams.get('template'); // order | customer

    // 獲取導入模板
    if (template === 'order') {
      return NextResponse.json({
        success: true,
        template: generateOrderImportTemplate(),
        filename: '訂單導入模板.xlsx',
      });
    }

    if (template === 'customer') {
      return NextResponse.json({
        success: true,
        template: generateCustomerImportTemplate(),
        filename: '客戶導入模板.xlsx',
      });
    }

    // 導出數據
    if (type === 'orders') {
      const startDate = searchParams.get('start')
        ? new Date(searchParams.get('start')!)
        : undefined;
      const endDate = searchParams.get('end')
        ? new Date(searchParams.get('end')!)
        : undefined;

      const data = await exportOrdersForExcel(startDate, endDate);
      return NextResponse.json({
        success: true,
        data,
        filename: `訂單_${new Date().toISOString().split('T')[0]}.xlsx`,
      });
    }

    if (type === 'customers') {
      const data = await exportCustomersForExcel();
      return NextResponse.json({
        success: true,
        data,
        filename: `客戶_${new Date().toISOString().split('T')[0]}.xlsx`,
      });
    }

    return NextResponse.json(
      { success: false, error: '請指定 type 或 template 參數' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Excel 導出錯誤:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '導出失敗' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sync/excel - 導入數據
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
    const { type, data } = body

    if (type === 'orders') {
      const result = await importOrdersFromExcel(data);
      return NextResponse.json({
        success: true,
        message: `成功導入 ${result.success} 筆訂單，失敗 ${result.failed} 筆`,
        result,
      });
    }

    if (type === 'customers') {
      const result = await importCustomersFromExcel(data);
      return NextResponse.json({
        success: true,
        message: `成功導入 ${result.success} 筆客戶，失敗 ${result.failed} 筆`,
        result,
      });
    }

    return NextResponse.json(
      { success: false, error: '請指定 type 參數 (orders/customers)' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Excel 導入錯誤:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '導入失敗' },
      { status: 500 }
    );
  }
}
