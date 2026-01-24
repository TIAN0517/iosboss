'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as bcrypt from 'bcrypt'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  '9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY='
)

// POST /api/auth/login - 用戶登入
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: '用戶名和密碼為必填項' },
        { status: 400 }
      )
    }

    // 查找用戶
    const user = await db.user.findUnique({
      where: { username }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用戶名或密碼錯誤' },
        { status: 401 }
      )
    }

    // 驗證密碼
    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      return NextResponse.json(
        { error: '用戶名或密碼錯誤' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: '帳號已被停用' },
        { status: 403 }
      )
    }

    // 生成 JWT token
    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    // 設置 cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error) {
    console.error('登入失敗:', error)
    return NextResponse.json(
      { error: '登入失敗' },
      { status: 500 }
    )
  }
}
