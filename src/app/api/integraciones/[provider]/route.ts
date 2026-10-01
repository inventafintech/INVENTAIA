import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/requireWorkspace';
import { SessionManager } from '@/lib/session';
import { IntegrationService } from '@/services/IntegrationService';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/integraciones/[provider] — revoca el acceso de forma segura:
 * limpia tokens y config (settings + tablas si existen) y audita.
 */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ provider: string }> }) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { provider } = await context.params;
    const key = decodeURIComponent(provider).toLowerCase();
    if (!key) {
      return NextResponse.json({ error: 'Proveedor inválido.' }, { status: 400 });
    }

    const session = await SessionManager.getSession().catch(() => null);
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    let workspaceId: string | null = null;
    if (session?.workspaceId && session.workspaceId !== 'ws-default') {
      workspaceId = session.workspaceId;
    } else {
      const { data: first } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
      workspaceId = first?.id || null;
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = { ...((ws?.settings as any) || {}) };
    delete settings[`oauth_${key}`];
    delete settings[`config_${key}`];
    await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);

    // Mejor esfuerzo: tablas dedicadas si la migración existe
    await supabase.from('oauth_tokens').delete().eq('workspace_id', workspaceId).eq('provider', key).then(() => {});
    await supabase.from('integrations').delete().eq('workspace_id', workspaceId).eq('provider', key).then(() => {});

    await IntegrationService.logIntegrationEvent(
      workspaceId,
      session?.email || 'sistema@inventa.ai',
      key.toUpperCase(),
      'EXITOSO',
      `Acceso revocado por el usuario: tokens y configuración eliminados.`
    );

    return NextResponse.json({ success: true, message: `Integración ${key} desconectada.` });
  } catch (error: any) {
    console.error('Error en DELETE integraciones:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
