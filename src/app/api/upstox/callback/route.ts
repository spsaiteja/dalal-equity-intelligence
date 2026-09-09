import { NextRequest, NextResponse } from 'next/server';
import { getUpstoxConfig, saveUpstoxSession } from '@/lib/upstox-storage';
import { exchangeCodeForToken } from '@/lib/upstox-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error') || searchParams.get('error_description');

  const origin = request.nextUrl.origin || 'http://localhost:3000';

  if (error) {
    console.error('Upstox OAuth error redirect:', error);
    return NextResponse.redirect(`${origin}/?tab=portfolio&error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/?tab=portfolio&error=${encodeURIComponent('No authorization code provided')}`
    );
  }

  try {
    const config = getUpstoxConfig();
    const apiKey = config.apiKey || process.env.UPSTOX_API_KEY || '';
    const apiSecret = config.apiSecret || process.env.UPSTOX_API_SECRET || '';
    const redirectUri =
      config.redirectUri || `${origin}/api/upstox/callback`;

    if (!apiKey || !apiSecret) {
      return NextResponse.redirect(
        `${origin}/?tab=portfolio&error=${encodeURIComponent(
          'Missing Upstox API Key or Secret in configuration'
        )}`
      );
    }

    const session = await exchangeCodeForToken(code, apiKey, apiSecret, redirectUri);
    saveUpstoxSession(session);

    return NextResponse.redirect(`${origin}/?tab=portfolio&connected=true`);
  } catch (err: any) {
    console.error('Error exchanging Upstox token:', err);
    return NextResponse.redirect(
      `${origin}/?tab=portfolio&error=${encodeURIComponent(err.message || 'Token exchange failed')}`
    );
  }
}

