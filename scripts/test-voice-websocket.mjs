#!/usr/bin/env node
/**
 * 语音服务 WebSocket 测试脚本
 *
 * 使用方法:
 *   node scripts/test-voice-websocket.mjs
 *
 * 或使用 wscat:
 *   wscat -c "ws://localhost:9999/api/voice/ws"
 */

import WebSocket from 'ws'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// 配置
const WS_URL = process.env.WS_URL || 'ws://localhost:9999/api/voice/ws'
const TEST_AUDIO_PATH = resolve(process.cwd(), 'public/test-audio.mp3')

console.log('========================================')
console.log('  语音服务 WebSocket 测试')
console.log('========================================')
console.log('')
console.log(`连接到: ${WS_URL}`)
console.log('')

// 创建 WebSocket 连接
const ws = new WebSocket(WS_URL)

// 消息计数器
let messageCount = 0
let interimCount = 0
let finalCount = 0
let aiTextCount = 0
let aiAudioCount = 0

ws.on('open', () => {
  console.log('✅ WebSocket 已连接')
  console.log('')

  // 发送测试消息
  setTimeout(() => {
    console.log('发送测试消息...')

    // 方式 1: 发送文本测试
    ws.send(JSON.stringify({
      type: 'text',
      text: '你好',
    }))

    // 方式 2: 如果有音频文件，发送音频
    // try {
    //   const audioBuffer = readFileSync(TEST_AUDIO_PATH)
    //   const base64Audio = audioBuffer.toString('base64')
    //   ws.send(JSON.stringify({
    //     type: 'audio',
    //     data: base64Audio,
    //   }))
    // } catch (e) {
    //   console.log('⚠️  无法读取测试音频文件')
    // }
  }, 1000)
})

ws.on('message', (data) => {
  messageCount++

  try {
    const message = JSON.parse(data.toString())

    switch (message.type) {
      case 'interim':
        interimCount++
        process.stdout.write(`\r[interim] ${message.text}`)
        break

      case 'final':
        finalCount++
        console.log(`\r[final] ${message.text}`)
        console.log(`  置信度: ${(message.confidence * 100).toFixed(1)}%`)
        break

      case 'ai_text':
        aiTextCount++
        console.log(``)
        console.log(`[AI] ${message.text}`)
        break

      case 'ai_audio':
        aiAudioCount++
        console.log(`[Audio] 收到音频 (${message.data?.length || 0} bytes)`)
        // 可以保存音频到文件
        if (message.data) {
          const audioBuffer = Buffer.from(message.data, 'base64')
          const audioPath = resolve(process.cwd(), `test-response-${Date.now()}.mp3`)
          // writeFileSync(audioPath, audioBuffer)
          // console.log(`  已保存到: ${audioPath}`)
        }
        break

      case 'error':
        console.log(``)
        console.log(`[ERROR] ${message.message}`)
        break

      default:
        console.log(``)
        console.log(`[未知消息类型] ${JSON.stringify(message)}`)
    }
  } catch (e) {
    console.log(``)
    console.log(`[原始消息] ${data.toString()}`)
  }
})

ws.on('error', (error) => {
  console.error('')
  console.error('❌ WebSocket 错误:', error.message)
})

ws.on('close', () => {
  console.log('')
  console.log('========================================')
  console.log('连接已关闭')
  console.log('========================================')
  console.log('')
  console.log('统计:')
  console.log(`  总消息数: ${messageCount}`)
  console.log(`  临时识别: ${interimCount}`)
  console.log(`  最终识别: ${finalCount}`)
  console.log(`  AI 回复: ${aiTextCount}`)
  console.log(`  AI 音频: ${aiAudioCount}`)
  console.log('')
  process.exit(0)
})

// 超时退出
setTimeout(() => {
  console.log('')
  console.log('⏱️  测试超时 (30 秒)')
  ws.close()
}, 30000)
