import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * LINE Webhook 調試端點
 * 用於測試環境變量和簽名驗證
 */
export async function GET(request: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

  // 生成測試簽名
  const testBody = JSON.stringify({ test: 'data' })
  const testHash = crypto
    .createHmac('sha256', channelSecret || '')
    .update(testBody, 'utf8')
    .digest('base64')
  const testSignature = `sha256=${testHash}`

  return NextResponse.json({
    status: 'ok',
    config: {
      hasSecret: !!channelSecret,
      secretLength: channelSecret?.length,
      secretPrefix: channelSecret?.substring(0, 8) + '...',
      hasToken: !!channelAccessToken,
      tokenPrefix: channelAccessToken?.substring(0, 20) + '...',
    },
    testSignature: {
      body: testBody,
      signature: testSignature,
    },
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET
  const body = await request.text()
  const signature = request.headers.get('x-line-signature')

  // 驗證簽名
  const hash = crypto
    .createHmac('sha256', channelSecret || '')
    .update(body, 'utf8')
    .digest('base64')
  const expectedSignature = `sha256=${hash}`
  const isValid = signature === expectedSignature

  return NextResponse.json({
    status: 'ok',
    isValid,
    receivedSignature: signature?.substring(0, 30) + '...',
    expectedSignature: expectedSignature?.substring(0, 30) + '...',
    bodyPreview: body.substring(0, 200) + '...',
    bodyLength: body.length,
  })
}
