import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * 創建最高權限管理員 API
 * 僅供首次安裝時使用
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password, name } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: '請提供帳號和密碼' },
        { status: 400 }
      )
    }

    // 檢查是否已存在
    const existingUser = await db.user.findFirst({
      where: { username },
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: '帳號已存在',
        user: {
          username: existingUser.username,
          name: existingUser.name,
          role: existingUser.role,
        },
      })
    }

    // 創建最高權限管理員
    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: {
        username,
        password: hashedPassword,
        email: `${username}@bossai.jytian.it.com`,
        name: name || '最高權限管理員',
        role: 'admin',
        phone: '0912345678',
        department: 'management',
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: '最高權限管理員帳號已創建',
      user: {
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Create super admin error:', error)
    return NextResponse.json(
      {
        error: '創建失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
