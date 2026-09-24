import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

async function readSettings(supabase: any, workspaceId: string): Promise<any> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  return (ws?.settings as any) || {};
}

/**
 * GET /api/inventory/alerts
 * Badges reales (productos, sucursales, IA por plan) + configuración de
 * umbrales global y por producto (settings.alertThresholds + safety real).
 */
export async function GET() {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const [{ data: products }, { data: levels }, { data: suppliers }, settings] = await Promise.all([
      supabase.from('products').select('id,sku_code,name,unit_cost,status').eq('status', 'active'),
      supabase.from('inventory_levels').select('product_id,physical_stock,safety_stock'),
      supabase.from('suppliers').select('id,lead_time_days,contact_info'),
      readSettings(supabase, workspaceId),
    ]);

    const levelByProduct = new Map((levels || []).map((l: any) => [l.product_id, l]));
    const leadBySku = new Map<string, number>();
    for (const s of suppliers || []) {
      const skus: string[] = Array.isArray((s.contact_info as any)?.skus) ? (s.contact_info as any).skus : [];
      for (const sku of skus) {
        if (!leadBySku.has(sku)) leadBySku.set(sku, Number(s.lead_time_days) || 0);
      }
    }

    const prefs = settings.preferences || {};
    const stored = settings.alertThresholds || {};
    const globalLow = typeof stored.globalLow === 'number' ? stored.globalLow : Number(prefs.lowStockThreshold ?? 10);
    const reminders = stored.reminders !== undefined ? Boolean(stored.reminders) : true;
    const push = stored.push !== undefined ? Boolean(stored.push) : true;
    const perProduct = stored.products && typeof stored.products === 'object' ? stored.products : {};

    const branches = new Set<string>();
    const placement = settings.inventoryPlacement || {};
    const items = (products || []).map((p: any) => {
      const level = levelByProduct.get(p.id) || {};
      const stock = Number(level.physical_stock ?? 0);
      const safety = Number(level.safety_stock ?? 0);
      const branch = placement[p.id]?.branch || 'Sede Lima Central';
      branches.add(branch);
      const leadTime = leadBySku.get(p.sku_code) ?? 0;
      const velocity = leadTime > 0 && safety > 0 ? safety / leadTime : 0;
      const rop = velocity > 0 ? Math.round(velocity * leadTime + safety) : Math.round(safety);
      const pp = perProduct[p.id] || {};
      return {
        id: p.id,
        sku: p.sku_code,
        name: p.name,
        stock,
        safety,
        rop,
        velocity: Number(velocity.toFixed(2)),
        low: typeof pp.low === 'number' ? pp.low : globalLow,
        alerts: pp.alerts !== undefined ? Boolean(pp.alerts) : true,
        branch,
        locationRef: placement[p.id]?.locationRef || 'LOC-00004',
      };
    });

    // Estado IA real: encendida en Essential+ (incluye trial vigente)
    let aiOn = false;
    try {
      const sub = settings.subscription;
      if (sub && typeof sub === 'object') {
        if (sub.status === 'active' && sub.plan !== 'light') aiOn = true;
        if (sub.status === 'trial' && sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() > Date.now()) aiOn = true;
      }
    } catch {
      aiOn = false;
    }

    return NextResponse.json({
      success: true,
      badges: { products: items.length, branches: branches.size, ai: aiOn ? 'Encendido' : 'Apagado' },
      defaults: { globalLow, reminders, push },
      items,
    });
  } catch (error: any) {
    console.error('Error en GET alerts:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * PUT /api/inventory/alerts
 * { globalLow?, reminders?, push?, products?: { [productId]: { low?, safety?, alerts? } } }
 * safety escribe inventory_levels (columna real); el resto va a settings.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const settings = await readSettings(supabase, workspaceId);
    const stored = (settings.alertThresholds && typeof settings.alertThresholds === 'object' ? settings.alertThresholds : {}) as any;
    const next: any = {
      globalLow: stored.globalLow,
      reminders: stored.reminders,
      push: stored.push,
      products: { ...(stored.products || {}) },
    };

    if (body.globalLow !== undefined) {
      const v = Math.floor(Number(body.globalLow));
      if (!Number.isInteger(v) || v < 0 || v > 1000000) {
        return NextResponse.json({ error: 'Umbral global inválido (0–1000000).' }, { status: 400 });
      }
      next.globalLow = v;
    }
    if (body.reminders !== undefined) next.reminders = Boolean(body.reminders);
    if (body.push !== undefined) next.push = Boolean(body.push);

    if (body.products !== undefined) {
      if (!body.products || typeof body.products !== 'object' || Array.isArray(body.products)) {
        return NextResponse.json({ error: 'products inválido.' }, { status: 400 });
      }
      const ids = Object.keys(body.products);
      if (ids.length > 200) {
        return NextResponse.json({ error: 'Máximo 200 productos por operación.' }, { status: 400 });
      }
      for (const pid of ids) {
        const { data: exists } = await supabase.from('products').select('id').eq('id', pid).maybeSingle();
        if (!exists) {
          return NextResponse.json({ error: `Producto inexistente (${pid}).` }, { status: 404 });
        }
        const cur = { ...(next.products[pid] || {}) };
        const upd = body.products[pid];
        if (upd.low !== undefined) {
          const v = Math.floor(Number(upd.low));
          if (!Number.isInteger(v) || v < 0 || v > 1000000) {
            return NextResponse.json({ error: `Umbral inválido para ${pid}.` }, { status: 400 });
          }
          cur.low = v;
        }
        if (upd.alerts !== undefined) cur.alerts = Boolean(upd.alerts);
        if (upd.safety !== undefined) {
          const s = Math.floor(Number(upd.safety));
          if (!Number.isInteger(s) || s < 0) {
            return NextResponse.json({ error: `Stock de seguridad inválido para ${pid}.` }, { status: 400 });
          }
          const { data: lvl } = await supabase
            .from('inventory_levels')
            .select('product_id')
            .eq('product_id', pid)
            .maybeSingle();
          if (lvl) {
            const { error } = await supabase.from('inventory_levels').update({ safety_stock: s }).eq('product_id', pid);
            if (error) return NextResponse.json({ error: 'No se pudo actualizar safety stock.' }, { status: 500 });
          } else {
            const { error } = await supabase.from('inventory_levels').insert({
              id: `inv-${Date.now().toString(36)}-${pid.slice(-4)}`,
              product_id: pid,
              physical_stock: 0,
              safety_stock: s,
            });
            if (error) return NextResponse.json({ error: 'No se pudo registrar safety stock.' }, { status: 500 });
          }
        }
        next.products[pid] = cur;
      }
    }

    const { error } = await supabase
      .from('workspaces')
      .update({ settings: { ...settings, alertThresholds: next } })
      .eq('id', workspaceId);
    if (error) {
      return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Configuración de alertas guardada.' });
  } catch (error: any) {
    console.error('Error en PUT alerts:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
