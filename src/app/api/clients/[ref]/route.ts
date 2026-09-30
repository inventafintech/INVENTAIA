import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveClients, saveClients } from '@/lib/clientsStore';
import { requireWorkspace } from '@/lib/requireWorkspace';
import { resolveWorkspaceId } from '@/lib/locationsStore';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PUT /api/clients/[ref] — edición parcial de un cliente.
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ ref: string }> }) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { ref } = await context.params;
    const key = decodeURIComponent(ref).toUpperCase();
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

    const list = await getEffectiveClients(supabase, workspaceId);
    const idx = list.findIndex((c) => c.ref.toUpperCase() === key);
    if (idx === -1) {
      return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    }

    const updated = { ...list[idx] };
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
      if (name.length > 160) return NextResponse.json({ error: 'El nombre no puede superar 160 caracteres.' }, { status: 400 });
      updated.name = name;
    }
    if (body.segment !== undefined) {
      if (body.segment !== 'B2B' && body.segment !== 'B2C') {
        return NextResponse.json({ error: 'Segmento inválido.' }, { status: 400 });
      }
      updated.segment = body.segment;
    }
    if (body.email !== undefined) {
      const email = String(body.email).trim();
      if (email && !EMAIL_RE.test(email)) {
        return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
      }
      updated.email = email;
    }
    for (const k of ['branch', 'address', 'city', 'country', 'status', 'phone', 'ruc'] as const) {
      if (body[k] !== undefined) {
        if (typeof body[k] !== 'string') {
          return NextResponse.json({ error: `Campo ${k} inválido.` }, { status: 400 });
        }
        updated[k] = body[k].trim().slice(0, k === 'address' ? 200 : 120);
      }
    }
    updated.updatedAt = new Date().toISOString();

    list[idx] = updated;
    await saveClients(supabase, workspaceId, list);
    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error('Error en PUT /api/clients:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/clients/[ref] — elimina un cliente.
 */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ ref: string }> }) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { ref } = await context.params;
    const key = decodeURIComponent(ref).toUpperCase();

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const list = await getEffectiveClients(supabase, workspaceId);
    if (!list.some((c) => c.ref.toUpperCase() === key)) {
      return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    }
    await saveClients(
      supabase,
      workspaceId,
      list.filter((c) => c.ref.toUpperCase() !== key)
    );
    return NextResponse.json({ success: true, message: `Cliente ${key} eliminado.` });
  } catch (error: any) {
    console.error('Error en DELETE /api/clients:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
