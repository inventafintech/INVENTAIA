import { NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { IntegrationService } from '@/services/IntegrationService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integraciones/woocommerce/sync
 * Sincroniza el catálogo WooCommerce (WC REST API v3) y persiste
 * productos + stock en Supabase. Sin credenciales → 400 honesto.
 */
export async function POST() {
  const session = await SessionManager.getSession().catch(() => null);
  const workspaceId = session?.workspaceId && session.workspaceId !== 'ws-default' ? session.workspaceId : null;

  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();
  const wsId =
    workspaceId ||
    (await supabase.from('workspaces').select('id').limit(1).maybeSingle().then((r) => r.data?.id)) ||
    'ws-default';

  const auth = await IntegrationService.getProviderAuth(wsId, 'woocommerce');
  const cfg = auth.config || {};
  const storeUrl = cfg.storeUrl;
  const consumerKey = cfg.consumerKey;
  const consumerSecret = cfg.consumerSecret;

  if (!storeUrl || !consumerKey || !consumerSecret) {
    await IntegrationService.logIntegrationEvent(
      wsId, session?.email || 'sistema@inventa.ai', 'WooCommerce', 'PENDIENTE',
      'Sincronización rechazada: sin credenciales. Estado: Pendiente de configuración.'
    );
    return NextResponse.json(
      {
        error: 'Conexión no configurada',
        message: 'Registra la URL y las claves de WooCommerce para sincronizar.',
        status: 'pending_configuration',
      },
      { status: 400 }
    );
  }

  try {
    const base = String(storeUrl).replace(/\/+$/, '');
    const basic = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const res = await fetch(`${base}/wp-json/wc/v3/products?per_page=20`, {
      headers: { Authorization: `Basic ${basic}` },
    });
    if (res.status === 401 || res.status === 403) {
      await IntegrationService.logIntegrationEvent(wsId, session?.email || 'sistema@inventa.ai', 'WooCommerce', 'ERROR', 'Credenciales rechazadas (401/403).');
      return NextResponse.json({ error: 'WooCommerce rechazó las credenciales.' }, { status: 502 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `WooCommerce HTTP ${res.status}.` }, { status: 502 });
    }
    const items = await res.json();
    let synced = 0;
    let stock = 0;
    for (const it of Array.isArray(items) ? items : []) {
      if (!it?.id) continue;
      const pid = `woo-${it.id}`;
      await supabase.from('products').upsert({
        id: pid,
        sku_code: it.sku || `SKU-WOO-${it.id}`,
        name: it.name || `Producto WooCommerce ${it.id}`,
        unit_cost: Number(it.prices?.regular_price || it.regular_price || 0) * 0.6,
        unit_price: Number(it.prices?.regular_price || it.regular_price || 0),
        status: it.status === 'publish' ? 'active' : 'paused',
        updated_at: new Date().toISOString(),
      });
      const qty = Number(it.stock_quantity ?? 0);
      stock += Math.max(0, qty);
      await supabase.from('inventory_levels').upsert(
        { product_id: pid, physical_stock: Math.max(0, Math.floor(qty)) },
        { onConflict: 'product_id' }
      );
      synced++;
    }

    await IntegrationService.logIntegrationEvent(
      wsId, session?.email || 'sistema@inventa.ai', 'WooCommerce', 'EXITOSO',
      `Sincronización real: ${synced} productos, ${stock} unidades persistidas.`
    );
    return NextResponse.json({
      success: true,
      products_synced: synced,
      stock_synced: stock,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    await IntegrationService.logIntegrationEvent(wsId, session?.email || 'sistema@inventa.ai', 'WooCommerce', 'ERROR', err?.message || 'Excepción');
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 });
  }
}
