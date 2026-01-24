'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as bcrypt from 'bcrypt'

// GET /api/staff - 獲取所有員工
export async function GET(request: NextRequest) {
  try {
    const staff = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error('獲取員工列表失敗:', error)
    return NextResponse.json(
      { error: '獲取員工列表失敗' },
      { status: 500 }
    )
  }
}

// POST /api/staff - 創建新員工
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password, name, email, phone, department, role } = body

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

    const staff = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        email: email || null,
        phone: phone || null,
        department: department || null,
        role: role || 'staff',
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        department: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    })

    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('創建員工失敗:', error)
    return NextResponse.json(
      { error: '創建員工失敗' },
      { status: 500 }
    )
  }
}
