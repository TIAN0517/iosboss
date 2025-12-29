import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken, extractToken } from '@/lib/auth'

/**
 * 獲取當前登入用戶資訊
 * 從 HttpOnly cookie 中讀取 JWT token 並驗證
 */
export async function GET(request: Request) {
  try {
    // 從 cookie 中提取 token
    const token = extractToken(request)

    if (!token) {
      return NextResponse.json(
        { error: '未登入' },
        { status: 401 }
      )
    }

    // 驗證 JWT token
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'Token 無效或已過期' },
        { status: 401 }
      )
    }

    // 從數據庫獲取最新用戶資訊
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        email: true,
        phone: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: '用戶不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        email: user.email,
        phone: user.phone,
      },
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: '認證失敗' },
      { status: 500 }
    )
  }
}
