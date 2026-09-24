import { NextRequest, NextResponse } from 'next/server';
import { getEffectiveClients, saveClients, nextClientRef, StoredClient } from '@/lib/clientsStore';
import { resolveWorkspaceId } from '@/lib/locationsStore';

export const dynamic = 'force-dynamic';

/**
 * GET /api/clients?q=&segment=&sort=&order=&page=&pageSize=
 * Directorio real (settings del workspace o semilla) + KPIs calculados.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim().replace(/\s+/g, ' ').toLowerCase() || '';
    const segment = params.get('segment');
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || 10));
    const order = params.get('order') === 'desc' ? 'desc' : 'asc';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    let list = await getEffectiveClients(supabase, workspaceId);

    if (segment === 'B2B' || segment === 'B2C') {
      list = list.filter((c) => c.segment === segment);
    }
    if (q) {
      list = list.filter(
        (c) =>
          c.ref.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.city || '').toLowerCase().includes(q) ||
          (c.ruc || '').includes(q)
      );
    }

    const kpis = {
      total: list.length,
      withBranch: list.filter((c) => c.branch).length,
      cities: new Set(list.map((c) => c.city).filter(Boolean)).size,
      countries: new Set(list.map((c) => c.country).filter(Boolean)).size,
    };

    const sorted = [...list].sort((a, b) =>
      order === 'asc' ? a.ref.localeCompare(b.ref) : b.ref.localeCompare(a.ref)
    );

    return NextResponse.json({
      success: true,
      items: sorted.slice((page - 1) * pageSize, page * pageSize),
      total: list.length,
      page,
      pageSize,
      kpis,
    });
  } catch (error: any) {
    console.error('Error en GET /api/clients:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body: any, isCreate: boolean): { clean?: any; error?: string } {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (isCreate && !name) return { error: 'El nombre es obligatorio.' };
  if (name && name.length > 160) return { error: 'El nombre no puede superar 160 caracteres.' };
  if (body?.segment !== undefined && body.segment !== 'B2B' && body.segment !== 'B2C') {
    return { error: 'Segmento inválido (B2B o B2C).' };
  }
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (email && !EMAIL_RE.test(email)) return { error: 'Correo electrónico inválido.' };
  const str = (v: unknown, max: number): string => {
    if (typeof v !== 'string') return '';
    return v.trim().slice(0, max);
  };
  return {
    clean: {
      ...(name ? { name } : {}),
      ...(body?.segment !== undefined ? { segment: body.segment } : {}),
      branch: str(body?.branch, 120),
      address: str(body?.address, 200),
      city: str(body?.city, 80),
      country: str(body?.country, 80),
      status: str(body?.status, 40) || 'Activo',
      email,
      phone: str(body?.phone, 40),
      ruc: str(body?.ruc, 20),
    },
  };
}

/**
 * POST /api/clients — crea un cliente real (ref autogenerada si no se indica).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }
    const { clean, error } = validate(body, true);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const list = await getEffectiveClients(supabase, workspaceId);
    let ref =
      typeof body.ref === 'string' && body.ref.trim() ? body.ref.trim().slice(0, 20).toUpperCase() : nextClientRef(list);
    if (list.some((c) => c.ref.toUpperCase() === ref.toUpperCase())) {
      return NextResponse.json({ error: `Ya existe el cliente ${ref}.` }, { status: 409 });
    }

    const created: StoredClient = {
      ref,
      name: clean.name,
      segment: clean.segment || 'B2B',
      branch: clean.branch || 'Sede Lima Central',
      address: clean.address,
      city: clean.city,
      country: clean.country,
      status: clean.status,
      email: clean.email,
      phone: clean.phone,
      ruc: clean.ruc,
      updatedAt: new Date().toISOString(),
    };
    await saveClients(supabase, workspaceId, [...list, created]);
    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/clients:', error);
    return NextResponse.json({ error: 'Error interno al crear.' }, { status: 500 });
  }
}
