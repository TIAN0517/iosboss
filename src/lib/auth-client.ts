/**
 * 前端認證工具
 * 處理 Token 儲存和 API 請求
 */

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'user_data'

export interface UserData {
  id: string
  name: string
  username: string
  role: string
}

/**
 * 保存 Token 和用戶資料
 */
export function saveAuthData(token: string, user: UserData) {
  // 保存到 localStorage 作為備用
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem('user_name', user.name)
    localStorage.setItem('user_role', user.role)
    localStorage.setItem('user_username', user.username)
  }
}

/**
 * 獲取 Token
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 獲取用戶資料
 */
export function getUserData(): UserData | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem(USER_KEY)
  if (data) {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  return null
}

/**
 * 清除認證資料
 */
export function clearAuthData() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('user_name')
    localStorage.removeItem('user_role')
    localStorage.removeItem('user_username')
  }
}

/**
 * 帶認證的 fetch 包裝器
 */
export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken()

  const headers: HeadersInit = {
    ...options.headers,
  }

  // 如果有 Token，添加到 Authorization header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * 檢查是否已登入
 */
export function isAuthenticated(): boolean {
  return !!getToken()
}
