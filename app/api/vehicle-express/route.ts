import { NextRequest, NextResponse } from 'next/server'
import { getVehicleExpressService } from '@/lib/vehicle-express-service'

/**
 * 車訊快遞管理 API
 */

// GET - 獲取配置
export async function GET() {
  const service = getVehicleExpressService()
  const config = service.getConfig()

  // 隱藏敏感資訊
  const sanitized = {
    ...config,
    apiKey: config.apiKey ? '******' : undefined,
  }

  return NextResponse.json({ config: sanitized })
}

// POST - 測試簡訊或更新配置
export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: '請求格式錯誤' },
      { status: 400 }
    )
  }
  const { action, phone, config } = body

  const service = getVehicleExpressService()

  if (action === 'testSms') {
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const result = await service.testSMS(phone)
    return NextResponse.json(result)
  }

  if (action === 'updateConfig') {
    service.updateConfig(config)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  )
}
