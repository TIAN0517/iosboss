import { NextResponse } from 'next/server';

interface TTSOptions {
  text: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
}

class OpenVoiceTTS {
  private baseUrl: string = 'http://localhost:8822';
  
  constructor() {
    this.baseUrl = process.env.OPENVOICE_URL || 'http://localhost:8822';
  }

  async textToSpeech(options: TTSOptions): Promise<Buffer> {
    const {
      text,
      voiceId = 'mei',
      speed = 1.0,
      pitch = 1.0,
      emotion = 'friendly'
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: voiceId,
          speed,
          pitch,
          emotion,
          format: 'mp3',
          sample_rate: 22050,
          accent: 'taiwanese'
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenVoice TTS failed: ${error}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('OpenVoice TTS error:', error);
      throw error;
    }
  }

  async getAvailableVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/voices`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error('Fetch voices error:', error);
      return [];
    }
  }
}

export const openVoiceTTS = new OpenVoiceTTS();

export async function POST(req: Request) {
  try {
    const { text, voiceId, speed, pitch, emotion } = await req.json();

    if (!text) {
      return NextResponse.json(
        { error: '缺少文字内容' },
        { status: 400 }
      );
    }

    const audioBuffer = await openVoiceTTS.textToSpeech({
      text,
      voiceId: voiceId || 'mei',
      speed: speed || 1.0,
      pitch: pitch || 1.0,
      emotion: emotion || 'friendly'
    });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="speech.mp3"`,
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { error: '语音合成失败' },
      { status: 500 }
    );
  }
}
