'use client'

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as bcrypt from 'bcrypt'

// PUT /api/staff/[id] - 更新員工
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { password, name, email, phone, department, role, isActive } = body

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (department !== undefined) updateData.department = department
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive

    // 如果有新密碼，加密後更新
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    const staff = await db.user.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(staff)
  } catch (error) {
    console.error('更新員工失敗:', error)
    return NextResponse.json(
      { error: '更新員工失敗' },
      { status: 500 }
    )
  }
}

// DELETE /api/staff/[id] - 刪除員工
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db.user.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('刪除員工失敗:', error)
    return NextResponse.json(
      { error: '刪除員工失敗' },
      { status: 500 }
    )
  }
}
