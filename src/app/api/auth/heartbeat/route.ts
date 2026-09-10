import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { recordUserHeartbeat } from '@/lib/user-activity';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser || !sessionUser.isApproved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userAgent = request.headers.get('user-agent') || undefined;
    const stats = await recordUserHeartbeat(sessionUser, userAgent);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Heartbeat error' },
      { status: 500 }
    );
  }
}
