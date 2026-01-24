import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { records } = body
    
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
      '本地': '本地',
      'JSON': 'JSON',
      '已修复': '已修復'
    }
    
    // 轉換文字
    const convertText = (text) => {
      let converted = text
      for (const [simplified, traditional] of Object.entries(conversionMap)) {
        converted = converted.replace(new RegExp(simplified, 'g'), traditional)
      }
      return converted
    }
    
    // 處理所有記錄
    const convertedRecords = records.map(record => ({
      ...record,
      note: record.note ? convertText(record.note) : record.note
    }))
    
    return NextResponse.json({
      success: true,
      original_count: records.length,
      converted_count: convertedRecords.length,
      converted_records: convertedRecords,
      message: '簡體字轉繁體字完成'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '轉換失敗: ' + error.message
    }, { status: 400 })
  }
}
