import { NextResponse } from 'next/server';
import { fetchMarketIndices } from '@/lib/yahoo-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const indices = await fetchMarketIndices();
    return NextResponse.json({ success: true, data: indices });
  } catch (error: any) {
    console.error('Market indices API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch indices' },
      { status: 500 }
    );
  }
}

