import { NextRequest, NextResponse } from 'next/server';
import {
  signSessionPayload,
  getAdminEmail,
  isUserApproved,
  recordPendingUser,
  AUTH_COOKIE_NAME,
  AuthUser,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Allow dev login in local development or if explicitly enabled
  const isDev = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_LOGIN === 'true';

  if (!isDev) {
    return NextResponse.json(
      { success: false, error: 'Dev login is disabled in production' },
      { status: 403 }
    );
  }

  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body
    }

    const email = (body?.email || getAdminEmail()).trim().toLowerCase();
    const name = body?.name || (email === getAdminEmail() ? 'Master Admin' : email.split('@')[0]);
    const isAdmin = email === getAdminEmail();
    const isApproved = isAdmin || isUserApproved(email);

    const authUser: AuthUser = {
      id: `dev_${email}`,
      email,
      name,
      picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      role: isAdmin ? 'admin' : 'user',
      isApproved,
    };

    if (!isApproved) {
      recordPendingUser({ email, name, picture: authUser.picture });
    }

    const sessionToken = signSessionPayload(authUser);

    const response = NextResponse.json({
      success: true,
      message: `Signed in as ${email}`,
      user: authUser,
    });

    response.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Dev login failed' },
      { status: 500 }
    );
  }
}

