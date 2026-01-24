import { NextRequest, NextResponse } from 'next/server';
import { getNVIDIANIMService } from '@/lib/nvidia-nim-service';

export async function POST(req: NextRequest) {
  try {
    const { userId, message, conversationHistory, stream = false } = await req.json();

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'userId 和 message 是必需的' },
        { status: 400 }
      );
    }

    const nvidiaService = getNVIDIANIMService();

    if (stream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await nvidiaService.generateStreamingResponse(
              userId,
              message,
              conversationHistory || [],
              (chunk: string) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
              }
            );

            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const response = await nvidiaService.generateResponse(
      userId,
      message,
      conversationHistory || []
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('NVIDIA AI API error:', error);
    return NextResponse.json(
      {
        error: 'AI 服務暫時無法使用',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const nvidiaService = getNVIDIANIMService();
    const modelInfo = nvidiaService.getModelInfo();

    return NextResponse.json({
      status: 'active',
      provider: 'NVIDIA NIM',
      ...modelInfo,
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
