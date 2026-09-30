import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthIdentity } from '@/lib/currentUser';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveWorkspaceId(supabase: any): Promise<string | null> {
  try {
    const { SessionManager } = await import('@/lib/session');
    const session = await SessionManager.getSession().catch(() => null);
    if (session?.workspaceId && session.workspaceId !== 'ws-default') {
      const { data } = await supabase.from('workspaces').select('id').eq('id', session.workspaceId).maybeSingle();
      if (data?.id) return data.id;
    }
  } catch {
    // continuar con el primero disponible
  }
  const { data: first } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
  return first?.id || null;
}

/**
 * POST /api/billing/contact — "Contactar ventas": registra un lead comercial
 * real (settings.sales_leads) y lo audita en integration_logs.
 */
export async function POST(req: NextRequest) {
  try {
    // Formulario público: frenar spam de leads por IP (5/min).
    const limited = rateLimit(req, { limit: 5, windowMs: 60_000, keyPrefix: 'lead' });
    if (limited) return limited;
    const body = await req.json().catch(() => null);
    const addonId = typeof body?.addonId === 'string' ? body.addonId.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const company = typeof body?.company === 'string' ? body.company.trim().slice(0, 160) : '';
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 500) : '';

    if (!addonId) return NextResponse.json({ error: 'Falta el complemento.' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
    }

    const { ADDONS } = await import('@/lib/addons');
    const addon = ADDONS.find((a) => a.id === addonId);
    if (!addon) {
      return NextResponse.json({ error: 'Complemento inexistente.' }, { status: 404 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const lead = {
      id: `lead-${Date.now().toString(36)}`,
      addonId,
      addonName: addon.name,
      name,
      email,
      company,
      message,
      createdAt: new Date().toISOString(),
    };

    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = { ...((ws?.settings as any) || {}) };
    const leads = Array.isArray(settings.sales_leads) ? settings.sales_leads : [];
    settings.sales_leads = [...leads, lead].slice(-200);
    const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
    if (error) {
      return NextResponse.json({ error: 'No se pudo registrar la solicitud.' }, { status: 500 });
    }

    const identity = await resolveAuthIdentity().catch(() => ({} as any));
    await supabase.from('integration_logs').insert({
      id: `log-${Date.now().toString(36)}`,
      usuario: identity.email || email,
      integracion: 'Comercial',
      resultado: 'EXITOSO',
      errores: `Lead ${lead.id}: ${name} solicita "${addon.name}".`,
      fecha: new Date().toISOString(),
    });

    return NextResponse.json(
      { success: true, message: 'Solicitud enviada. El equipo comercial te contactará.', leadId: lead.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error en POST billing/contact:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
