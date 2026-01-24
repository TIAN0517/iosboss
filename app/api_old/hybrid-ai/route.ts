import { NextResponse } from 'next/server';
import { hybridAIService } from '@/lib/hybrid-ai-service';

export async function POST(req: Request) {
  try {
    const { userId, message, includeVoice, voiceId, emotion } = await req.json();

    if (!userId || !message) {
      return NextResponse.json(
        { error: '缺少必需参数' },
        { status: 400 }
      );
    }

    const response = await hybridAIService.generateResponse(userId, message, {
      includeVoice: includeVoice || false,
      voiceId,
      emotion,
    });

    if (includeVoice && response.audioBuffer) {
      return new NextResponse(response.audioBuffer, {
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-AI-Provider': response.provider,
          'X-AI-Model': response.model,
          'Content-Disposition': `attachment; filename="speech.mp3"`,
        },
      });
    }

    return NextResponse.json({
      content: response.content,
      provider: response.provider,
      model: response.model,
    });
  } catch (error) {
    console.error('Hybrid AI error:', error);
    return NextResponse.json(
      { 
        error: 'AI处理失败',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (userId) {
    hybridAIService.clearHistory(userId);
    return NextResponse.json({ 
      success: true, 
      message: '对话历史已清除' 
    });
  }

  return NextResponse.json({
    status: 'running',
    providers: ['glm', 'kimi', 'groq'],
    voice: 'openvoice',
  });
}
