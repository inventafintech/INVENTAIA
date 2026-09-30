import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from '@/lib/requireWorkspace';
import {
  getEffectiveLocations,
  getStoredLocations,
  saveLocations,
  resolveWorkspaceId,
  nextRef,
  LOCATION_STATUSES,
  StoredLocation,
} from '@/lib/locationsStore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/locations?q=&status=&branch=&sort=&order=&page=&pageSize=&grouped=
 * Directorio real (settings del workspace o semilla) + KPIs calculados.
 * grouped=1: JSON jerárquico { branches: [{ name, count, locations }] }
 *   para selectores agrupados por sucursal (Importaciones Paso 1).
 * seeded: false cuando el workspace ya personalizó su directorio.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim().replace(/\s+/g, ' ').toLowerCase() || '';
    const status = params.get('status') || 'all';
    const branch = params.get('branch') || 'all';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 10));
    const order = params.get('order') === 'asc' ? 'asc' : 'desc';
    const grouped = params.get('grouped') === '1';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    let list = await getEffectiveLocations(supabase, workspaceId);

    if (q) {
      list = list.filter(
        (l) =>
          l.ref.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          (l.description || '').toLowerCase().includes(q)
      );
    }
    if (status !== 'all') list = list.filter((l) => l.status === status);
    if (branch !== 'all') list = list.filter((l) => l.branch === branch);

    const kpis = {
      total: list.length,
      branches: new Set(list.map((l) => l.branch).filter(Boolean)).size,
      storageTypes: new Set(list.map((l) => l.storageType).filter(Boolean)).size,
      available: list.filter((l) => l.status === 'disponible').length,
      availablePct: list.length > 0 ? Math.round((list.filter((l) => l.status === 'disponible').length / list.length) * 100) : 0,
    };

    const sorted = [...list].sort((a, b) =>
      order === 'asc' ? a.ref.localeCompare(b.ref) : b.ref.localeCompare(a.ref)
    );
    const items = sorted.slice((page - 1) * pageSize, page * pageSize);
    const stored = await getStoredLocations(supabase, workspaceId);

    if (grouped) {
      const byBranch = new Map<string, StoredLocation[]>();
      for (const l of sorted) {
        const key = (l.branch || 'Sin sucursal').trim() || 'Sin sucursal';
        if (!byBranch.has(key)) byBranch.set(key, []);
        byBranch.get(key)!.push(l);
      }
      const branches = [...byBranch.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, locations]) => ({ name, count: locations.length, locations }));
      return NextResponse.json({
        success: true,
        branches,
        total: list.length,
        seeded: stored === null,
      });
    }

    return NextResponse.json({
      success: true,
      items,
      total: list.length,
      page,
      pageSize,
      kpis,
      branches: [...new Set(list.map((l) => l.branch).filter(Boolean))],
      seeded: stored === null,
    });
  } catch (error: any) {
    console.error('Error en GET /api/locations:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

function validatePayload(body: any, isCreate: boolean): { clean?: any; error?: string } {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (isCreate && !name) return { error: 'El nombre es obligatorio.' };
  if (name && name.length > 120) return { error: 'El nombre no puede superar 120 caracteres.' };
  if (body?.status !== undefined && !LOCATION_STATUSES.includes(body.status)) {
    return { error: 'Estado inválido (disponible, entrante, cuarentena, desecho).' };
  }
  const str = (v: unknown, max: number): string | undefined => {
    if (v === undefined) return undefined;
    if (typeof v !== 'string') return undefined;
    return v.trim().slice(0, max);
  };
  return {
    clean: {
      ...(name ? { name } : {}),
      ...(body?.status !== undefined ? { status: body.status } : {}),
      ...(str(body?.storageType, 60) !== undefined ? { storageType: str(body?.storageType, 60) } : {}),
      ...(str(body?.branch, 120) !== undefined ? { branch: str(body?.branch, 120) } : {}),
      ...(str(body?.description, 280) !== undefined ? { description: str(body?.description, 280) } : {}),
      ...(str(body?.area, 60) !== undefined ? { area: str(body?.area, 60) } : {}),
    },
  };
}

/**
 * POST /api/locations — crea una ubicación (ref autogenerada si no se indica).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }
    const { clean, error } = validatePayload(body, true);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const list = await getEffectiveLocations(supabase, workspaceId);
    let ref =
      typeof body.ref === 'string' && body.ref.trim() ? body.ref.trim().slice(0, 20).toUpperCase() : nextRef(list);
    if (list.some((l) => l.ref.toUpperCase() === ref.toUpperCase())) {
      return NextResponse.json({ error: `Ya existe la ubicación ${ref}.` }, { status: 409 });
    }

    const created: StoredLocation = {
      ref,
      name: clean.name,
      status: clean.status || 'disponible',
      storageType: clean.storageType || 'General',
      branch: clean.branch || 'Sucursal Principal',
      description: clean.description || '',
      area: clean.area || '',
      updatedAt: new Date().toISOString(),
    };
    await saveLocations(supabase, workspaceId, [...list, created]);
    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/locations:', error);
    return NextResponse.json({ error: 'Error interno al crear.' }, { status: 500 });
  }
}
