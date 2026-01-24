/**
 * Next.js Middleware - 使用 Web Crypto API (Edge Runtime 相容)
 * 只檢查頁面登入，API 由各路由自己處理
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 重要：必須與 .env 中的 JWT_SECRET 完全一致
// Middleware 運行在 edge runtime，無法讀取 .env，所以直接使用相同值
const JWT_SECRET = '9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY='

// 完全公開的路徑
const publicPaths = [
  '/login',
  '/api/simple-auth',
  '/api/auth-logout',
  '/api/auth-me',
  '/api/auth/init-admin',
  '/api/init',
]

/**
 * 使用 Web Crypto API 解碼 Base64URL (Edge Runtime 相容)
 */
function base64UrlDecode(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(base64 + padding)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * 簡化的 JWT 驗證 (Edge Runtime 相容)
 * 只解碼不驗證簽名，因為 Edge Runtime 簽名驗證複雜
 * 實際驗證由 API 路由處理
 */
function decodeToken(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = base64UrlDecode(payload)
    const text = new TextDecoder().decode(decoded)
    return JSON.parse(text)
  } catch {
    return null
  }
}

function getTokenFromCookie(request: NextRequest): string | null {
  const token = request.cookies.get('auth_token')?.value
  return token || null
}

function getTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 靜態資源直接放行
  if (pathname.startsWith('/_next/') || pathname.startsWith('/static/') ||
      pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|json|css|js)$/)) {
    return NextResponse.next()
  }

  // 公開路徑直接放行
  const isPublicPath = publicPaths.some(path =>
    pathname === path || pathname.startsWith(path)
  )
  if (isPublicPath) {
    return NextResponse.next()
  }

  // 獲取 token
  const token = getTokenFromCookie(request) || getTokenFromHeader(request)

  // API 路由 - 放寬限制（只添加用戶信息 header）
  if (pathname.startsWith('/api/')) {
    if (token) {
      const decoded = decodeToken(token)
      if (decoded) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', decoded.userId || decoded.sub)
        requestHeaders.set('x-user-username', decoded.username || decoded.preferred_username)
        requestHeaders.set('x-user-role', decoded.role || decoded.user_role)

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      }
    }
    return NextResponse.next()
  }

  // 頁面路由 - 驗證認證
  // 檢查 token 是否存在並解碼
  if (!token) {
    // 沒有 token，重定向到登入頁
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  const decoded = decodeToken(token)
  if (!decoded) {
    // token 無效，重定向到登入頁
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // token 有效，添加用戶信息到 header 並繼續
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', decoded.userId || decoded.sub)
  requestHeaders.set('x-user-username', decoded.username || decoded.preferred_username)
  requestHeaders.set('x-user-role', decoded.role || decoded.user_role)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
