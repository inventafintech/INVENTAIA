import { NextRequest, NextResponse } from 'next/server';
import { toDTO } from '@/lib/suppliers';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PUT /api/suppliers/[id] — edición parcial (campos base + contact_info).
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: row } = await supabase.from('suppliers').select('*').eq('id', decodeURIComponent(id)).maybeSingle();
    if (!row) {
      return NextResponse.json({ error: 'Proveedor no encontrado.' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const ci: Record<string, any> = { ...((row.contact_info as Record<string, any>) || {}) };
    const str = (v: unknown, max: number): string | undefined => {
      if (v === undefined) return undefined;
      if (typeof v !== 'string') return undefined;
      return v.trim().slice(0, max);
    };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
      if (name.length > 160) return NextResponse.json({ error: 'El nombre no puede superar 160 caracteres.' }, { status: 400 });
      updates.name = name;
    }
    if (body.type !== undefined) {
      if (body.type !== 'corporate' && body.type !== 'traditional') {
        return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
      }
      updates.integration_type = body.type;
    }
    if (body.leadTime !== undefined) {
      const lt = Math.floor(Number(body.leadTime));
      if (!Number.isInteger(lt) || lt < 0 || lt > 365) {
        return NextResponse.json({ error: 'Lead time inválido (0–365 días).' }, { status: 400 });
      }
      updates.lead_time_days = lt;
    }
    if (body.email !== undefined) {
      const email = str(body.email, 160) || '';
      if (email && !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
      }
      ci.email = email;
    }
    for (const k of ['phone', 'branch', 'address', 'city', 'country', 'status'] as const) {
      const max = k === 'address' ? 200 : 120;
      const v = str(body[k], max);
      if (v !== undefined) ci[k] = v;
    }
    updates.contact_info = ci;

    const { data: updated, error } = await supabase
      .from('suppliers')
      .update(updates)
      .eq('id', row.id)
      .select('id,name,integration_type,lead_time_days,contact_info')
      .single();
    if (error || !updated) {
      console.error('Error al actualizar proveedor:', error);
      return NextResponse.json({ error: 'No se pudo actualizar.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, item: toDTO(updated) });
  } catch (error: any) {
    console.error('Error en PUT /api/suppliers:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/suppliers/[id] — elimina si no tiene órdenes asociadas.
 */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const key = decodeURIComponent(id);

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data: row } = await supabase.from('suppliers').select('id').eq('id', key).maybeSingle();
    if (!row) {
      return NextResponse.json({ error: 'Proveedor no encontrado.' }, { status: 404 });
    }
    const { data: linked } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('supplier_id', key)
      .limit(1);
    if (linked && linked.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar: tiene órdenes de compra asociadas.' },
        { status: 409 }
      );
    }
    const { error } = await supabase.from('suppliers').delete().eq('id', key);
    if (error) {
      return NextResponse.json({ error: 'No se pudo eliminar.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Proveedor eliminado.' });
  } catch (error: any) {
    console.error('Error en DELETE /api/suppliers:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
