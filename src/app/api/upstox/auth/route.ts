import { NextRequest, NextResponse } from 'next/server';
import {
  getUpstoxConfig,
  saveUpstoxConfig,
  getUpstoxSession,
  clearUpstoxSession,
  saveAnalyticsSession,
  maskKey,
} from '@/lib/upstox-storage';
import { getUpstoxLoginUrl } from '@/lib/upstox-client';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser || !sessionUser.isApproved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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
      analyticsTokenMasked: maskKey(config.analyticsToken),
      hasAnalyticsToken: Boolean(config.analyticsToken),
      tokenType: session?.token_type || (session?.is_analytics_token ? 'analytics' : 'oauth'),
      isAnalyticsToken: session?.token_type === 'analytics' || Boolean(session?.is_analytics_token),
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
    const sessionUser = getSessionUser(request);
    if (!sessionUser || !sessionUser.isApproved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body
    }

    // 1. Check if user is connecting with 1-Year Analytics Access Token
    if (body?.analyticsToken) {
      const token = body.analyticsToken.trim();
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Analytics Access Token is required' },
          { status: 400 }
        );
      }

      // Verify token with Upstox User Profile API
      try {
        const profileRes = await fetch('https://api.upstox.com/v2/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Api-Version': '2.0',
          },
        });

        const profileData = await profileRes.json();

        if (profileRes.ok && (profileData?.status === 'success' || profileData?.data)) {
          const profile = profileData.data || {};
          const session = saveAnalyticsSession(token, {
            user_id: profile.user_id || 'UPSTOX_USER',
            user_name: profile.user_name || 'Upstox Investor',
            email: profile.email || '',
            broker: profile.broker || 'Upstox',
          });

          return NextResponse.json({
            success: true,
            message: '1-Year Analytics Token verified and connected successfully!',
            user_name: session.user_name,
            user_id: session.user_id,
            expires_at: session.expires_at,
            tokenType: 'analytics',
            isAnalyticsToken: true,
          });
        } else {
          const errorMsg =
            profileData?.errors?.[0]?.message ||
            profileData?.message ||
            'Invalid Upstox Analytics Token. Please copy the fresh token from your Upstox Developer portal.';
          return NextResponse.json({ success: false, error: errorMsg }, { status: 401 });
        }
      } catch (err: any) {
        return NextResponse.json(
          { success: false, error: `Failed to connect with Upstox: ${err.message}` },
          { status: 500 }
        );
      }
    }

    // 2. Fallback to standard interactive OAuth 2.0 flow
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

export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser || !sessionUser.isApproved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

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

