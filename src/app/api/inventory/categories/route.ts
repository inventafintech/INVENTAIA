import { NextRequest, NextResponse } from 'next/server';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

export interface CategoryMeta {
  parentId: string | null;
  taxRate: number | null;
  expiryDays: number | null;
  description: string | null;
}

export interface CategoryDTO {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  parentName: string | null;
  taxRate: number | null;
  expiryDays: number | null;
  productCount: number;
  subCount: number;
}

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

async function readMeta(supabase: any, workspaceId: string): Promise<Record<string, CategoryMeta>> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const stored = (ws?.settings as any)?.catalogMeta;
  return stored && typeof stored === 'object' ? stored : {};
}

async function writeMeta(supabase: any, workspaceId: string, meta: Record<string, CategoryMeta>): Promise<void> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const settings = { ...((ws?.settings as any) || {}), catalogMeta: meta };
  const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
  if (error) throw new Error(error.message || 'No se pudo guardar.');
}

/**
 * GET /api/inventory/categories?q=&sort=&order=&page=&pageSize=
 * Categorías reales (tabla) + jerarquía/tasas/umbrales (settings) +
 * conteo de productos + KPIs.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim().replace(/\s+/g, ' ').toLowerCase() || '';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 10));
    const order = params.get('order') === 'desc' ? 'desc' : 'asc';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    let query = supabase.from('categories').select('id,name,description');
    if (q) {
      const pattern = `%${q.replace(/[,()]/g, '')}%`;
      query = query.or(`name.ilike.${pattern},description.ilike.${pattern}`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { data: products } = await supabase.from('products').select('id,category_id');
    const countByCat = new Map<string, number>();
    for (const p of products || []) {
      if (p.category_id) countByCat.set(p.category_id, (countByCat.get(p.category_id) || 0) + 1);
    }

    const meta = await readMeta(supabase, workspaceId);
    const nameById = new Map((rows || []).map((r: any) => [r.id, r.name]));

    const items: CategoryDTO[] = (rows || []).map((r: any) => {
      const m: CategoryMeta = meta[r.id] || { parentId: null, taxRate: null, expiryDays: null, description: null };
      const parentId = m.parentId && nameById.has(m.parentId) ? m.parentId : null;
      return {
        id: r.id,
        name: r.name,
        description: m.description ?? r.description ?? '',
        parentId,
        parentName: parentId ? nameById.get(parentId)! : null,
        taxRate: typeof m.taxRate === 'number' ? m.taxRate : null,
        expiryDays: typeof m.expiryDays === 'number' ? m.expiryDays : null,
        productCount: countByCat.get(r.id) || 0,
        subCount: 0,
      };
    });
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const i of items) {
      if (i.parentId && byId.has(i.parentId)) byId.get(i.parentId)!.subCount++;
    }

    const parents = items.filter((i) => !i.parentId);
    const subs = items.filter((i) => i.parentId);
    const withTax = items.filter((i) => i.taxRate !== null).length;
    const kpis = {
      total: parents.length,
      subcategories: subs.length,
      avgSubs: parents.length > 0 ? Number((subs.length / parents.length).toFixed(1)) : 0,
      withTax,
      withTaxTotal: items.length,
    };

    const sorted = [...items].sort((a, b) =>
      order === 'asc' ? a.name.localeCompare(b.name, 'es') : b.name.localeCompare(a.name, 'es')
    );

    return NextResponse.json({
      success: true,
      items: sorted.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
      kpis,
    });
  } catch (error: any) {
    console.error('Error en GET categories:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * POST /api/inventory/categories — crea categoría (+ meta jerarquía/tasas).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return bad('El nombre es obligatorio.');
    if (name.length > 120) return bad('El nombre no puede superar 120 caracteres.');

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const { data: dup } = await supabase.from('categories').select('id').ilike('name', name).maybeSingle();
    if (dup) {
      return NextResponse.json({ error: `Ya existe la categoría "${name}".` }, { status: 409 });
    }

    const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 280) : '';

    // Validar TODO antes de insertar (sin filas huérfanas)
    let parentId: string | null = null;
    if (body?.parentId !== undefined && body.parentId !== null && body.parentId !== '') {
      const { data: parent } = await supabase.from('categories').select('id').eq('id', body.parentId).maybeSingle();
      if (!parent) return bad('La categoría padre no existe.');
      parentId = parent.id;
    }
    let taxRate: number | null = null;
    if (body?.taxRate !== undefined && body.taxRate !== null && body.taxRate !== '') {
      const t = Number(body.taxRate);
      if (!Number.isFinite(t) || t < 0 || t > 100) return bad('Tasa inválida (0–100).');
      taxRate = t;
    }
    let expiryDays: number | null = null;
    if (body?.expiryDays !== undefined && body.expiryDays !== null && body.expiryDays !== '') {
      const d = Math.floor(Number(body.expiryDays));
      if (!Number.isInteger(d) || d < 0) return bad('Umbral inválido (días ≥ 0).');
      expiryDays = d;
    }

    const id = `cat-${Date.now().toString(36)}`;
    const { data: inserted, error } = await supabase
      .from('categories')
      .insert({ id, name, description })
      .select('id,name,description')
      .single();
    if (error || !inserted) {
      return NextResponse.json({ error: 'No se pudo crear la categoría.' }, { status: 500 });
    }

    const meta = await readMeta(supabase, workspaceId);
    meta[id] = {
      parentId,
      taxRate,
      expiryDays,
      description: description || null,
    };
    await writeMeta(supabase, workspaceId, meta);

    return NextResponse.json({ success: true, item: { ...inserted, parentId, taxRate, expiryDays, parentName: null, productCount: 0, subCount: 0 } }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST categories:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
