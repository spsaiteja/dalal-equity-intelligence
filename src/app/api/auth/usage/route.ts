import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getUserActivityStats } from '@/lib/user-activity';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser || sessionUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Master Admin access required' },
        { status: 403 }
      );
    }

    const activityData = await getUserActivityStats();

    return NextResponse.json({
      success: true,
      ...activityData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch usage stats' },
      { status: 500 }
    );
  }
}

