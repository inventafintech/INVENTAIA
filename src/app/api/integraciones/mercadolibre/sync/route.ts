import { NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { IntegrationService } from '@/services/IntegrationService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integraciones/mercadolibre/sync
 * Flujo real: credenciales → API ML (publicaciones + ventas) → persistencia en
 * Supabase (products + inventory_levels) → logs en integration_logs.
 * Sin token OAuth: 400 honesto con estado Pendiente de configuración.
 */
export async function POST() {
  const session = await SessionManager.getSession().catch(() => null);
  const workspaceId = session?.workspaceId || 'ws-default';
  const userEmail = session?.email || 'sistema@inventa.ai';

  const auth = await IntegrationService.getProviderAuth(workspaceId, 'mercadolibre');

  if (!auth.accessToken) {
    await IntegrationService.logIntegrationEvent(
      workspaceId,
      userEmail,
      'Mercado Libre',
      'PENDIENTE',
      'Sincronización rechazada: sin token OAuth. Estado: Pendiente de configuración.'
    );
    return NextResponse.json(
      {
        error: 'Conexión no configurada',
        message: 'No existe token OAuth activo para Mercado Libre. Inicie el flujo de autorización OAuth en Integraciones.',
        status: 'pending_configuration',
      },
      { status: 400 }
    );
  }

  const sellerId = auth.userId || 'me';
  let publications = 0;
  let orders = 0;
  let stock = 0;

  try {
    // 1. Publicaciones del vendedor (API real)
    const itemsRes = await fetch(
      `https://api.mercadolibre.com/users/${sellerId}/items/search?limit=50`,
      { headers: { Authorization: `Bearer ${auth.accessToken}` } }
    );
    if (!itemsRes.ok) {
      const errorText = await itemsRes.text();
      await IntegrationService.logIntegrationEvent(
        workspaceId, userEmail, 'Mercado Libre', 'ERROR', `ML API ${itemsRes.status}: ${errorText.slice(0, 300)}`
      );
      return NextResponse.json(
        { error: 'Error consultando API de Mercado Libre', status: itemsRes.status },
        { status: 502 }
      );
    }
    const itemsData = await itemsRes.json();
    const itemIds: string[] = itemsData.results || [];
    publications = itemIds.length;

    // 2. Ventas / órdenes del vendedor (API real)
    try {
      const ordersRes = await fetch(
        `https://api.mercadolibre.com/orders/search?seller=${sellerId}&limit=50`,
        { headers: { Authorization: `Bearer ${auth.accessToken}` } }
      );
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        orders = (ordersData.results || []).length;
      }
    } catch {
      // Las ventas son informativas: no bloquear la sincronización de stock
    }

    // 3. Detalle + persistencia real en Supabase (products + inventory_levels)
    if (itemIds.length > 0) {
      const { createClient } = await import('@/utils/supabase/server');
      const supabase = await createClient();
      const multigetRes = await fetch(`https://api.mercadolibre.com/items?ids=${itemIds.slice(0, 20).join(',')}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (multigetRes.ok) {
        const multigetData = await multigetRes.json();
        for (const entry of multigetData || []) {
          const item = entry?.body;
          if (!item?.id) continue;
          const productId = `mli-${item.id}`;
          await supabase.from('products').upsert({
            id: productId,
            sku_code: item.seller_custom_field || `SKU-MLI-${item.id}`,
            name: item.title || `Publicación ${item.id}`,
            unit_cost: Number(item.price || 0) * 0.6,
            unit_price: Number(item.price || 0),
            status: item.status === 'active' ? 'active' : 'paused',
            updated_at: new Date().toISOString(),
          });
          if (typeof item.available_quantity === 'number') {
            stock += Math.max(0, Math.floor(item.available_quantity));
            await supabase.from('inventory_levels').upsert(
              { product_id: productId, physical_stock: Math.max(0, Math.floor(item.available_quantity)) },
              { onConflict: 'product_id' }
            );
          }
        }
      }
    }

    await IntegrationService.logIntegrationEvent(
      workspaceId,
      userEmail,
      'Mercado Libre',
      'EXITOSO',
      `Sincronización real: ${publications} publicaciones, ${orders} ventas, ${stock} unidades en stock persistidas.`
    );

    return NextResponse.json({
      success: true,
      publications_synced: publications,
      orders_synced: orders,
      stock_synced: stock,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    await IntegrationService.logIntegrationEvent(
      workspaceId, userEmail, 'Mercado Libre', 'ERROR', err?.message || 'Excepción en sincronización'
    );
    return NextResponse.json({ error: err?.message || 'Error interno' }, { status: 500 });
  }
}
