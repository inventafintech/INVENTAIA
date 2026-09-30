import { NextRequest, NextResponse } from 'next/server';
import { IntegrationService } from '@/services/IntegrationService';
import { resolveAuthIdentity } from '@/lib/currentUser';
import { resolveWorkspaceId } from '@/lib/locationsStore';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

export type ReceiptType = 'compra' | 'devolucion' | 'traslado';
export type ReceiptStatus = 'recibido' | 'cancelado';

export interface ReceiptLine {
  productId: string;
  sku: string;
  name: string;
  qty: number;
}

export interface ReceiptRecord {
  id: string;
  type: ReceiptType;
  date: string;
  supplier: string;
  supplierId: string | null;
  receivedBy: string;
  lines: ReceiptLine[];
  totalQty: number;
  status: ReceiptStatus;
  note: string;
}

async function readReceipts(supabase: any, workspaceId: string): Promise<ReceiptRecord[]> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const stored = (ws?.settings as any)?.receipts;
  return Array.isArray(stored) ? (stored as ReceiptRecord[]) : [];
}

async function writeReceipts(supabase: any, workspaceId: string, list: ReceiptRecord[]): Promise<void> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const settings = { ...((ws?.settings as any) || {}), receipts: list.slice(-500) };
  const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
  if (error) throw new Error(error.message || 'No se pudo guardar.');
}

function nextId(list: ReceiptRecord[]): string {
  let max = 0;
  for (const d of list) {
    const m = /^REC-(\d+)$/.exec(d.id || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `REC-${String(max + 1).padStart(5, '0')}`;
}

async function displayName(supabase: any, email: string): Promise<string> {
  if (!email) return 'SYSTEM';
  const { data } = await supabase.from('users').select('name').eq('email', email).maybeSingle();
  return data?.name || email;
}

/**
 * GET /api/inventory/receipts?q=&status=&type=&order=&page=&pageSize=
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

    let list = await readReceipts(supabase, workspaceId);

    if (status === 'recibido' || status === 'cancelado') list = list.filter((d) => d.status === status);
    if (type === 'compra' || type === 'devolucion' || type === 'traslado') list = list.filter((d) => d.type === type);
    if (q) {
      list = list.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.supplier.toLowerCase().includes(q) ||
          d.receivedBy.toLowerCase().includes(q) ||
          d.lines.some((l) => l.sku.toLowerCase().includes(q) || l.name.toLowerCase().includes(q))
      );
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const kpis = {
      total: list.length,
      thisMonth: list.filter((d) => new Date(d.date).getTime() >= monthStart.getTime()).length,
      recibido: list.filter((d) => d.status === 'recibido').length,
      cancelado: list.filter((d) => d.status === 'cancelado').length,
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
    console.error('Error en GET receipts:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * POST /api/inventory/receipts — registra una recepción: suma stock real
 * por línea (crea el nivel si no existe) y audita en integration_logs.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => null);
    const type = body?.type as string;
    const supplier = typeof body?.supplier === 'string' ? body.supplier.trim().slice(0, 160) : '';
    const lines = Array.isArray(body?.lines) ? body.lines : [];

    if (type !== 'compra' && type !== 'devolucion' && type !== 'traslado') {
      return NextResponse.json({ error: 'Tipo inválido (compra, devolución, traslado).' }, { status: 400 });
    }
    if (!supplier) {
      return NextResponse.json({ error: 'El proveedor / origen es obligatorio.' }, { status: 400 });
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

    const cleanLines: ReceiptLine[] = [];
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
      cleanLines.push({ productId, sku: product.sku_code, name: product.name, qty });
    }

    for (const l of cleanLines) {
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
      } else {
        await supabase.from('inventory_levels').insert({
          id: `inv-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
          product_id: l.productId,
          physical_stock: l.qty,
          safety_stock: 0,
        });
      }
    }

    const identity = await resolveAuthIdentity().catch(() => ({} as any));
    const receivedBy = await displayName(supabase, identity.email || '');

    const history = await readReceipts(supabase, workspaceId);
    const record: ReceiptRecord = {
      id: nextId(history),
      type: type as ReceiptType,
      date: new Date().toISOString(),
      supplier,
      supplierId: typeof body?.supplierId === 'string' ? body.supplierId : null,
      receivedBy,
      lines: cleanLines,
      totalQty: cleanLines.reduce((a, l) => a + l.qty, 0),
      status: 'recibido',
      note: typeof body?.note === 'string' ? body.note.trim().slice(0, 280) : '',
    };
    await writeReceipts(supabase, workspaceId, [...history, record]);

    await IntegrationService.logIntegrationEvent(
      workspaceId,
      identity.email || 'sistema@inventa.ai',
      'Recepciones',
      'EXITOSO',
      `Recepción ${record.id}: ${record.totalQty} u de ${supplier}.`
    ).catch(() => {});

    return NextResponse.json({ success: true, item: record }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST receipts:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/inventory/receipts — anula recepciones (recibido) revirtiendo
 * el stock sumado. Las canceladas no se tocan.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Sin recepciones seleccionadas.' }, { status: 400 });
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

    const history = await readReceipts(supabase, workspaceId);
    const targets = history.filter((d) => ids.includes(d.id));
    const blocked = targets.filter((d) => d.status === 'cancelado');
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: `No se puede anular ${blocked[0].id}: ya está cancelada.` },
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
          const next = Number(level.physical_stock) - l.qty;
          if (next < 0) {
            return NextResponse.json(
              { error: `No se puede anular ${d.id}: stock insuficiente en ${l.sku}.` },
              { status: 409 }
            );
          }
          await supabase.from('inventory_levels').update({ physical_stock: next }).eq('product_id', l.productId);
        }
      }
    }

    await writeReceipts(
      supabase,
      workspaceId,
      history.map((d) => (ids.includes(d.id) ? { ...d, status: 'cancelado' as const } : d))
    );
    return NextResponse.json({ success: true, message: `Se anularon ${targets.length} recepciones y se revirtió el stock.` });
  } catch (error: any) {
    console.error('Error en DELETE receipts:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
