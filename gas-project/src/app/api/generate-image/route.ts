import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const outputDir = './public/products';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, filename, size = '1024x1024' } = await request.json();

    if (!prompt || !filename) {
      return NextResponse.json(
        { error: 'Prompt and filename are required' },
        { status: 400 }
      );
    }

    console.log(`Generating image: ${filename} with prompt: ${prompt}`);

    const zai = await ZAI.create();

    const response = await zai.images.generations.create({
      prompt: prompt,
      size: size as any
    });

    const imageBase64 = response.data[0].base64;
    const buffer = Buffer.from(imageBase64, 'base64');

    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, buffer);

    console.log(`✓ Generated: ${filename}`);

    return NextResponse.json({
      success: true,
      imageUrl: `/products/${filename}`,
      prompt: prompt,
      size: size
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
