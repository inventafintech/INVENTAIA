import { NextRequest, NextResponse } from 'next/server';
import { IntegrationService } from '@/services/IntegrationService';
import { requireWorkspace } from '@/lib/requireWorkspace';
import { resolveAuthIdentity } from '@/lib/currentUser';
import { resolveWorkspaceId } from '@/lib/locationsStore';

export const dynamic = 'force-dynamic';

async function readDispatches(supabase: any, workspaceId: string): Promise<any[]> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const stored = (ws?.settings as any)?.dispatches;
  return Array.isArray(stored) ? stored : [];
}

/**
 * PUT /api/inventory/dispatches/[id] — marca un despacho en tránsito como terminado.
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const key = decodeURIComponent(id).toUpperCase();
    const body = await req.json().catch(() => ({}));

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const history = await readDispatches(supabase, workspaceId);
    const idx = history.findIndex((d) => d.id.toUpperCase() === key);
    if (idx === -1) {
      return NextResponse.json({ error: 'Despacho no encontrado.' }, { status: 404 });
    }
    if (history[idx].status === 'terminado') {
      return NextResponse.json({ error: 'El despacho ya está terminado.' }, { status: 409 });
    }
    if (body?.status && body.status !== 'terminado') {
      return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
    }

    history[idx] = { ...history[idx], status: 'terminado', completedAt: new Date().toISOString() };

    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = { ...((ws?.settings as any) || {}), dispatches: history.slice(-500) };
    await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);

    const identity = await resolveAuthIdentity().catch(() => ({} as any));
    await IntegrationService.logIntegrationEvent(
      workspaceId,
      identity.email || 'sistema@inventa.ai',
      'Despachos',
      'EXITOSO',
      `Despacho ${history[idx].id} marcado como terminado.`
    ).catch(() => {});

    return NextResponse.json({ success: true, item: history[idx] });
  } catch (error: any) {
    console.error('Error en PUT dispatches:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
