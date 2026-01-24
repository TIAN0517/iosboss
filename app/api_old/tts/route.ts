import { NextResponse } from 'next/server';
import { ElevenLabsClient } from 'elevenlabs';

const elevenLabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || 'sk_12fab565e97a7cb00efc84180568bf0b0e1b92ce6626df55',
});

export async function POST(req: Request) {
  try {
    const { text, voiceId, modelId, stability, similarity } = await req.json();

    const audio = await elevenLabs.textToSpeech.convert({
      voiceId: voiceId || 'XBnrpkQkHdVjPEZ0eiP',
      text: text,
      modelId: modelId || 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
      stability: stability || 0.5,
      similarityBoost: similarity || 0.75,
    });

    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="speech.mp3"`,
      },
    });
  } catch (error) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
