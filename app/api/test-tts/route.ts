import { NextResponse } from 'next/server'
import { synthesizeWithGLM, synthesizeWithElevenLabs, synthesizeWithAzure, checkServiceAvailability } from '@/lib/voice-service'

/**
 * 测试 TTS 服务
 * GET /api/test-tts
 * 优先使用 GLM TTS
 */
export async function GET() {
  try {
    const testText = '你好，這是一個 GLM TTS 測試。'
    const services = checkServiceAvailability()

    console.log('[Test TTS] 可用服務:', services)

    let result
    let provider = ''

    // 優先級：GLM > ElevenLabs > Azure
    if (services.glm) {
      console.log('[Test TTS] 測試 GLM TTS...')
      result = await synthesizeWithGLM(testText)
      provider = 'GLM'
    } else if (services.elevenlabs) {
      console.log('[Test TTS] 測試 ElevenLabs TTS...')
      result = await synthesizeWithElevenLabs(testText)
      provider = 'ElevenLabs'
    } else if (services.azure) {
      console.log('[Test TTS] 測試 Azure TTS...')
      result = await synthesizeWithAzure(testText)
      provider = 'Azure'
    } else {
      throw new Error('沒有可用的 TTS 服務')
    }

    console.log('[Test TTS] 成功:', {
      provider,
      audioSize: result.audioBuffer.length,
      mimeType: result.mimeType,
    })

    // 返回音频
    return new NextResponse(result.audioBuffer, {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="test-${provider}.mp3"`,
      },
    })
  } catch (error: any) {
    console.error('[Test TTS] 失敗:', error)
    return NextResponse.json(
      {
        error: 'TTS 測試失敗',
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    )
  }
}
