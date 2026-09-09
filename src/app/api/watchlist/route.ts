import { NextRequest, NextResponse } from 'next/server';
import { loadWatchlistFromDisk, saveWatchlistToDisk } from '@/lib/storage';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionUser = getSessionUser(request);
    if (!sessionUser || !sessionUser.isApproved) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = loadWatchlistFromDisk();
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to read watchlist' },
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

    const body = await request.json();
    const { watchlist, buckets } = body;

    if (!Array.isArray(watchlist)) {
      return NextResponse.json(
        { success: false, error: 'Invalid watchlist payload' },
        { status: 400 }
      );
    }

    saveWatchlistToDisk(watchlist, buckets);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save watchlist' },
      { status: 500 }
    );
  }
}

