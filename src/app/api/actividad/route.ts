import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export type ActivityAction = 'creado' | 'modificado' | 'eliminado' | 'fallido';

export interface ActivityEvent {
  id: string;
  ts: string;
  action: ActivityAction;
  entity: string;
  title: string;
  detail: string;
  actor: string;
}

/**
 * Taxonomía honesta de la auditoría (documentada):
 * - CREADO: órdenes de compra registradas + logs EXITOSO.
 * - MODIFICADO: órdenes transmitidas (status sent) + logs PENDIENTE.
 * - ELIMINADO: el sistema no elimina registros → siempre 0 (estado vacío real).
 * - FALLIDO: logs FALLIDO; visibles solo en TODOS con badge rojo.
 */
function mapLogAction(resultado: string): ActivityAction | null {
  if (resultado === 'EXITOSO') return 'creado';
  if (resultado === 'PENDIENTE') return 'modificado';
  if (resultado === 'FALLIDO' || resultado === 'ERROR') return 'fallido';
  return 'modificado';
}

function shortTitle(errores: string, integracion: string): string {
  const oc = errores.match(/OC-[A-Za-z0-9-]+/);
  if (oc) return oc[0];
  if (/sincroniz/i.test(errores)) return 'Sincronización';
  if (/sesión|login|auth/i.test(errores)) return 'Sesión';
  const words = errores.split(/\s+/).slice(0, 6).join(' ');
  return words || integracion;
}

/**
 * GET /api/actividad?days=30&q=&action=all|creado|modificado|eliminado
 * Auditoría real: purchase_orders + integration_logs de Supabase.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const days = Math.min(Math.max(Number(params.get('days')) || 30, 1), 365);
    const q = (params.get('q') || '').trim().toLowerCase();
    const action = params.get('action') || 'all';
    const since = new Date(Date.now() - days * 86400000).toISOString();

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const [{ data: orders }, { data: logs }, { data: suppliers }] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('id,order_number,supplier_id,condition,total_amount,status,created_at,updated_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('integration_logs')
        .select('id,fecha,usuario,integracion,resultado,errores')
        .gte('fecha', since)
        .order('fecha', { ascending: false })
        .limit(200),
      supabase.from('suppliers').select('id,name'),
    ]);

    const supplierById = new Map((suppliers || []).map((s: any) => [s.id, s.name]));
    const userByOrder = new Map<string, string>();
    for (const log of logs || []) {
      const oc = String((log as any).errores || '').match(/OC-[A-Za-z0-9-]+/);
      if (oc && !userByOrder.has(oc[0])) userByOrder.set(oc[0], (log as any).usuario || 'SYSTEM');
    }

    const events: ActivityEvent[] = [];

    for (const o of orders || []) {
      const supplierName = supplierById.get((o as any).supplier_id) || 'Proveedor';
      const total = Number((o as any).total_amount || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      events.push({
        id: `po-${(o as any).id}-created`,
        ts: (o as any).created_at,
        action: 'creado',
        entity: 'Orden',
        title: (o as any).order_number,
        detail: `${supplierName} · S/ ${total} · ${(o as any).condition || ''}`.trim(),
        actor: userByOrder.get((o as any).order_number) || 'SYSTEM',
      });
      if ((o as any).status === 'sent') {
        events.push({
          id: `po-${(o as any).id}-sent`,
          ts: (o as any).updated_at || (o as any).created_at,
          action: 'modificado',
          entity: 'Orden',
          title: (o as any).order_number,
          detail: `Transmitida a ${supplierName}`,
          actor: userByOrder.get((o as any).order_number) || 'SYSTEM',
        });
      }
    }

    for (const log of logs || []) {
      const act = mapLogAction(String((log as any).resultado || ''));
      if (!act) continue;
      events.push({
        id: `log-${(log as any).id}`,
        ts: (log as any).fecha,
        action: act,
        entity: String((log as any).integracion || 'Sistema'),
        title: shortTitle(String((log as any).errores || ''), String((log as any).integracion || 'Sistema')),
        detail: String((log as any).errores || '').slice(0, 180),
        actor: String((log as any).usuario || 'SYSTEM'),
      });
    }

    events.sort((a, b) => +new Date(b.ts) - +new Date(a.ts));

    const counts = {
      total: events.length,
      creado: events.filter((e) => e.action === 'creado').length,
      modificado: events.filter((e) => e.action === 'modificado').length,
      eliminado: 0,
      fallido: events.filter((e) => e.action === 'fallido').length,
    };

    let filtered = events;
    if (action === 'creado' || action === 'modificado' || action === 'eliminado') {
      filtered = events.filter((e) => e.action === action);
    }
    if (q) {
      filtered = filtered.filter((e) =>
        `${e.title} ${e.detail} ${e.entity} ${e.actor}`.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ success: true, counts, total: events.length, events: filtered });
  } catch (error: any) {
    console.error('Error en GET /api/actividad:', error);
    return NextResponse.json({ error: 'Error interno de auditoría.' }, { status: 500 });
  }
}
