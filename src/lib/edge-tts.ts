/**
 * Edge TTS Service
 * 免費微軟語音，非常自然
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import os from 'os'

const execAsync = promisify(exec)

const CACHE_DIR = '/tmp/edge-tts-cache'
const MAX_CACHE_SIZE = 200
const CACHE_TTL_HOURS = 48

// 可用語音
export const EDGE_VOICES = {
  'zh-TW-HsiaoChenNeural': { name: '曉晨', gender: 'Female', lang: 'zh-TW' },
  'zh-TW-HsiaoYuNeural': { name: '曉雨', gender: 'Female', lang: 'zh-TW' },
  'zh-TW-YunJheNeural': { name: '雲哲', gender: 'Male', lang: 'zh-TW' },
  'zh-CN-XiaoxiaoNeural': { name: '曉曉', gender: 'Female', lang: 'zh-CN' },
  'zh-CN-YunxiNeural': { name: '雲熙', gender: 'Male', lang: 'zh-CN' },
  'zh-CN-YunyangNeural': { name: '雲揚', gender: 'Male', lang: 'zh-CN' },
  'zh-CN-XiaoyouNeural': { name: '曉悠', gender: 'Female', lang: 'zh-CN' },
}

// 預設語音
export const DEFAULT_VOICE = 'zh-TW-HsiaoChenNeural'

/**
 * 生成快取 key
 */
function generateCacheKey(text: string, voice: string, rate: string = '+0%', pitch: string = '+0%'): string {
  const data = `${text}|${voice}|${rate}|${pitch}`
  return crypto.createHash('sha1').update(data).digest('hex')
}

/**
 * 取得快取路徑
 */
function getCachePath(cacheKey: string): string {
  return `${CACHE_DIR}/tts_${cacheKey}.mp3`
}

/**
 * 確保快取目錄存在
 */
async function ensureCacheDir(): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch (e) {
    // 目錄已存在
  }
}

/**
 * 文字轉語音
 */
export async function textToSpeech(
  text: string,
  voice: string = DEFAULT_VOICE,
  rate: string = '+0%',
  pitch: string = '+0Hz'
): Promise<Buffer> {
  // 確保快取目錄
  await ensureCacheDir()

  // 生成快取 key
  const cacheKey = generateCacheKey(text, voice, rate, pitch)
  const cachePath = getCachePath(cacheKey)

  // 檢查快取
  try {
    const stats = await fs.stat(cachePath)
    const age = Date.now() - stats.mtimeMs
    const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000

    if (age < maxAge) {
      console.log('[EdgeTTS] Cache HIT:', cacheKey.slice(0, 8))
      return await fs.readFile(cachePath)
    }
  } catch {
    // 快取未命中
  }

  console.log('[EdgeTTS] Generating:', voice, text.slice(0, 20) + '...')

  // 執行 edge-tts
  const tempFile = path.join(os.tmpdir(), `tts_${Date.now()}.mp3`)

  // 使用 execAsync 調用 edge-tts
  const escapedText = text.replace(/"/g, '\\"')
  const cmd = `edge-tts -t "${escapedText}" -v "${voice}" --rate "${rate}" --pitch "${pitch}" --write-media "${tempFile}"`

  await execAsync(cmd, { timeout: 30000 })

  // 讀取並快取
  const audioBuffer = await fs.readFile(tempFile)

  // 清理臨時檔案
  try {
    await fs.unlink(tempFile)
  } catch {}

  // 保存快取
  try {
    await fs.writeFile(cachePath, audioBuffer)
    await cleanupCache()
  } catch (e) {
    console.error('[EdgeTTS] Cache write failed:', e)
  }

  return audioBuffer
}

/**
 * 清理舊快取
 */
async function cleanupCache(): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR)
    const now = Date.now()
    const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000

    for (const file of files) {
      if (!file.startsWith('tts_') || !file.endsWith('.mp3')) continue

      const filePath = path.join(CACHE_DIR, file)
      try {
        const stats = await fs.stat(filePath)
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath)
        }
      } catch {}
    }
  } catch {}
}

/**
 * 限制快取大小
 */
async function limitCacheSize(): Promise<void> {
  try {
    const files = await fs.readdir(CACHE_DIR)
    const mp3Files = files
      .filter(f => f.startsWith('tts_') && f.endsWith('.mp3'))
      .map(f => ({
        name: f,
        path: path.join(CACHE_DIR, f),
      }))

    if (mp3Files.length <= MAX_CACHE_SIZE) return

    const fileStats = await Promise.all(
      mp3Files.map(async f => ({
        ...f,
        mtime: (await fs.stat(f.path)).mtimeMs,
      }))
    )

    fileStats.sort((a, b) => a.mtime - b.mtime)

    const toDelete = fileStats.slice(0, fileStats.length - MAX_CACHE_SIZE)
    for (const file of toDelete) {
      await fs.unlink(file.path).catch(() => {})
    }

    console.log(`[EdgeTTS] Deleted ${toDelete.length} old cache files`)
  } catch {}
}
