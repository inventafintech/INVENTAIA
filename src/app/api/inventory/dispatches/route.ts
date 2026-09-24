import { NextRequest, NextResponse } from 'next/server';
import { IntegrationService } from '@/services/IntegrationService';
import { resolveAuthIdentity } from '@/lib/currentUser';
import { resolveWorkspaceId } from '@/lib/locationsStore';
import type { DispatchType, DispatchRecord, DispatchLine } from '@/lib/dispatches';

export const dynamic = 'force-dynamic';

async function readDispatches(supabase: any, workspaceId: string): Promise<DispatchRecord[]> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const stored = (ws?.settings as any)?.dispatches;
  return Array.isArray(stored) ? (stored as DispatchRecord[]) : [];
}

async function writeDispatches(supabase: any, workspaceId: string, list: DispatchRecord[]): Promise<void> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const settings = { ...((ws?.settings as any) || {}), dispatches: list.slice(-500) };
  const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
  if (error) throw new Error(error.message || 'No se pudo guardar.');
}

function nextId(list: DispatchRecord[]): string {
  let max = 0;
  for (const d of list) {
    const m = /^DISP-(\d+)$/.exec(d.id || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `DISP-${String(max + 1).padStart(5, '0')}`;
}

async function displayName(supabase: any, email: string): Promise<string> {
  if (!email) return 'SYSTEM';
  const { data } = await supabase.from('users').select('name').eq('email', email).maybeSingle();
  return data?.name || email;
}

/**
 * GET /api/inventory/dispatches?q=&status=&type=&sort=&order=&page=&pageSize=
 * Salidas reales (settings del workspace) + KPIs + estado de integraciones.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim().replace(/\s+/g, ' ').toLowerCase() || '';
    const status = params.get('status') || 'all';
    const type = params.get('type') || 'all';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 10));
    const order = params.get('order') === 'asc' ? 'asc' : 'desc';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    let list = await readDispatches(supabase, workspaceId);

    if (status === 'transito' || status === 'terminado') list = list.filter((d) => d.status === status);
    if (type === 'venta' || type === 'traslado' || type === 'devolucion') list = list.filter((d) => d.type === type);
    if (q) {
      list = list.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.destination.toLowerCase().includes(q) ||
          d.dispatchedBy.toLowerCase().includes(q) ||
          d.lines.some((l) => l.sku.toLowerCase().includes(q) || l.name.toLowerCase().includes(q))
      );
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const kpis = {
      total: list.length,
      thisMonth: list.filter((d) => new Date(d.date).getTime() >= monthStart.getTime()).length,
      transito: list.filter((d) => d.status === 'transito').length,
      terminado: list.filter((d) => d.status === 'terminado').length,
    };

    const sorted = [...list].sort((a, b) =>
      order === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)
    );

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
      items: sorted.slice((page - 1) * pageSize, page * pageSize),
      total: list.length,
      page,
      pageSize,
      kpis,
      integrations: { pending: integrationsPending.length > 0, missing: integrationsPending },
    });
  } catch (error: any) {
    console.error('Error en GET dispatches:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * POST /api/inventory/dispatches — crea una salida: valida stock, descuenta
 * niveles reales, registra el despacho y lo audita en integration_logs.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const type = body?.type as DispatchType;
    const destination = typeof body?.destination === 'string' ? body.destination.trim().slice(0, 160) : '';
    const lines = Array.isArray(body?.lines) ? body.lines : [];

    if (type !== 'venta' && type !== 'traslado' && type !== 'devolucion') {
      return NextResponse.json({ error: 'Tipo inválido (venta, traslado, devolución).' }, { status: 400 });
    }
    if (!destination) {
      return NextResponse.json({ error: 'El cliente / destino es obligatorio.' }, { status: 400 });
    }
    if (lines.length === 0 || lines.length > 50) {
      return NextResponse.json({ error: 'Agrega entre 1 y 50 líneas.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    // Validar líneas contra productos y stock reales
    const cleanLines: DispatchLine[] = [];
    for (const l of lines) {
      const productId = typeof l?.productId === 'string' ? l.productId : '';
      const qty = Math.floor(Number(l?.qty));
      if (!productId) return NextResponse.json({ error: 'Línea sin producto.' }, { status: 400 });
      if (!Number.isInteger(qty) || qty <= 0) {
        return NextResponse.json({ error: 'Cada línea necesita cantidad entera mayor a cero.' }, { status: 400 });
      }
      const { data: product } = await supabase
        .from('products')
        .select('id,sku_code,name')
        .eq('id', productId)
        .maybeSingle();
      if (!product) {
        return NextResponse.json({ error: `Producto inexistente (${productId}).` }, { status: 404 });
      }
      const { data: level } = await supabase
        .from('inventory_levels')
        .select('physical_stock')
        .eq('product_id', productId)
        .maybeSingle();
      const current = Number(level?.physical_stock ?? 0);
      if (current < qty) {
        return NextResponse.json(
          { error: `Stock insuficiente en ${product.sku_code}: hay ${current} u, se piden ${qty} u.` },
          { status: 400 }
        );
      }
      cleanLines.push({ productId, sku: product.sku_code, name: product.name, qty });
    }

    // Descontar stock real
    for (const l of cleanLines) {
      const { data: level } = await supabase
        .from('inventory_levels')
        .select('physical_stock')
        .eq('product_id', l.productId)
        .maybeSingle();
      const next = Number(level?.physical_stock ?? 0) - l.qty;
      if (level) {
        await supabase.from('inventory_levels').update({ physical_stock: next }).eq('product_id', l.productId);
      } else {
        await supabase.from('inventory_levels').insert({
          id: `inv-${Date.now().toString(36)}-${l.productId.slice(-4)}`,
          product_id: l.productId,
          physical_stock: next,
          safety_stock: 0,
        });
      }
    }

    const identity = await resolveAuthIdentity().catch(() => ({} as any));
    const responsible = await displayName(supabase, identity.email || '');

    const history = await readDispatches(supabase, workspaceId);
    const record: DispatchRecord = {
      id: nextId(history),
      type,
      date: new Date().toISOString(),
      destination,
      clientRef: typeof body?.clientRef === 'string' ? body.clientRef.slice(0, 20) : null,
      dispatchedBy: responsible,
      lines: cleanLines,
      totalQty: cleanLines.reduce((a, l) => a + l.qty, 0),
      status: 'transito',
      completedAt: null,
      note: typeof body?.note === 'string' ? body.note.trim().slice(0, 280) : '',
    };
    await writeDispatches(supabase, workspaceId, [...history, record]);

    await IntegrationService.logIntegrationEvent(
      workspaceId,
      identity.email || 'sistema@inventa.ai',
      'Despachos',
      'EXITOSO',
      `Despacho ${record.id} creado: ${record.totalQty} u hacia ${destination}.`
    ).catch(() => {});

    return NextResponse.json({ success: true, item: record }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST dispatches:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/inventory/dispatches — anula despachos en tránsito revirtiendo
 * el stock descontado (los terminados no se tocan).
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Sin despachos seleccionados.' }, { status: 400 });
    }
    if (ids.length > 100) {
      return NextResponse.json({ error: 'Máximo 100 registros por operación.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const history = await readDispatches(supabase, workspaceId);
    const targets = history.filter((d) => ids.includes(d.id));
    const blocked = targets.filter((d) => d.status === 'terminado');
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: `No se puede anular ${blocked[0].id}: ya está terminado.` },
        { status: 409 }
      );
    }

    for (const d of targets) {
      for (const l of d.lines) {
        const { data: level } = await supabase
          .from('inventory_levels')
          .select('physical_stock')
          .eq('product_id', l.productId)
          .maybeSingle();
        if (level) {
          await supabase
            .from('inventory_levels')
            .update({ physical_stock: Number(level.physical_stock) + l.qty })
            .eq('product_id', l.productId);
        }
      }
    }

    await writeDispatches(
      supabase,
      workspaceId,
      history.filter((d) => !ids.includes(d.id))
    );
    return NextResponse.json({ success: true, message: `Se anularon ${targets.length} despachos y se devolvió el stock.` });
  } catch (error: any) {
    console.error('Error en DELETE dispatches:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
