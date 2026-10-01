import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/requireWorkspace';

export const dynamic = 'force-dynamic';

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

async function readMeta(supabase: any, workspaceId: string): Promise<Record<string, any>> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const stored = (ws?.settings as any)?.catalogMeta;
  return stored && typeof stored === 'object' ? stored : {};
}

/** Detecta si assignedId es descendiente de ancestorId (previene ciclos). */
function createsCycle(meta: Record<string, any>, categoryId: string, assignedId: string): boolean {
  let cursor: string | null = assignedId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === categoryId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    const node: any = meta[cursor];
    const parentOf: unknown = node ? node.parentId : undefined;
    cursor = typeof parentOf === 'string' && parentOf ? parentOf : null;
  }
  return false;
}

/**
 * PUT /api/inventory/categories/[id] — edita nombre/descripción/padre/tasa/umbral.
 */
export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const key = decodeURIComponent(id);
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

    const { data: row } = await supabase.from('categories').select('id,name').eq('id', key).maybeSingle();
    if (!row) {
      return NextResponse.json({ error: 'Categoría no encontrada.' }, { status: 404 });
    }

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
      if (name.length > 120) return NextResponse.json({ error: 'El nombre no puede superar 120 caracteres.' }, { status: 400 });
      const { data: dup } = await supabase.from('categories').select('id').ilike('name', name).maybeSingle();
      if (dup && dup.id !== key) {
        return NextResponse.json({ error: `Ya existe la categoría "${name}".` }, { status: 409 });
      }
      const { error } = await supabase.from('categories').update({ name }).eq('id', key);
      if (error) return NextResponse.json({ error: 'No se pudo actualizar.' }, { status: 500 });
    }
    if (body.description !== undefined) {
      const description = typeof body.description === 'string' ? body.description.trim().slice(0, 280) : '';
      await supabase.from('categories').update({ description }).eq('id', key);
    }

    const meta = await readMeta(supabase, workspaceId);
    const entry = {
      parentId: meta[key]?.parentId ?? null,
      taxRate: typeof meta[key]?.taxRate === 'number' ? meta[key].taxRate : null,
      expiryDays: typeof meta[key]?.expiryDays === 'number' ? meta[key].expiryDays : null,
      description: typeof meta[key]?.description === 'string' ? meta[key].description : null,
    };

    if (body.parentId !== undefined) {
      if (body.parentId === null || body.parentId === '') {
        entry.parentId = null;
      } else {
        const { data: parent } = await supabase.from('categories').select('id').eq('id', body.parentId).maybeSingle();
        if (!parent) return NextResponse.json({ error: 'La categoría padre no existe.' }, { status: 400 });
        if (parent.id === key) return NextResponse.json({ error: 'Una categoría no puede ser su propio padre.' }, { status: 400 });
        if (createsCycle({ ...meta, [key]: entry }, key, parent.id)) {
          return NextResponse.json({ error: 'Jerarquía inválida: se crearía un ciclo.' }, { status: 400 });
        }
        entry.parentId = parent.id;
      }
    }
    if (body.taxRate !== undefined) {
      if (body.taxRate === null || body.taxRate === '') {
        entry.taxRate = null;
      } else {
        const t = Number(body.taxRate);
        if (!Number.isFinite(t) || t < 0 || t > 100) {
          return NextResponse.json({ error: 'Tasa inválida (0–100).' }, { status: 400 });
        }
        entry.taxRate = t;
      }
    }
    if (body.expiryDays !== undefined) {
      if (body.expiryDays === null || body.expiryDays === '') {
        entry.expiryDays = null;
      } else {
        const d = Math.floor(Number(body.expiryDays));
        if (!Number.isInteger(d) || d < 0) {
          return NextResponse.json({ error: 'Umbral inválido (días ≥ 0).' }, { status: 400 });
        }
        entry.expiryDays = d;
      }
    }

    meta[key] = entry;
    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = { ...((ws?.settings as any) || {}), catalogMeta: meta };
    await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);

    return NextResponse.json({ success: true, message: 'Categoría actualizada.' });
  } catch (error: any) {
    console.error('Error en PUT categories:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

/**
 * DELETE /api/inventory/categories/[id] — elimina si no tiene productos ni hijas.
 */
export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const key = decodeURIComponent(id);

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const { data: row } = await supabase.from('categories').select('id').eq('id', key).maybeSingle();
    if (!row) {
      return NextResponse.json({ error: 'Categoría no encontrada.' }, { status: 404 });
    }
    const { data: linked } = await supabase.from('products').select('id').eq('category_id', key).limit(1);
    if (linked && linked.length > 0) {
      return NextResponse.json({ error: 'No se puede eliminar: tiene productos asociados.' }, { status: 409 });
    }
    const meta = await readMeta(supabase, workspaceId);
    const hasChildren = Object.entries(meta).some(([cid, m]: [string, any]) => cid !== key && m?.parentId === key);
    if (hasChildren) {
      return NextResponse.json({ error: 'No se puede eliminar: tiene subcategorías asociadas.' }, { status: 409 });
    }

    delete meta[key];
    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = { ...((ws?.settings as any) || {}), catalogMeta: meta };
    await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);

    const { error } = await supabase.from('categories').delete().eq('id', key);
    if (error) {
      return NextResponse.json({ error: 'No se pudo eliminar.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Categoría eliminada.' });
  } catch (error: any) {
    console.error('Error en DELETE categories:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
