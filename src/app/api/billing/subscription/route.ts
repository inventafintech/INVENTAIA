import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_SUBSCRIPTION, PLAN_LIMITS, effectivePlan, SubscriptionState } from '@/lib/preferences';

export const dynamic = 'force-dynamic';

const TRIAL_DAYS = 7;

async function loadSubscription(supabase: any, workspaceId: string): Promise<SubscriptionState> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const stored = (ws?.settings as any)?.subscription;
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SUBSCRIPTION };
  return {
    plan: ['light', 'essential', 'pro', 'enterprise'].includes(stored.plan) ? stored.plan : 'light',
    status: ['none', 'trial', 'active', 'expired', 'cancelled'].includes(stored.status) ? stored.status : 'none',
    trialEndsAt: typeof stored.trialEndsAt === 'string' ? stored.trialEndsAt : null,
    updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : null,
  };
}

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
 * GET /api/billing/subscription — plan efectivo, trial y límites reales.
 */
export async function GET() {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }
    const stored = await loadSubscription(supabase, workspaceId);
    const eff = effectivePlan(stored);
    return NextResponse.json({
      success: true,
      plan: eff.plan,
      status: eff.status,
      trialDaysLeft: eff.trialDaysLeft,
      trialEndsAt: stored.trialEndsAt,
      limits: PLAN_LIMITS[eff.plan],
    });
  } catch (error: any) {
    console.error('Error en GET subscription:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * POST /api/billing/subscription { action: 'start-trial' | 'cancel' }
 * Prueba gratuita de Essential por 7 días, sin tarjeta (real, con fechas).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const action = body?.action;

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const stored = await loadSubscription(supabase, workspaceId);
    const eff = effectivePlan(stored);

    if (action === 'start-trial') {
      if (eff.status === 'trial' || eff.status === 'active') {
        return NextResponse.json({ error: 'Ya tienes una suscripción o prueba activa.' }, { status: 409 });
      }
      const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86400000).toISOString();
      const next: SubscriptionState = {
        plan: 'essential',
        status: 'trial',
        trialEndsAt,
        updatedAt: new Date().toISOString(),
      };
      const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
      const settings = { ...((ws?.settings as any) || {}), subscription: next };
      const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
      if (error) return NextResponse.json({ error: 'No se pudo iniciar la prueba.' }, { status: 500 });

      await supabase.from('integration_logs').insert({
        id: `log-${Date.now().toString(36)}`,
        usuario: 'sistema@inventa.ai',
        integracion: 'Facturación',
        resultado: 'EXITOSO',
        errores: `Prueba Essential iniciada por 7 días (hasta ${trialEndsAt.slice(0, 10)}). Sin cargo durante la prueba.`,
        fecha: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, ...effectivePlan(next), trialEndsAt }, { status: 201 });
    }

    if (action === 'cancel') {
      const next: SubscriptionState = {
        plan: 'light',
        status: 'cancelled',
        trialEndsAt: null,
        updatedAt: new Date().toISOString(),
      };
      const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
      const settings = { ...((ws?.settings as any) || {}), subscription: next };
      await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
      return NextResponse.json({ success: true, ...effectivePlan(next) });
    }

    return NextResponse.json({ error: 'Acción inválida (start-trial o cancel).' }, { status: 400 });
  } catch (error: any) {
    console.error('Error en POST subscription:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
