import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { recordId, note } = await request.json()
    
    // 簡體字轉繁體字對照表
    const conversionMap = {
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
      '本': '本',
      '地': '地',
      'JSON': 'JSON',
      '已': '已',
      '修复': '修復'
    }
    
    // 轉換簡體字為繁體字
    let convertedNote = note
    for (const [simplified, traditional] of Object.entries(conversionMap)) {
      convertedNote = convertedNote.replace(new RegExp(simplified, 'g'), traditional)
    }
    
    return NextResponse.json({
      success: true,
      original: note,
      converted: convertedNote,
      message: '簡體字轉繁體字完成'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '轉換失敗'
    }, { status: 400 })
  }
}
