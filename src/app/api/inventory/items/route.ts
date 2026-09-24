import { NextRequest, NextResponse } from 'next/server';
import { IntegrationService } from '@/services/IntegrationService';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_DEFAULT = 10;
const DEFAULT_BRANCH = 'Sede Lima Central';
const DEFAULT_LOCATION = 'LOC-00004';

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
 * GET /api/inventory/items?q=&hideZero=&sort=&order=&page=&pageSize=
 * Artículos físicos reales (products × inventory_levels) + ubicación/sucursal
 * (settings.inventoryPlacement o valores por defecto) + KPIs + estado de
 * integraciones ERP/tiendas (regla: mostrar "Pendiente de configuración").
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim().replace(/\s+/g, ' ') || '';
    const hideZero = params.get('hideZero') === '1';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || PAGE_SIZE_DEFAULT));

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const [{ data: products }, { data: levels }, { data: ws }] = await Promise.all([
      (() => {
        let query = supabase.from('products').select('id,sku_code,name,unit_cost,status').eq('status', 'active');
        if (q) {
          const pattern = `%${q.replace(/[,()]/g, '')}%`;
          query = query.or(`name.ilike.${pattern},sku_code.ilike.${pattern}`);
        }
        return query;
      })(),
      supabase.from('inventory_levels').select('product_id,physical_stock,safety_stock'),
      supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle(),
    ]);

    const placement = ((ws?.settings as any)?.inventoryPlacement as Record<string, any>) || {};
    const levelByProduct = new Map((levels || []).map((l: any) => [l.product_id, l]));

    let items = (products || []).map((p: any) => {
      const level = levelByProduct.get(p.id) || {};
      const place = placement[p.id] || {};
      return {
        id: p.id,
        sku: p.sku_code,
        name: p.name,
        qty: Number(level.physical_stock ?? 0),
        safety: Number(level.safety_stock ?? 0),
        hasLevel: Boolean(level.product_id),
        branch: place.branch || DEFAULT_BRANCH,
        locationRef: place.locationRef || DEFAULT_LOCATION,
        unitCost: Number(p.unit_cost) || 0,
      };
    });

    if (hideZero) items = items.filter((i) => i.qty > 0);

    const kpis = {
      totalQty: items.reduce((a, i) => a + i.qty, 0),
      totalValue: Number(items.reduce((a, i) => a + i.qty * i.unitCost, 0).toFixed(2)),
      uniqueProducts: new Set(items.map((i) => i.id)).size,
      activeLocations: new Set(items.filter((i) => i.qty > 0).map((i) => i.locationRef)).size,
    };

    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);

    // Estado de integraciones externas (ERP / tiendas)
    let integrationsPending: string[] = [];
    try {
      const all = await IntegrationService.getAllIntegrations(workspaceId);
      integrationsPending = all
        .filter((c: any) => ['shopify', 'mercadolibre', 'sap'].includes(c.provider) && c.status !== 'ACTIVE')
        .map((c: any) => c.name);
    } catch {
      integrationsPending = ['Shopify', 'Mercado Libre', 'SAP'];
    }

    return NextResponse.json({
      success: true,
      items: paged,
      total,
      page,
      pageSize,
      kpis,
      integrations: { pending: integrationsPending.length > 0, missing: integrationsPending },
    });
  } catch (error: any) {
    console.error('Error en GET /api/inventory/items:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * POST /api/inventory/items — nuevo artículo: alta de stock (+placement)
 * para un producto existente. 409 si ya tiene nivel registrado.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const productId = typeof body?.productId === 'string' ? body.productId : '';
    const qty = body?.qty === undefined || body?.qty === '' ? NaN : Math.floor(Number(body.qty));
    const branch = typeof body?.branch === 'string' && body.branch.trim() ? body.branch.trim().slice(0, 120) : DEFAULT_BRANCH;
    const locationRef =
      typeof body?.locationRef === 'string' && body.locationRef.trim()
        ? body.locationRef.trim().slice(0, 20).toUpperCase()
        : DEFAULT_LOCATION;

    if (!productId) return NextResponse.json({ error: 'El producto es obligatorio.' }, { status: 400 });
    if (!Number.isInteger(qty) || qty < 0) {
      return NextResponse.json({ error: 'La cantidad debe ser un entero mayor o igual a 0.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const { data: product } = await supabase
      .from('products')
      .select('id,sku_code,name')
      .eq('id', productId)
      .maybeSingle();
    if (!product) {
      return NextResponse.json({ error: 'El producto no existe.' }, { status: 404 });
    }
    const { data: existing } = await supabase
      .from('inventory_levels')
      .select('product_id')
      .eq('product_id', productId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: 'El producto ya tiene nivel registrado. Usa Ajustes de stock para modificarlo.' },
        { status: 409 }
      );
    }

    const { error: insError } = await supabase.from('inventory_levels').insert({
      id: `inv-${Date.now().toString(36)}`,
      product_id: productId,
      physical_stock: qty,
      safety_stock: 0,
    });
    if (insError) {
      return NextResponse.json({ error: 'No se pudo registrar el artículo.' }, { status: 500 });
    }

    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = { ...((ws?.settings as any) || {}) };
    settings.inventoryPlacement = { ...(settings.inventoryPlacement || {}), [productId]: { branch, locationRef } };
    await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);

    return NextResponse.json({ success: true, message: `Artículo ${product.sku_code} registrado con ${qty} u.` }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/inventory/items:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/inventory/items — borra líneas de stock por ids de producto
 * (el producto del catálogo se conserva).
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Sin artículos seleccionados.' }, { status: 400 });
    }
    if (ids.length > 100) {
      return NextResponse.json({ error: 'Máximo 100 artículos por operación.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { error } = await supabase.from('inventory_levels').delete().in('product_id', ids);
    if (error) {
      return NextResponse.json({ error: 'No se pudieron eliminar las líneas.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: `Se quitaron ${ids.length} artículos del inventario.` });
  } catch (error: any) {
    console.error('Error en DELETE /api/inventory/items:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
