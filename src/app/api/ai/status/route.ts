import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

function maskKey(key: string): string {
  if (!key || key.length < 8) return '****';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

export async function GET() {
  const envKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '';
  const hasServerKey = envKey.length > 5;

  return NextResponse.json({
    success: true,
    hasServerKey,
    maskedServerKey: hasServerKey ? maskKey(envKey) : null,
    model: 'gemini-3.5-flash-lite',
  });
}

export async function POST(request: NextRequest) {
  try {
    let testKey: string | undefined;
    try {
      const body = await request.json();
      testKey = body?.apiKey;
    } catch {
      // Body may be empty
    }

    const keyToUse = (testKey && testKey.trim()) || (process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : '');

    if (!keyToUse) {
      return NextResponse.json({
        success: false,
        error: 'No API key provided or configured on server.',
      });
    }

    // Ping test with lightweight model
    const client = new GoogleGenerativeAI(keyToUse);
    const model = client.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const res = await model.generateContent('ping');
    const reply = res.response.text();

    return NextResponse.json({
      success: true,
      message: 'Gemini API is active and connected!',
      maskedKey: maskKey(keyToUse),
      isServerConfigured: !!process.env.GEMINI_API_KEY,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to connect to Google Gemini API.',
    });
  }
}

