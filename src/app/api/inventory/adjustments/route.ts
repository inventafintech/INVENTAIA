import { NextRequest, NextResponse } from 'next/server';
import { IntegrationService } from '@/services/IntegrationService';
import { requireWorkspace } from '@/lib/requireWorkspace';
import { resolveAuthIdentity } from '@/lib/currentUser';

export const dynamic = 'force-dynamic';

const PAGE_SIZE_DEFAULT = 10;
const HISTORY_CAP = 500;

export type AdjustmentType = 'correccion' | 'transferencia' | 'consumo';

export interface StockAdjustment {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  locationRef: string;
  date: string;
  type: AdjustmentType;
  qtyDelta: number;
  reason: string;
  responsible: string;
  status: 'aplicado';
  toLocationRef?: string;
}

const TYPE_LABEL: Record<AdjustmentType, string> = {
  correccion: 'Corrección',
  transferencia: 'Transferencia',
  consumo: 'Consumo',
};

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

async function readHistory(supabase: any, workspaceId: string): Promise<StockAdjustment[]> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const stored = (ws?.settings as any)?.stockAdjustments;
  return Array.isArray(stored) ? (stored as StockAdjustment[]) : [];
}

async function writeHistory(supabase: any, workspaceId: string, history: StockAdjustment[]): Promise<void> {
  const trimmed = history.slice(-HISTORY_CAP);
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const settings = { ...((ws?.settings as any) || {}), stockAdjustments: trimmed };
  const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
  if (error) throw new Error(error.message || 'No se pudo guardar.');
}

function nextRef(history: StockAdjustment[]): string {
  let max = 0;
  for (const h of history) {
    const m = /^ADJ-(\d+)$/.exec(h.id || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `ADJ-${String(max + 1).padStart(5, '0')}`;
}

async function displayName(supabase: any, email: string): Promise<string> {
  if (!email) return 'SYSTEM';
  const { data } = await supabase.from('users').select('name').eq('email', email).maybeSingle();
  return data?.name || email;
}

/**
 * GET /api/inventory/adjustments?q=&type=&location_id=&sort=&order=&page=&pageSize=
 * Historial real (settings del workspace) + KPIs por tipo + estado ERP.
 * location_id filtra por ubicación origen o destino (transferencias "A → B").
 * Los KPIs se recalculan sobre el subconjunto filtrado.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim().replace(/\s+/g, ' ').toLowerCase() || '';
    const type = params.get('type') || 'all';
    const rawLocation = params.get('location_id') || params.get('locationId') || params.get('location') || '';
    const locationRef = rawLocation.trim() && rawLocation.trim() !== 'all' ? rawLocation.trim().toUpperCase() : null;
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || PAGE_SIZE_DEFAULT));
    const order = params.get('order') === 'asc' ? 'asc' : 'desc';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    let list = await readHistory(supabase, workspaceId);

    if (type === 'correccion' || type === 'transferencia' || type === 'consumo') {
      list = list.filter((h) => h.type === type);
    }
    if (locationRef) {
      list = list.filter(
        (h) =>
          (h.locationRef || '').toUpperCase().includes(locationRef) ||
          (h.toLocationRef || '').toUpperCase() === locationRef
      );
    }
    if (q) {
      list = list.filter(
        (h) =>
          h.id.toLowerCase().includes(q) ||
          h.sku.toLowerCase().includes(q) ||
          h.productName.toLowerCase().includes(q) ||
          h.reason.toLowerCase().includes(q) ||
          h.responsible.toLowerCase().includes(q) ||
          h.locationRef.toLowerCase().includes(q)
      );
    }

    const kpis = {
      total: list.length,
      correcciones: list.filter((h) => h.type === 'correccion').length,
      transferencias: list.filter((h) => h.type === 'transferencia').length,
      consumos: list.filter((h) => h.type === 'consumo').length,
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
      typeLabels: TYPE_LABEL,
      locationFilter: { locationRef },
      integrations: { pending: integrationsPending.length > 0, missing: integrationsPending },
    });
  } catch (error: any) {
    console.error('Error en GET adjustments:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * POST /api/inventory/adjustments — aplica un ajuste real al stock físico
 * (corrección ±, consumo −, transferencia de ubicación) y lo registra.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => null);
    const productId = typeof body?.productId === 'string' ? body.productId : '';
    const type = body?.type as AdjustmentType;
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 280) : '';

    if (!productId) return NextResponse.json({ error: 'El producto es obligatorio.' }, { status: 400 });
    if (type !== 'correccion' && type !== 'transferencia' && type !== 'consumo') {
      return NextResponse.json({ error: 'Tipo inválido (correccion, transferencia, consumo).' }, { status: 400 });
    }
    if (!reason) return NextResponse.json({ error: 'El motivo es obligatorio.' }, { status: 400 });

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

    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = { ...((ws?.settings as any) || {}) };
    const placement = { ...(settings.inventoryPlacement || {}) };
    const currentPlace = placement[productId] || { branch: 'Sede Lima Central', locationRef: 'LOC-00004' };

    let qtyDelta = 0;
    let toLocationRef: string | undefined;

    if (type === 'transferencia') {
      toLocationRef =
        typeof body?.toLocationRef === 'string' ? body.toLocationRef.trim().slice(0, 20).toUpperCase() : '';
      if (!toLocationRef) {
        return NextResponse.json({ error: 'La ubicación destino es obligatoria.' }, { status: 400 });
      }
      if (toLocationRef === currentPlace.locationRef) {
        return NextResponse.json({ error: 'El destino debe diferir del origen.' }, { status: 400 });
      }
      placement[productId] = { branch: currentPlace.branch, locationRef: toLocationRef };
      settings.inventoryPlacement = placement;
    } else {
      const qty = body?.qty === undefined || body?.qty === '' ? NaN : Math.floor(Number(body.qty));
      if (!Number.isInteger(qty) || qty === 0) {
        return NextResponse.json({ error: 'La cantidad debe ser un entero distinto de cero.' }, { status: 400 });
      }
      if (type === 'consumo' && qty > 0) {
        return NextResponse.json({ error: 'El consumo resta stock: usa cantidad negativa.' }, { status: 400 });
      }
      qtyDelta = qty;

      const { data: level } = await supabase
        .from('inventory_levels')
        .select('physical_stock,safety_stock')
        .eq('product_id', productId)
        .maybeSingle();
      const current = Number(level?.physical_stock ?? 0);
      const next = current + qtyDelta;
      if (next < 0) {
        return NextResponse.json(
          { error: `Stock insuficiente: hay ${current} u y el ajuste deja ${next} u.` },
          { status: 400 }
        );
      }
      if (level) {
        const { error } = await supabase
          .from('inventory_levels')
          .update({ physical_stock: next })
          .eq('product_id', productId);
        if (error) return NextResponse.json({ error: 'No se pudo actualizar el stock.' }, { status: 500 });
      } else {
        const { error } = await supabase.from('inventory_levels').insert({
          id: `inv-${Date.now().toString(36)}`,
          product_id: productId,
          physical_stock: next,
          safety_stock: 0,
        });
        if (error) return NextResponse.json({ error: 'No se pudo registrar el stock.' }, { status: 500 });
      }
    }

    const identity = await resolveAuthIdentity().catch(() => ({} as any));
    const responsibleEmail = identity.email || 'sistema@inventa.ai';
    const responsible = await displayName(supabase, responsibleEmail);

    // Escritura única y atómica: historial + placement (evita sobreescrituras)
    const history = await readHistory(supabase, workspaceId);
    const entry = {
      id: nextRef(history),
      productId,
      sku: product.sku_code,
      productName: product.name,
      locationRef: type === 'transferencia' ? `${currentPlace.locationRef} → ${toLocationRef}` : currentPlace.locationRef,
      date: new Date().toISOString(),
      type,
      qtyDelta,
      reason,
      responsible,
      status: 'aplicado' as const,
      ...(toLocationRef ? { toLocationRef } : {}),
    };
    const { data: wsFresh } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const finalSettings = { ...((wsFresh?.settings as any) || {}) };
    finalSettings.stockAdjustments = [...history, entry].slice(-500);
    if (type === 'transferencia') {
      finalSettings.inventoryPlacement = placement;
    }
    const { error: saveError } = await supabase.from('workspaces').update({ settings: finalSettings }).eq('id', workspaceId);
    if (saveError) {
      return NextResponse.json({ error: 'No se pudo registrar el ajuste.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: entry }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST adjustments:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/inventory/adjustments — elimina registros del historial por ids.
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Sin ajustes seleccionados.' }, { status: 400 });
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

    const history = await readHistory(supabase, workspaceId);
    const remaining = history.filter((h) => !ids.includes(h.id));
    await writeHistory(supabase, workspaceId, remaining);
    return NextResponse.json({ success: true, message: `Se eliminaron ${history.length - remaining.length} ajustes del historial.` });
  } catch (error: any) {
    console.error('Error en DELETE adjustments:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
