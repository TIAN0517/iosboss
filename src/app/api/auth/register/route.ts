'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as bcrypt from 'bcrypt'

// POST /api/auth/register - 用戶註冊
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, name, email } = body

    if (!username || !password || !name) {
      return NextResponse.json(
        { error: '用戶名、密碼和姓名為必填項' },
        { status: 400 }
      )
    }

    // 檢查用戶名是否已存在
    const existing = await db.user.findUnique({
      where: { username }
    })

    if (existing) {
      return NextResponse.json(
        { error: '用戶名已存在' },
        { status: 400 }
      )
    }

    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10)

    // 創建用戶
    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email: email || `${username}@bossai.jytian.it.com`,
        role: 'staff',
        isActive: true
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    }, { status: 201 })
  } catch (error) {
    console.error('註冊失敗:', error)
    return NextResponse.json(
      { error: '註冊失敗' },
      { status: 500 }
    )
  }
}
