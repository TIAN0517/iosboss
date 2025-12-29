/**
 * 權限驗證工具函數
 * 用於檢查用戶是否有權限執行特定操作
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, TokenPayload } from './auth'
import { logger, LogCategory } from './logger'

/**
 * 角色定義及其權限等級
 * 數字越大權限越高
 */
export const ROLE_LEVELS: Record<string, number> = {
  admin: 100,      // 管理員 - 最高權限
  accountant: 50,  // 會計
  driver: 30,      // 司機
  staff: 10,       // 一般員工 - 最低權限
}

/**
 * 角色顯示名稱
 */
export const ROLE_NAMES: Record<string, string> = {
  admin: '管理員',
  accountant: '會計',
  driver: '司機',
  staff: '員工',
}

/**
 * 權限檢查結果
 */
export interface PermissionCheck {
  allowed: boolean
  reason?: string
}

/**
 * 從請求中獲取用戶信息
 */
export function getUserFromRequest(request: NextRequest): TokenPayload | null {
  // 從 Authorization header 獲取
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    return verifyToken(token)
  }

  // 從 x-user-role header 獲取（由 middleware 設置）
  const userId = request.headers.get('x-user-id')
  const username = request.headers.get('x-user-username')
  const role = request.headers.get('x-user-role')

  if (userId && username && role) {
    return { userId, username, role }
  }

  return null
}

/**
 * 檢查用戶是否有指定角色
 */
export function hasRole(user: TokenPayload | null, requiredRole: string): boolean {
  if (!user) return false
  return user.role === requiredRole
}

/**
 * 檢查用戶是否有至少指定權限等級
 */
export function hasRoleLevel(user: TokenPayload | null, minLevel: number): boolean {
  if (!user) return false
  const userLevel = ROLE_LEVELS[user.role] || 0
  return userLevel >= minLevel
}

/**
 * 檢查是否為管理員
 */
export function isAdmin(user: TokenPayload | null): boolean {
  return hasRole(user, 'admin')
}

/**
 * 權限不足的回應
 */
export function permissionDeniedResponse(reason: string = '權限不足') {
  return NextResponse.json(
    { error: reason },
    { status: 403 }
  )
}

/**
 * 未認證的回應
 */
export function unauthorizedResponse() {
  return NextResponse.json(
    { error: '請先登入' },
    { status: 401 }
  )
}

/**
 * API 路由權限守衛 - 檢查是否已認證
 */
export function requireAuth(request: NextRequest): TokenPayload {
  const user = getUserFromRequest(request)

  if (!user) {
    logger.warn(LogCategory.SECURITY, 'Unauthorized access attempt', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      path: request.nextUrl.pathname,
    })
    throw new Error('UNAUTHORIZED')
  }

  return user
}

/**
 * API 路由權限守衛 - 檢查是否為管理員
 */
export function requireAdmin(request: NextRequest): TokenPayload {
  const user = requireAuth(request)

  if (!isAdmin(user)) {
    logger.warn(LogCategory.SECURITY, 'Admin access denied', {
      userId: user.userId,
      username: user.username,
      role: user.role,
      path: request.nextUrl.pathname,
    })
    throw new Error('FORBIDDEN')
  }

  return user
}

/**
 * API 路由權限守衛 - 檢查是否有指定角色或更高
 */
export function requireRoleLevel(request: NextRequest, minLevel: number): TokenPayload {
  const user = requireAuth(request)

  if (!hasRoleLevel(user, minLevel)) {
    logger.warn(LogCategory.SECURITY, 'Insufficient permissions', {
      userId: user.userId,
      username: user.username,
      role: user.role,
      requiredLevel: minLevel,
      path: request.nextUrl.pathname,
    })
    throw new Error('FORBIDDEN')
  }

  return user
}

/**
 * 包裝 API 處理函數，自動處理權限驗證
 */
export function withAuth(
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const user = requireAuth(request)
      return await handler(request, user)
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse()
      }
      throw error
    }
  }
}

/**
 * 包裝 API 處理函數，要求管理員權限
 */
export function withAdminAuth(
  handler: (request: NextRequest, user: TokenPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const user = requireAdmin(request)
      return await handler(request, user)
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse()
      }
      if (error.message === 'FORBIDDEN') {
        return permissionDeniedResponse()
      }
      throw error
    }
  }
}
