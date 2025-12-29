import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const isProduction = process.env.NODE_ENV === 'production'

    const response = NextResponse.json({
      success: true,
      message: '登出成功'
    })

    // 清除 cookie（需要匹配設置時的所有參數）
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 0, // 立即過期
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: '登出失敗' },
      { status: 500 }
    )
  }
}
