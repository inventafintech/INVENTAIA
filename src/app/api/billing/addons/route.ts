import { NextResponse } from 'next/server';
import { ADDONS, resolveAddonStatus } from '@/lib/addons';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/addons
 * Catálogo con estado real de facturación: si hay STRIPE_SECRET_KEY y el
 * complemento tiene Price ID, ofrece autoservicio; si no, sales-led.
 * Los de autoservicio aparecen primero.
 */
export async function GET() {
  try {
    const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

    let cycle: 'mensual' | 'anual' = 'mensual';
    try {
      const { createClient } = await import('@/utils/supabase/server');
      const supabase = await createClient();
      const { data: ws } = await supabase.from('workspaces').select('settings').limit(1).maybeSingle();
      const stored = (ws?.settings as any)?.billing?.cycle;
      if (stored === 'anual' || stored === 'mensual') cycle = stored;
    } catch {
      // valor por defecto
    }

    const billing = { stripeConfigured, billingCycle: cycle, annualDiscountPct: 20 };
    const addons = ADDONS.map((a) => ({ ...a, ...resolveAddonStatus(a, billing) }));
    addons.sort((x, y) => (x.mode === y.mode ? 0 : x.mode === 'self-service' ? -1 : 1));

    return NextResponse.json({ success: true, billing, addons });
  } catch (error: any) {
    console.error('Error en GET /api/billing/addons:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
