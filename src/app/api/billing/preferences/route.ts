import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/billing/preferences — persiste la preferencia Mensual/Anual
 * en settings.billing del workspace.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const cycle = body?.cycle;
    if (cycle !== 'mensual' && cycle !== 'anual') {
      return NextResponse.json({ error: 'Ciclo inválido (mensual o anual).' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    let workspaceId: string | null = null;
    try {
      const { SessionManager } = await import('@/lib/session');
      const session = await SessionManager.getSession().catch(() => null);
      if (session?.workspaceId && session.workspaceId !== 'ws-default') {
        const { data } = await supabase.from('workspaces').select('id').eq('id', session.workspaceId).maybeSingle();
        if (data?.id) workspaceId = data.id;
      }
    } catch {
      // continuar con el primero disponible
    }
    if (!workspaceId) {
      const { data: first } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
      workspaceId = first?.id || null;
    }
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = {
      ...((ws?.settings as any) || {}),
      billing: { ...((((ws?.settings as any) || {}).billing as any) || {}), cycle },
    };
    const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
    if (error) {
      return NextResponse.json({ error: 'No se pudo guardar la preferencia.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, cycle });
  } catch (error: any) {
    console.error('Error en PUT billing/preferences:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
