import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyToken, extractToken } from '@/lib/auth'
import { ApiValidator, ValidationError } from '@/lib/validation'

// 認證檢查輔助函數
function requireAuth(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

// 獲取所有員工
export async function GET(request: NextRequest) {
  try {
    // 認證檢查
    const user = requireAuth(request)
    if (!user) {
      console.warn('[/api/staff GET] No authentication token provided')
      return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
    }

    // 權限檢查：只有 admin 可以查看員工列表
    if (user.role !== 'admin') {
      console.warn('[/api/staff GET] User', user.username, 'does not have admin role, has:', user.role)
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    console.log('[/api/staff GET] Fetching staff with filters:', { role, status })

    const users = await db.user.findMany({
      where: {
        ...(role && { role }),
        ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    console.log('[/api/staff GET] Successfully fetched', users.length, 'staff members')
    return NextResponse.json(users)
  } catch (error) {
    console.error('[/api/staff GET] Error fetching staff:', error)
    return NextResponse.json(
      { error: '獲取員工列表失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// 新增員工
export async function POST(request: NextRequest) {
  try {
    // 認證檢查
    const user = requireAuth(request)
    if (!user) {
      console.warn('[/api/staff POST] No authentication token provided')
      return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
    }

    // 權限檢查：只有 admin 可以新增員工
    if (user.role !== 'admin') {
      console.warn('[/api/staff POST] User', user.username, 'does not have admin role')
      return NextResponse.json({ error: '權限不足' }, { status: 403 })
    }

    // 解析請求體
    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: '請求格式錯誤' }, { status: 400 })
    }

    console.log('[/api/staff POST] Creating staff:', body.username)

    // 使用統一驗證
    const validation = ApiValidator.validateCreateStaffRequest(body)
    if (validation.hasErrors()) {
      console.warn('[/api/staff POST] Validation failed:', validation.getErrors())
      return NextResponse.json(
        { error: validation.getFirstError() },
        { status: 400 }
      )
    }

    // 檢查帳號是否已存在
    const existingUser = await db.user.findUnique({
      where: { username: body.username },
    })

    if (existingUser) {
      console.warn('[/api/staff POST] Username already exists:', body.username)
      return NextResponse.json(
        { error: '此帳號已被使用' },
        { status: 400 }
      )
    }

    // 加密密碼
    const hashedPassword = await hashPassword(body.password)

    // 創建員工
    const newUser = await db.user.create({
      data: {
        name: body.name,
        username: body.username,
        password: hashedPassword,
        email: body.email || null,
        phone: body.phone || null,
        role: body.role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    console.log('[/api/staff POST] Successfully created staff:', newUser.username)
    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      console.warn('[/api/staff POST] Validation error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[/api/staff POST] Error creating staff:', error)
    return NextResponse.json(
      { error: '新增員工失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
