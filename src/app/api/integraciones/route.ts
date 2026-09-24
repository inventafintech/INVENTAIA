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

    // Persistencia real de la configuración en settings (config_{provider}).
    // Antes este endpoint solo registraba el evento: ahora guarda de verdad.
    if (config && typeof config === 'object') {
      const { createClient } = await import('@/utils/supabase/server');
      const supabase = await createClient();
      const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
      const settings = {
        ...((ws?.settings as any) || {}),
        [`config_${provider}`]: { ...((((ws?.settings as any) || {})[`config_${provider}`] as any) || {}), ...config },
      };
      const { error: saveError } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
      if (saveError) {
        return NextResponse.json({ success: false, error: 'No se pudo guardar la configuración.' }, { status: 500 });
      }
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
