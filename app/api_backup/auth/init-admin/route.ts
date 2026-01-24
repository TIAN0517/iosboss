import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// 老闆娘密碼
const ADMIN_PASSWORD = 'Uu19700413'

/**
 * 初始化老闆娘帳號 API 路由
 * 僅創建老闆娘（管理員）帳號，其他人無法登入
 */
export async function POST(request: Request) {
  try {
    // 檢查是否已有老闆娘（管理員）
    const existingAdmin = await db.user.findFirst({
      where: { role: 'admin' },
    })

    if (existingAdmin) {
      return NextResponse.json({
        success: false,
        message: '老闆娘帳號已存在',
        admin: {
          username: existingAdmin.username,
          name: existingAdmin.name,
        },
      })
    }

    // 雜湊密碼
    const hashedPassword = await hashPassword(ADMIN_PASSWORD)

    // 創建老闆娘帳號
    const admin = await db.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: '老闆娘',
        role: 'admin',
        email: 'admin@bossai.jytian.it.com',
        phone: '0912345678',
        department: 'management',
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: '老闆娘帳號已創建',
      admin: {
        username: admin.username,
        password: ADMIN_PASSWORD, // 只在創建時返回
        name: admin.name,
        email: admin.email,
      },
      warning: '⚠️ 這是老闆娘專屬帳號，請妥善保管密碼！',
    })
  } catch (error) {
    console.error('Create admin error:', error)
    return NextResponse.json(
      {
        error: '創建老闆娘帳號失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
