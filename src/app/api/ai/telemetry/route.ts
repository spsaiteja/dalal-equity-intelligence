import { NextResponse } from 'next/server';
import { getTelemetryStats, getRecentTelemetryRuns } from '@/lib/agents/telemetry';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [stats, recentRuns] = await Promise.all([
      getTelemetryStats(),
      getRecentTelemetryRuns(25),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      recentRuns,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in telemetry route:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve telemetry' },
      { status: 500 }
    );
  }
}
