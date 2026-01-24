import { NextRequest, NextResponse } from 'next/server';
import { getNVIDIANIMService } from '@/lib/nvidia-nim-service';
import { getOpenVoiceTTS } from '@/lib/openvoice-tts';

interface BroadcastRequest {
  type: 'text' | 'voice';
  message: string;
  groupIds?: string[]; // 如果不指定，發送到所有群組
  voiceConfig?: {
    emotion?: string;
    speed?: number;
    pitch?: number;
  };
}

interface BroadcastResponse {
  success: boolean;
  message: string;
  sentTo?: number;
  mode: 'text' | 'voice';
  audioUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: BroadcastRequest = await req.json();

    const { type, message, groupIds, voiceConfig } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: '缺少必填字段：type 和 message' },
        { status: 400 }
      );
    }

    console.log(`📢 收到 AI 群組發布請求：${type} 模式`);

    const nvidiaService = getNVIDIANIMService();

    let finalMessage: string;
    let audioUrl: string | undefined;
    let audioBuffer: Buffer | undefined;

    if (type === 'text') {
      console.log('📝 文字模式：生成 AI 回應...');

      const aiResponse = await nvidiaService.generateResponse(
        'admin-broadcast',
        `請幫我優化這段訊息，讓它更適合群組發布：\n\n${message}`
      );

      finalMessage = aiResponse.text;
      console.log(`✅ AI 優化後的訊息：${finalMessage.substring(0, 100)}...`);

    } else if (type === 'voice') {
      console.log('🎤 語音模式：生成 AI 回應並合成語音...');

      const aiResponse = await nvidiaService.generateResponse(
        'admin-broadcast-voice',
        `請幫我優化這段訊息，讓它更適合語音播報：\n\n${message}`
      );

      finalMessage = aiResponse.text;
      console.log(`✅ AI 優化後的訊息：${finalMessage.substring(0, 100)}...`);

      try {
        console.log('🔊 開始合成語音...');
        const openVoiceTTS = getOpenVoiceTTS();

        audioBuffer = await openVoiceTTS.textToSpeech({
          text: finalMessage,
          voiceId: voiceConfig?.emotion || 'mei',
          speed: voiceConfig?.speed || 1.0,
          pitch: voiceConfig?.pitch || 1.0,
          emotion: voiceConfig?.emotion || 'friendly',
        });

        console.log('✅ 語音合成完成！');
      } catch (ttsError) {
        console.error('❌ 語音合成失敗：', ttsError);

        return NextResponse.json(
          {
            success: false,
            message: '語音合成失敗，但已生成文字訊息',
            sentTo: 0,
            mode: 'voice',
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: '不支援的模式，請使用 text 或 voice' },
        { status: 400 }
      );
    }

    const targetGroups = groupIds || [
      process.env.LINE_ADMIN_GROUP_ID,
      process.env.LINE_DRIVER_GROUP_ID,
      process.env.LINE_SALES_GROUP_ID,
      process.env.EMPLOYEE_GROUP_ID,
    ].filter(Boolean);

    console.log(`📤 準備發送到 ${targetGroups.length} 個群組...`);

    const lineBroadcastResults = await Promise.allSettled(
      targetGroups.map(async (groupId) => {
        try {
          const result = await sendToLineGroup(groupId, type, finalMessage, audioBuffer);
          return { groupId, success: true, result };
        } catch (error) {
          console.error(`❌ 發送到群組 ${groupId} 失敗：`, error);
          return { groupId, success: false, error };
        }
      })
    );

    const successfulGroups = lineBroadcastResults.filter(
      (r: any) => r.success
    ).length;

    const failedGroups = lineBroadcastResults.filter(
      (r: any) => !r.success
    );

    if (failedGroups.length > 0) {
      console.warn(`⚠️ ${failedGroups.length} 個群組發送失敗`);
    }

    const response: BroadcastResponse = {
      success: successfulGroups > 0,
      message: `成功發送到 ${successfulGroups} 個群組`,
      sentTo: successfulGroups,
      mode: type,
      audioUrl: audioUrl,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ AI 群組發布失敗：', error);
    return NextResponse.json(
      {
        error: 'AI 群組發布失敗',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function sendToLineGroup(
  groupId: string,
  type: 'text' | 'voice',
  message: string,
  audioBuffer?: Buffer
): Promise<any> {
  const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

  let body: any;

  if (type === 'voice' && audioBuffer) {
    body = {
      to: groupId,
      messages: [
        {
          type: 'audio',
          originalContentUrl: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
          duration: 10000, // 預估 10 秒
        },
      ],
    };
  } else {
    body = {
      to: groupId,
      messages: [
        {
          type: 'text',
          text: message,
        },
      ],
    };
  }

  const response = await fetch(LINE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LINE API 錯誤: ${error}`);
  }

  return await response.json();
}

export async function GET() {
  try {
    const availableGroups = [
      { id: process.env.LINE_ADMIN_GROUP_ID, name: '管理群組' },
      { id: process.env.LINE_DRIVER_GROUP_ID, name: '司機群組' },
      { id: process.env.LINE_SALES_GROUP_ID, name: '業務群組' },
      { id: process.env.EMPLOYEE_GROUP_ID, name: '員工群組' },
    ].filter(g => g.id);

    return NextResponse.json({
      status: 'ready',
      availableGroups,
      modes: ['text', 'voice'],
      description: 'AI 群組發布功能 - 支援文字和語音模式',
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
