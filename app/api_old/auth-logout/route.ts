import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 簡化版本：清除本地儲存和 session
    
    return NextResponse.json({
      success: true,
      message: '登出成功'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '登出失敗'
    }, { status: 500 })
  }
}
