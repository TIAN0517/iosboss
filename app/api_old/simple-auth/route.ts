import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // 多個預設帳號
    if (username === 'admin' && password === 'Uu19700413') {
      return NextResponse.json({
        success: true,
        message: '登入成功',
        user: {
          id: '2',
          username: 'admin',
          name: '老闆娘',
          role: 'owner'
        },
        token: 'boss-token-' + Date.now()
      })
    }

    // 超級管理員帳號
    if (username === 'bossjy' && password === 'ji394su3@@') {
      return NextResponse.json({
        success: true,
        message: '登入成功',
        user: {
          id: '3',
          username: 'bossjy',
          name: '超級管理員',
          role: 'super_admin'
        },
        token: 'super-token-' + Date.now()
      })
    }

    // 測試管理員帳號
    if (username === 'admin' && password === 'admin') {
      return NextResponse.json({
        success: true,
        message: '登入成功',
        user: {
          id: '1',
          username: 'admin',
          name: '管理員',
          role: 'admin'
        },
        token: 'test-token-' + Date.now()
      })
    }

    return NextResponse.json({
      success: false,
      error: '帳號或密碼錯誤'
    }, { status: 401 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '請求格式錯誤'
    }, { status: 400 })
  }
}
