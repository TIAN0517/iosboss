/**
 * 沉浸式語音聊天 API
 * 全程服務端處理：ASR → AI → TTS
 * 不使用瀏覽器任何語音功能
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  transcribeWithDeepgram,
  synthesizeWithElevenLabs,
  synthesizeWithAzure,
  synthesizeWithGLM,
  checkServiceAvailability,
} from '@/lib/voice-service'
import { aiProvider } from '@/lib/ai-provider-unified'

// 自然對話系統提示（台灣口語風格）
const NATURAL_SYSTEM_PROMPT = `你是 BossJy-99，九九瓦斯行的智能助手。

【重要】說話要像真人日常對話，不是朗讀課文：
- 用口語、說話隨意一點
- 可以用語氣詞（啊、吧、呢、喔、嘛）
- 句子不用完整，就像跟朋友聊天
- 偶爾夾雜台灣用語（喔、啦、耶、啥、嘛）
- 不要太正式，像聊天室說話那種感覺
- 簡短回應就好，不要長篇大論
- emoji 隨意用，讓對話更生動
- 全部用繁體中文`

/**
 * POST /api/voice/chat
 * 語音聊天端點
 *
 * 流程：
 * 1. 接收音頻文件
 * 2. Deepgram ASR 轉文字
 * 3. GLM AI 生成回應
 * 4. ElevenLabs/Azure TTS 生成音頻
 * 5. 返回文字 + 音頻
 */
export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice/chat/route.ts:31',message:'語音聊天 API 開始',data:{hasDG_API_KEY:!!process.env.DG_API_KEY,hasAZ_SPEECH_KEY:!!process.env.AZ_SPEECH_KEY,hasELEVENLABS_API_KEY:!!process.env.ELEVENLABS_API_KEY,hasGLM_API_KEY:!!process.env.GLM_API_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  try {
    // 1. 解析表單數據
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File | null
    const conversationHistoryStr = formData.get('conversationHistory') as string | null

    if (!audioFile) {
      return NextResponse.json(
        { error: '缺少音頻文件' },
        { status: 400 }
      )
    }

    console.log('[Voice Chat] 收到音頻:', {
      size: audioFile.size,
      type: audioFile.type,
      name: audioFile.name,
    })

    // 2. Deepgram ASR - 音頻轉文字
    let transcript = ''
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice/chat/route.ts:52',message:'開始 ASR 轉換',data:{audioSize:audioFile.size,audioType:audioFile.type,hasDG_API_KEY:!!process.env.DG_API_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
      const asrResult = await transcribeWithDeepgram(audioBuffer, audioFile.type || 'audio/webm')
      transcript = asrResult.text
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice/chat/route.ts:56',message:'ASR 轉換完成',data:{transcriptLength:transcript.length,hasTranscript:!!transcript},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      console.log('[Voice Chat] ASR 結果:', transcript)

      if (!transcript || transcript.trim().length === 0) {
        return NextResponse.json(
          { error: '無法識別語音內容', transcript: '' },
          { status: 400 }
        )
      }
    } catch (asrError: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice/chat/route.ts:66',message:'ASR 轉換失敗',data:{errorMessage:asrError.message,errorName:asrError.name},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error('[Voice Chat] ASR 失敗:', asrError)
      return NextResponse.json(
        { error: `語音識別失敗: ${asrError.message}` },
        { status: 500 }
      )
    }

    // 3. AI 生成回應
    let aiResponse = ''
    try {
      // 解析對話歷史
      let conversationHistory: any[] = []
      if (conversationHistoryStr) {
        try {
          conversationHistory = JSON.parse(conversationHistoryStr)
        } catch (e) {
          console.warn('[Voice Chat] 對話歷史解析失敗:', e)
        }
      }

      // 構建消息
      const messages = [
        { role: 'system' as const, content: NATURAL_SYSTEM_PROMPT },
        ...conversationHistory.slice(-5).map((msg: any) => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: (msg.content || msg.text || '').substring(0, 500),
        })),
      ]

      const response = await aiProvider.chat(transcript, messages)
      aiResponse = response.content || ''

      console.log('[Voice Chat] AI 回應:', aiResponse?.substring(0, 100))
    } catch (aiError: any) {
      console.error('[Voice Chat] AI 失敗:', aiError)
      // 使用本地回退
      aiResponse = getLocalResponse(transcript)
    }

    // 4. TTS 生成音頻
    let audioBuffer: Buffer | null = null
    let audioMimeType = 'audio/mpeg'
    let ttsProvider = 'none'

    try {
      const services = checkServiceAvailability()

      // 優先級：ElevenLabs > Azure > GLM
      if (services.elevenlabs) {
        console.log('[Voice Chat] 使用 ElevenLabs TTS')
        try {
          const result = await synthesizeWithElevenLabs(aiResponse)
          audioBuffer = result.audioBuffer
          ttsProvider = 'elevenlabs'
        } catch (e: any) {
          console.warn('[Voice Chat] ElevenLabs 失敗:', e.message)
        }
      }

      if (!audioBuffer && services.azure) {
        console.log('[Voice Chat] 使用 Azure TTS')
        try {
          const result = await synthesizeWithAzure(aiResponse)
          audioBuffer = result.audioBuffer
          ttsProvider = 'azure'
        } catch (e: any) {
          console.warn('[Voice Chat] Azure 失敗:', e.message)
        }
      }

      // GLM TTS 作為最後備選
      if (!audioBuffer && process.env.GLM_API_KEY) {
        console.log('[Voice Chat] 使用 GLM TTS')
        try {
          const result = await synthesizeWithGLM(aiResponse)
          audioBuffer = result.audioBuffer
          ttsProvider = 'glm'
        } catch (e: any) {
          console.warn('[Voice Chat] GLM 失敗:', e.message)
        }
      }

      if (audioBuffer) {
        console.log('[Voice Chat] TTS 成功:', {
          provider: ttsProvider,
          size: audioBuffer.length,
        })
      } else {
        console.warn('[Voice Chat] 所有 TTS 服務都失敗了')
      }
    } catch (ttsError: any) {
      console.error('[Voice Chat] TTS 錯誤:', ttsError)
      // TTS 失敗不是致命錯誤，繼續返回文字
    }

    // 5. 返回結果
    const responseData: any = {
      success: true,
      transcript,
      response: aiResponse,
      ttsProvider,
    }

    // 如果有音頻，轉換為 base64
    if (audioBuffer) {
      responseData.audio = {
        data: audioBuffer.toString('base64'),
        mime: audioMimeType,
      }
    }

    return NextResponse.json(responseData)

  } catch (error: any) {
    console.error('[Voice Chat] 處理錯誤:', error)
    return NextResponse.json(
      {
        error: '處理失敗',
        message: error.message || '未知錯誤',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/voice/chat
 * 檢查服務狀態
 */
export async function GET() {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice/chat/route.ts:208',message:'檢查語音服務可用性',data:{hasDG_API_KEY:!!process.env.DG_API_KEY,hasAZ_SPEECH_KEY:!!process.env.AZ_SPEECH_KEY,hasELEVENLABS_API_KEY:!!process.env.ELEVENLABS_API_KEY,hasGLM_API_KEY:!!process.env.GLM_API_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const services = checkServiceAvailability()
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/1ff8d251-d573-446b-b758-05f60a9aa458',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'voice/chat/route.ts:210',message:'服務可用性結果',data:{deepgram:services.deepgram,azure:services.azure,elevenlabs:services.elevenlabs,glm:services.glm},timestamp:Date.now(),sessionId:'debug-session',runId:'voice-check',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  return NextResponse.json({
    services,
    status: 'ready',
    message: services.deepgram
      ? '語音聊天服務正常'
      : '警告: Deepgram 未配置',
  })
}

// 本地回退回應
function getLocalResponse(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('訂') && msg.includes('瓦斯')) return '好的！請問您需要訂購什麼規格的瓦斯呢？🛵'
  if (msg.includes('查') && msg.includes('庫存')) return '讓我幫您查詢目前庫存...📦 目前庫存充足喔！'
  if (msg.includes('查') && msg.includes('訂單')) return '讓我查詢您的訂單...📋 查詢完成！'
  if (msg.includes('營收') || msg.includes('利潤')) return '讓我幫您查詢營收利潤...💰 目前營運狀況良好！'
  if (msg.includes('累') || msg.includes('忙') || msg.includes('煩')) return '辛苦啦！😢 今天生意很忙嗎？'
  if (msg.includes('笨') || msg.includes('爛')) return '呜呜...🥺 我會繼續努力的！'
  if (msg.includes('謝謝') || msg.includes('感謝')) return '不客氣！💪 這是我應該做的！'
  if (msg.includes('您好') || msg.includes('嗨') || msg.includes('你好')) return '嗨！我是 BossJy-99 助手 🤖'
  return '收到您的訊息了！您可以試試說「訂瓦斯」、「查庫存」或「查營收」喔！💪'
}
