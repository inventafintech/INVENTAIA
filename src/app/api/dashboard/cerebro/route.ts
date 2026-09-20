import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { DashboardService } from '@/services/DashboardService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace_id ||
      'ws-default';

    const dashboardData = await DashboardService.getExecutiveMetrics(workspaceId);

    return NextResponse.json({
      success: true,
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
