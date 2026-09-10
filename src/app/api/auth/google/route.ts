import { NextRequest, NextResponse } from 'next/server';
import { getAuthRedirectUri } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Google OAuth is not configured yet. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local',
      },
      { status: 500 }
    );
  }

  const redirectUri = getAuthRedirectUri(request);
  const linkDrive = request.nextUrl.searchParams.get('link_drive') === 'true';

  // Normal users ONLY get openid, email, profile. Master Admin linking Drive gets drive scope.
  const scope = linkDrive
    ? encodeURIComponent('openid email profile https://www.googleapis.com/auth/drive')
    : encodeURIComponent('openid email profile');

  const prompt = linkDrive ? 'consent' : 'select_account';
  const stateParam = linkDrive ? '&state=vault_link' : '';

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&prompt=${prompt}&access_type=offline${stateParam}`;

  return NextResponse.redirect(googleAuthUrl);
}
