import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { IntegrationService } from '@/services/IntegrationService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace_id ||
      'ws-default';

    const integrations = await IntegrationService.getAllIntegrations(workspaceId);

    return NextResponse.json({
      success: true,
      integrations,
    });
  } catch (error: any) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace_id ||
      'ws-default';

    const userEmail = nextAuthSession?.user?.email || customSession?.email || 'admin@inventa.ai';

    const body = await req.json();
    const { provider, status, config } = body;

    if (!provider) {
      return NextResponse.json({ success: false, error: 'Provider es requerido' }, { status: 400 });
    }

    await IntegrationService.logIntegrationEvent(
      workspaceId,
      userEmail,
      provider.toUpperCase(),
      status === 'ACTIVE' ? 'EXITOSO' : 'PENDIENTE',
      `Configuración de canal ${provider} actualizada.`
    );

    const integrations = await IntegrationService.getAllIntegrations(workspaceId);

    return NextResponse.json({
      success: true,
      integrations,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
