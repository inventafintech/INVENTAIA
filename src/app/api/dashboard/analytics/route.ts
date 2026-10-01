import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/services/AnalyticsService';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
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
