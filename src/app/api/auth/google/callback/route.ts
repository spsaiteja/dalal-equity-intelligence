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
import { saveAdminRefreshToken } from '@/lib/drive-vault';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

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

    // 4. Special Handling: Master Admin linking personal Google Drive Vault
    if (state === 'vault_link' && isAdmin) {
      const refreshToken = tokenData.refresh_token;
      if (refreshToken) {
        saveAdminRefreshToken(refreshToken);
      }

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Google Drive Vault Linked</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0F17; color: #F3F4F6; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #131B2A; border: 1px solid #1F2937; border-radius: 16px; max-width: 560px; width: 100%; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h2 { color: #10B981; margin-top: 0; font-size: 22px; display: flex; align-items: center; gap: 8px; }
    p { color: #9CA3AF; font-size: 14px; line-height: 1.5; }
    .token-box { background: #0B0F17; border: 1px solid #374151; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; word-break: break-all; color: #60A5FA; margin: 16px 0; user-select: all; }
    .btn { background: #2563EB; color: #FFF; font-weight: 600; border: none; border-radius: 8px; padding: 12px 20px; font-size: 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
    .btn:hover { background: #1D4ED8; }
    .btn-green { background: #059669; }
    .btn-green:hover { background: #047857; }
    .steps { background: rgba(31, 41, 55, 0.5); border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #D1D5DB; border: 1px solid #1F2937; }
    .steps ol { margin: 8px 0 0 0; padding-left: 20px; }
    .steps li { margin: 6px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🎉 Google Drive Vault Linked!</h2>
    <p>Your personal Google Drive (<strong>${email}</strong>) has been authorized with your full 15 GB storage quota. All user watchlists and paper trades will be AES-256 encrypted and stored inside your Google Drive folder.</p>
    
    ${
      refreshToken
        ? `
    <p style="margin-bottom:6px; font-weight:600; color:#E5E7EB;">Your Permanent Refresh Token:</p>
    <div class="token-box" id="tokenBox">${refreshToken}</div>
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
      <button class="btn btn-green" onclick="copyToken()">📋 Copy Token for Vercel</button>
      <span id="copiedText" style="color:#10B981; font-size:13px; display:none;">✓ Copied to clipboard!</span>
    </div>

    <div class="steps">
      <strong style="color:#FFF;">Final 1-Minute Step for Vercel:</strong>
      <ol>
        <li>Go to <strong>Vercel &rarr; Settings &rarr; Environment Variables</strong></li>
        <li>Add <strong>GOOGLE_DRIVE_REFRESH_TOKEN</strong> and paste this copied token</li>
        <li>Click <strong>Save</strong> and Redeploy!</li>
      </ol>
    </div>
    `
        : `
    <p style="color:#10B981; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); padding:12px; border-radius:8px;">
      ✓ Token re-authenticated! Your Google Drive connection is active.
    </p>
    `
    }

    <a href="${origin}/" class="btn" style="margin-top:10px;">Return to Dalal Terminal &rarr;</a>
  </div>

  <script>
    function copyToken() {
      const text = document.getElementById('tokenBox').innerText;
      navigator.clipboard.writeText(text);
      document.getElementById('copiedText').style.display = 'inline';
      setTimeout(() => { document.getElementById('copiedText').style.display = 'none'; }, 3000);
    }
  </script>
</body>
</html>`;

      const response = new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

      response.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });

      return response;
    }

    // 5. Normal redirect based on approval status
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

    // If approved, issue persistent 1-Year Approval Pass cookie
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
