import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyToken, extractToken } from '@/lib/auth'

// 認證檢查輔助函數
function requireAuth(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

// 更新員工
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 可以更新員工
  if (user.role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, email, phone, role, isActive, password } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email || null
    if (phone !== undefined) updateData.phone = phone || null
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (password) {
      updateData.password = await hashPassword(password)
    }

    const updatedUser = await db.user.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating staff:', error)
    return NextResponse.json(
      { error: '更新員工失敗' },
      { status: 500 }
    )
  }
}

// 刪除員工
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 認證檢查
  const user = requireAuth(request)
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 })
  }

  // 權限檢查：只有 admin 可以刪除員工
  if (user.role !== 'admin') {
    return NextResponse.json({ error: '權限不足' }, { status: 403 })
  }

  try {
    await db.user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting staff:', error)
    return NextResponse.json(
      { error: '刪除員工失敗' },
      { status: 500 }
    )
  }
}
