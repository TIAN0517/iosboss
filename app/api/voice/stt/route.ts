/**
 * Phase 1: 语音转文字 API
 * POST /api/voice/stt
 *
 * 支持格式：m4a/ogg/webm/wav/mp3
 * 自动转码：非 wav/pcm -> 16k mono wav
 * 重试：指数退避，最多 2 次
 */

import { NextRequest, NextResponse } from 'next/server'
import { transcribeWithDeepgram, DEEPGRAM_CONFIG } from '@/lib/voice-service'
import { exec } from 'child_process'
import { promisify } from 'util'
import { unlink } from 'fs/promises'
import { randomUUID } from 'crypto'

const execAsync = promisify(exec)

// 支持的音频格式
const SUPPORTED_FORMATS = ['m4a', 'ogg', 'webm', 'wav', 'mp3', 'opus', 'pcm']
const NEEDS_CONVERSION = ['m4a', 'ogg', 'webm', 'mp3', 'opus']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * 用 ffmpeg 将音频转换为 16k mono wav
 */
async function convertToWav(inputPath: string): Promise<Buffer> {
  const outputPath = `/tmp/${randomUUID()}.wav`

  try {
    // ffmpeg 转码：16kHz, 单声道, PCM 16-bit
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    )

    // 读取转换后的文件
    const fs = await import('fs/promises')
    const buffer = await fs.readFile(outputPath)

    return buffer
  } finally {
    // 清理临时文件
    try {
      await unlink(inputPath)
      await unlink(outputPath)
    } catch {}
  }
}

/**
 * 带重试的 Deepgram ASR（指数退避）
 */
async function transcribeWithRetry(
  audioBuffer: Buffer,
  mimeType: string,
  maxRetries = 2
): Promise<{ text: string; confidence: number }> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await transcribeWithDeepgram(audioBuffer, mimeType)
      return {
        text: result.text,
        confidence: result.confidence,
      }
    } catch (error: any) {
      lastError = error

      // 检查是否是鉴权错误
      if (error.message?.includes('401') || error.message?.includes('INVALID_AUTH')) {
        throw new Error('Deepgram API Key 无效，请 rotate key（不要在日志输出 key）')
      }

      // 429 或超时才重试
      const isRetryable =
        error.message?.includes('429') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ETIMEDOUT')

      if (!isRetryable || attempt === maxRetries) {
        throw error
      }

      // 指数退避：100ms, 200ms, 400ms...
      const delay = 100 * Math.pow(2, attempt)
      console.log(`[STT] Retry ${attempt + 1}/${maxRetries + 1} after ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * POST /api/voice/stt
 */
export async function POST(request: NextRequest) {
  try {
    // 检查 API Key
    if (!DEEPGRAM_CONFIG.apiKey) {
      return NextResponse.json(
        { error: 'Deepgram API Key 未配置' },
        { status: 500 }
      )
    }

    // 解析请求
    const contentType = request.headers.get('content-type') || ''
    let audioBuffer: Buffer
    let mimeType = 'audio/wav'

    if (contentType.includes('multipart')) {
      // FormData 方式
      const formData = await request.formData()
      const audioFile = formData.get('audio') as File

      if (!audioFile) {
        return NextResponse.json(
          { error: '缺少 audio 字段' },
          { status: 400 }
        )
      }

      // 检查文件大小
      if (audioFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 413 }
        )
      }

      audioBuffer = Buffer.from(await audioFile.arrayBuffer())
      mimeType = audioFile.type || 'audio/wav'
    } else {
      // Raw bytes 方式
      const arrayBuffer = await request.arrayBuffer()

      if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 413 }
        )
      }

      audioBuffer = Buffer.from(arrayBuffer)
      mimeType = contentType || 'audio/wav'
    }

    // 判断是否需要转码
    const needsConversion = NEEDS_CONVERSION.some(fmt =>
      mimeType.includes(fmt)
    )

    if (needsConversion) {
      // 保存临时文件并转码
      const tempInputPath = `/tmp/${randomUUID()}.${mimeType.split('/')[1] || 'bin'}`
      const fs = await import('fs/promises')
      await fs.writeFile(tempInputPath, audioBuffer)

      console.log(`[STT] Converting ${mimeType} to wav...`)
      audioBuffer = await convertToWav(tempInputPath)
      mimeType = 'audio/wav'
    }

    // 调用 Deepgram（带重试）
    const result = await transcribeWithRetry(audioBuffer, mimeType)

    return NextResponse.json({
      text: result.text,
      confidence: result.confidence,
      provider: 'deepgram',
    })

  } catch (error: any) {
    console.error('[STT] Error:', error.message)

    // 401 鉴权错误
    if (error.message?.includes('Key') || error.message?.includes('401')) {
      return NextResponse.json(
        { error: 'Deepgram API Key 无效，请 rotate key（不要在日志输出 key）' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: error.message || '语音识别失败' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/voice/stt
 * 返回配置信息
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/voice/stt',
    method: 'POST',
    supportedFormats: SUPPORTED_FORMATS,
    maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
    autoConvert: '16kHz mono PCM wav',
    provider: {
      name: 'Deepgram',
      model: DEEPGRAM_CONFIG.model,
      language: DEEPGRAM_CONFIG.language,
      configured: !!DEEPGRAM_CONFIG.apiKey,
    },
  })
}
