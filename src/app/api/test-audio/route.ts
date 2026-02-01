import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * 測試本地語音檔案
 * GET /api/test-audio?file=welcome
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('file') || 'welcome'

    // 支援的語音檔案列表
    const audioFiles = [
      'welcome', 'pricing_20kg', 'order_gas', 'hours', 'delivery',
      'delivery_area', 'delivery_free', 'delivery_time', 'payment',
      'monthly_billing', 'safety_leak', 'safety_check', 'safety_reminder',
      'promotion_new', 'bulk_order', 'emergency', 'emergency_gas_leak',
      'cylinder_4kg', 'cylinder_10kg', 'cylinder_16kg', 'cylinder_20kg',
      'cylinder_50kg', 'cylinder_lifespan', '瓦斯妹', 'test-audio'
    ]

    if (!audioFiles.includes(fileName)) {
      return NextResponse.json({
        error: '不支援的檔案',
        available: audioFiles
      }, { status: 400 })
    }

    const audioPath = path.join(process.cwd(), `${fileName}.wav`)

    try {
      const audioBuffer = await fs.readFile(audioPath)

      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Disposition': `inline; filename="${fileName}.wav"`,
          'Content-Length': audioBuffer.length.toString()
        }
      })
    } catch {
      // 嘗試找 mp3
      const mp3Path = path.join(process.cwd(), `${fileName}.mp3`)
      const audioBuffer = await fs.readFile(mp3Path)

      return new NextResponse(audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `inline; filename="${fileName}.mp3"`,
          'Content-Length': audioBuffer.length.toString()
        }
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      error: '讀取語音檔案失敗',
      message: error.message
    }, { status: 500 })
  }
}
