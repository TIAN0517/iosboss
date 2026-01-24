/**
 * Phase 0: 语音服务诊断接口（容器内健康检查）
 * GET /api/voice/diag
 *
 * 只检查环境变量和依赖，不对外发请求
 * 必须在容器内可用
 */

import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ========================================
// 环境变量（从 env 读取，不得硬编码）
// ========================================

const DG_API_KEY = process.env.DG_API_KEY || ''
const DG_MODEL = process.env.DG_MODEL || 'nova-3'
const DG_LANGUAGE = process.env.DG_LANGUAGE || 'zh-CN'

const AZ_SPEECH_KEY = process.env.AZ_SPEECH_KEY || ''
const AZ_SPEECH_REGION = process.env.AZ_SPEECH_REGION || 'southeastasia'
const AZ_TTS_VOICE = process.env.AZ_TTS_VOICE || 'zh-CN-XiaoxiaoNeural'
const AZ_TTS_STYLE = process.env.AZ_TTS_STYLE || 'chat'
const AZ_TTS_STYLE_DEGREE = process.env.AZ_TTS_STYLE_DEGREE || '1.15'
const AZ_TTS_RATE = process.env.AZ_TTS_RATE || '-5%'
const AZ_TTS_PITCH = process.env.AZ_TTS_PITCH || '+0%'
const AZ_TTS_FORMAT = process.env.AZ_TTS_FORMAT || 'audio-16khz-128kbitrate-mono-mp3'

const AI_INTERNAL_ENDPOINT = process.env.AI_INTERNAL_ENDPOINT || 'http://app:9999/api/ai/chat'

/**
 * 检查 ffmpeg 是否可用
 */
async function checkFfmpeg(): Promise<boolean> {
  try {
    const { stdout } = await execAsync('ffmpeg -version')
    return stdout.includes('ffmpeg version')
  } catch {
    return false
  }
}

/**
 * GET /api/voice/diag
 * 返回语音服务配置状态（不含任何敏感信息）
 */
export async function GET() {
  // 检查 Deepgram
  const dgKeyPresent = DG_API_KEY.length > 0 && DG_API_KEY !== 'your_deepgram_api_key_here'

  // 检查 Azure
  const azKeyPresent = AZ_SPEECH_KEY.length > 0 && AZ_SPEECH_KEY !== 'your_azure_speech_key_here'

  // 检查 ffmpeg
  const ffmpegPresent = await checkFfmpeg()

  // Node 版本
  const nodeVersion = process.version
  const isContainer = process.env.NODE_ENV === 'production' || !!process.env.KUBERNETES_SERVICE_HOST

  return NextResponse.json({
    // Deepgram 配置
    deepgram: {
      keyPresent: dgKeyPresent,
      keyPreview: dgKeyPresent ? `${DG_API_KEY.slice(0, 8)}...` : '未配置',
      model: DG_MODEL,
      language: DG_LANGUAGE,
    },

    // Azure 配置
    azure: {
      keyPresent: azKeyPresent,
      keyPreview: azKeyPresent ? `${AZ_SPEECH_KEY.slice(0, 8)}...` : '未配置',
      region: AZ_SPEECH_REGION,
      voice: AZ_TTS_VOICE,
      style: AZ_TTS_STYLE,
      styleDegree: AZ_TTS_STYLE_DEGREE,
      rate: AZ_TTS_RATE,
      pitch: AZ_TTS_PITCH,
      format: AZ_TTS_FORMAT,
    },

    // AI 端点
    aiEndpoint: AI_INTERNAL_ENDPOINT,

    // 依赖检查
    dependencies: {
      ffmpegPresent,
      ffmpegVersion: ffmpegPresent ? 'installed' : 'NOT FOUND',
    },

    // 运行时环境
    runtime: {
      node: nodeVersion,
      container: isContainer,
      platform: process.platform,
      arch: process.arch,
    },

    // 整体状态
    ready: {
      stt: dgKeyPresent && ffmpegPresent,
      tts: azKeyPresent,
      full: dgKeyPresent && azKeyPresent && ffmpegPresent,
    },

    // 时间戳
    timestamp: new Date().toISOString(),

    // 健康状态（用于 healthcheck）
    healthy: dgKeyPresent && azKeyPresent && ffmpegPresent,
  })
}
