/**
 * 統一的 API 響應格式
 * 確保所有 API 返回一致的結構
 */

import { NextResponse } from 'next/server';

export interface ApiResponseData<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class ApiResponse {
  /**
   * 成功響應
   */
  static success<T = any>(data: T, status: number = 200): NextResponse {
    const response: ApiResponseData<T> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(response, { status });
  }

  /**
   * 創建成功響應（201）
   */
  static created<T = any>(data: T): NextResponse {
    return this.success(data, 201);
  }

  /**
   * 錯誤響應
   */
  static error(message: string, status: number = 500, details?: any): NextResponse {
    const response: ApiResponseData = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(details && { details }),
    };
    return NextResponse.json(response, { status });
  }

  /**
   * 驗證錯誤（400）
   */
  static validationError(message: string): NextResponse {
    return this.error(message, 400);
  }

  /**
   * 未授權（401）
   */
  static unauthorized(message: string = '未授權訪問'): NextResponse {
    return this.error(message, 401);
  }

  /**
   * 權限不足（403）
   */
  static forbidden(message: string = '權限不足'): NextResponse {
    return this.error(message, 403);
  }

  /**
   * 資源不存在（404）
   */
  static notFound(message: string = '資源不存在'): NextResponse {
    return this.error(message, 404);
  }

  /**
   * 伺服器錯誤（500）
   */
  static serverError(message: string = '伺服器錯誤，請稍後再試'): NextResponse {
    return this.error(message, 500);
  }
}
