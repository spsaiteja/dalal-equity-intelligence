import { NextRequest, NextResponse } from 'next/server';
import {
  signSessionPayload,
  isUserApproved,
  isMasterAdmin,
  recordPendingUser,
  AUTH_COOKIE_NAME,
  APPROVAL_PASS_COOKIE,
  signApprovalPass,
  verifyApprovalPass,
  AuthUser,
  getAuthRedirectUri,
  syncAccessRecordsFromVault,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const redirectUri = getAuthRedirectUri(request);
  const origin = new URL(redirectUri).origin;

  if (error || !code) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(`${origin}/?auth=error&reason=${encodeURIComponent(error || 'No code returned')}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/?auth=error&reason=Missing+Google+credentials`);
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(`${origin}/?auth=error&reason=Token+exchange+failed`);
    }

    // 2. Fetch User Profile from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const userData = await userRes.json();

    if (!userRes.ok || !userData.email) {
      console.error('Failed to fetch user profile:', userData);
      return NextResponse.redirect(`${origin}/?auth=error&reason=Profile+fetch+failed`);
    }

    const email = userData.email.trim().toLowerCase();
    const name = userData.name || email.split('@')[0];
    const picture = userData.picture || undefined;

    const passCookie = request.cookies.get(APPROVAL_PASS_COOKIE)?.value;
    const hasValidPass = verifyApprovalPass(passCookie, email);

    // Ensure server has latest approved users from Google Drive Vault
    await syncAccessRecordsFromVault();

    const isAdmin = isMasterAdmin(email);
    const isApproved = isAdmin || hasValidPass || isUserApproved(email);

    const authUser: AuthUser = {
      id: userData.sub || email,
      email,
      name,
      picture,
      role: isAdmin ? 'admin' : 'user',
      isApproved,
    };

    // If not approved, log user in the pending requests queue
    if (!isApproved) {
      recordPendingUser({ email, name, picture });
    }

    // 3. Create signed session token
    const sessionToken = signSessionPayload(authUser);

    // 4. Redirect user based on approval status
    const destination = isApproved ? `${origin}/?auth=success` : `${origin}/?auth=pending`;
    const response = NextResponse.redirect(destination);

    // Set HTTP-only secure session cookie (30 days)
    response.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // If approved, issue persistent 1-Year Approval Pass cookie so logout never re-locks them
    if (isApproved) {
      response.cookies.set(APPROVAL_PASS_COOKIE, signApprovalPass(email), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 365 * 24 * 60 * 60, // 365 days
      });
    }

    return response;
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(`${origin}/?auth=error&reason=${encodeURIComponent(err.message || 'Callback error')}`);
  }
}

