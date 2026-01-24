import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // 簡化版本：檢查 localStorage 中是否有登入資料
    // 在實際應用中，這應該從 JWT token 或 session 中獲取用戶資訊
    
    // 這裡可以從請求 header 中解析 token
    // 或者從 cookies 中獲取 session 資訊
    
    return NextResponse.json({
      success: true,
      user: {
        id: '1',
        username: 'admin',
        name: '管理員',
        role: 'admin'
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '未登入'
    }, { status: 401 })
  }
}
