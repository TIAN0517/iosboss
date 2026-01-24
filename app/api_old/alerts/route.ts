import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // 模擬系統通知和警告
    const alerts = [
      {
        id: 'alert_001',
        type: 'info',
        title: '系統正常運行',
        message: '九九瓦斯行管理系統運行正常，所有服務都在線。',
        timestamp: '2026-01-18T06:30:00Z',
        read: false
      },
      {
        id: 'alert_002', 
        type: 'warning',
        title: '瓦斯價格更新',
        message: '新瓦斯價格已更新，請查看最新報價表。',
        timestamp: '2026-01-18T05:00:00Z',
        read: false
      },
      {
        id: 'alert_003',
        type: 'success',
        title: '語音服務啟動',
        message: '語音對話服務已成功啟動，支援AI語音聊天功能。',
        timestamp: '2026-01-18T04:00:00Z',
        read: true
      },
      {
        id: 'alert_004',
        type: 'info',
        title: 'MCP服務就緒',
        message: 'IDA Pro MCP服務器已準備就緒，可進行AI逆向工程分析。',
        timestamp: '2026-01-18T03:30:00Z',
        read: true
      },
      {
        id: 'alert_005',
        type: 'warning',
        title: '備份提醒',
        message: '建議定期備份系統數據，確保數據安全。',
        timestamp: '2026-01-17T20:00:00Z',
        read: true
      }
    ]
    
    // 限制返回數量
    const limitedAlerts = alerts.slice(0, limit)
    
    return NextResponse.json({
      success: true,
      alerts: limitedAlerts,
      total: alerts.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '獲取通知時發生錯誤'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, title, message } = body
    
    if (!type || !title || !message) {
      return NextResponse.json({
        success: false,
        error: '缺少必要參數：type, title, message'
      }, { status: 400 })
    }
    
    // 創建新通知
    const newAlert = {
      id: `alert_${Date.now()}`,
      type: type,
      title: title,
      message: message,
      timestamp: new Date().toISOString(),
      read: false
    }
    
    return NextResponse.json({
      success: true,
      alert: newAlert,
      message: '通知已創建'
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '創建通知時發生錯誤'
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('id')
    
    if (!alertId) {
      return NextResponse.json({
        success: false,
        error: '缺少通知ID'
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      message: `通知 ${alertId} 已刪除`
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: '刪除通知時發生錯誤'
    }, { status: 500 })
  }
}
