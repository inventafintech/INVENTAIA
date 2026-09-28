import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { DashboardService } from '@/services/DashboardService';
import { normalizeLocationFilter } from '@/services/LocationsService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const filter = normalizeLocationFilter(
      params.get('location_id') || params.get('locationId') || params.get('location'),
      params.get('branch')
    );
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace_id ||
      'ws-default';

    const dashboardData = await DashboardService.getExecutiveMetrics(workspaceId, filter);

    return NextResponse.json({
      success: true,
      locationFilter: filter,
      ...dashboardData,
    });
  } catch (error: any) {
    console.error('Error fetching executive dashboard metrics:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
