import { NextRequest, NextResponse } from 'next/server';
import {
  getUpstoxConfig,
  saveUpstoxConfig,
  getUpstoxSession,
  clearUpstoxSession,
  maskKey,
} from '@/lib/upstox-storage';
import { getUpstoxLoginUrl } from '@/lib/upstox-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = getUpstoxConfig();
    const session = getUpstoxSession();

    const isConnected = session !== null && session.is_active;

    return NextResponse.json({
      success: true,
      isConnected,
      user_name: session?.user_name || null,
      user_id: session?.user_id || null,
      expires_at: session?.expires_at || null,
      hasCredentials: Boolean(config.apiKey && config.apiSecret),
      apiKeyMasked: maskKey(config.apiKey),
      redirectUri: config.redirectUri || 'http://localhost:3000/api/upstox/callback',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check Upstox status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body
    }

    const currentConfig = getUpstoxConfig();
    const apiKey = (body?.apiKey || currentConfig.apiKey || '').trim();
    const apiSecret = (body?.apiSecret || currentConfig.apiSecret || '').trim();
    const redirectUri = (
      body?.redirectUri ||
      currentConfig.redirectUri ||
      'http://localhost:3000/api/upstox/callback'
    ).trim();

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Upstox API Key is required' },
        { status: 400 }
      );
    }

    // Save updated credentials locally
    saveUpstoxConfig({ apiKey, apiSecret, redirectUri });

    // Generate Upstox OAuth Login URL
    const loginUrl = getUpstoxLoginUrl(apiKey, redirectUri);

    return NextResponse.json({
      success: true,
      loginUrl,
      redirectUri,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearUpstoxSession();
    return NextResponse.json({
      success: true,
      message: 'Upstox session disconnected successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to disconnect session' },
      { status: 500 }
    );
  }
}

