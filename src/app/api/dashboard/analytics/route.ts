import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/services/AnalyticsService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = AnalyticsService.getOperationalAnalytics();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/dashboard/analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
