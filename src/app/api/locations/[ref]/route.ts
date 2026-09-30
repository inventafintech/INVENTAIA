import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveLocations, saveLocations, resolveWorkspaceId, LOCATION_STATUSES } from '@/lib/locationsStore';
import { requireWorkspace } from '@/lib/requireWorkspace';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/locations/[ref] — edita una ubicación existente.
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

    const list = await getEffectiveLocations(supabase, workspaceId);
    const idx = list.findIndex((l) => l.ref.toUpperCase() === key);
    if (idx === -1) {
      return NextResponse.json({ error: 'Ubicación no encontrada.' }, { status: 404 });
    }

    const str = (v: unknown, max: number): string | undefined => {
      if (v === undefined) return undefined;
      if (typeof v !== 'string') return undefined;
      return v.trim().slice(0, max);
    };
    const updated = { ...list[idx] };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
      if (name.length > 120) return NextResponse.json({ error: 'El nombre no puede superar 120 caracteres.' }, { status: 400 });
      updated.name = name;
    }
    if (body.status !== undefined) {
      if (!LOCATION_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Estado inválido.' }, { status: 400 });
      }
      updated.status = body.status;
    }
    for (const k of ['storageType', 'branch', 'description', 'area'] as const) {
      const v = str(body[k], k === 'description' ? 280 : 120);
      if (v !== undefined) updated[k] = v;
    }
    updated.updatedAt = new Date().toISOString();

    list[idx] = updated;
    await saveLocations(supabase, workspaceId, list);
    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error('Error en PUT /api/locations:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/locations/[ref] — elimina una ubicación.
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

    const list = await getEffectiveLocations(supabase, workspaceId);
    if (!list.some((l) => l.ref.toUpperCase() === key)) {
      return NextResponse.json({ error: 'Ubicación no encontrada.' }, { status: 404 });
    }
    await saveLocations(
      supabase,
      workspaceId,
      list.filter((l) => l.ref.toUpperCase() !== key)
    );
    return NextResponse.json({ success: true, message: `Ubicación ${key} eliminada.` });
  } catch (error: any) {
    console.error('Error en DELETE /api/locations:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
