import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, getAdminEmail, getPendingUsers } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = getSessionUser(request);
    const hasGoogleConfig = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const adminEmail = getAdminEmail();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        isApproved: false,
        isAdmin: false,
        user: null,
        hasGoogleConfig,
        adminEmail,
      });
    }

    const pendingCount = user.role === 'admin' ? getPendingUsers().length : 0;

    return NextResponse.json({
      authenticated: true,
      isApproved: user.isApproved,
      isAdmin: user.role === 'admin',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
      },
      hasGoogleConfig,
      adminEmail,
      pendingCount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, error: err.message || 'Session check failed' },
      { status: 500 }
    );
  }
}

