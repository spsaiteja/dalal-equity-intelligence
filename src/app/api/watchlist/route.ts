import { NextRequest, NextResponse } from 'next/server';
import { loadWatchlistFromDisk, saveWatchlistToDisk } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

