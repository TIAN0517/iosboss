import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { note } = await request.json()
    
    // 簡體字轉繁體字對照表
    const conversions = {
      '补登錄': '補登錄',
      '补卡': '補卡',
      '登录': '登入',
      '账户': '帳戶',
      '密码': '密碼',
      '记录': '記錄',
      '时间': '時間',
      '小时': '小時',
      '系统': '系統',
      '维护': '維護',
      '断线': '斷線',
      '导致': '導致',
      '修复': '修復',
      '导入': '導入',
      '本地': '本地',
      '已修复': '已修復'
    }
    
    let convertedNote = note
    for (const [simplified, traditional] of Object.entries(conversions)) {
      convertedNote = convertedNote.replace(new RegExp(simplified, 'g'), traditional)
    }
    
    return NextResponse.json({
      success: true,
      original: note,
      converted: convertedNote,
      changed: note !== convertedNote
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 })
  }
}
