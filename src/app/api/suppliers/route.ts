import { NextRequest, NextResponse } from 'next/server';
import { toDTO } from '@/lib/suppliers';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

const PAGE_SIZE_DEFAULT = 10;

/**
 * GET /api/suppliers?q=&type=&country=&sort=&order=&page=&pageSize=
 * Directorio real desde Supabase + KPIs calculados sobre el filtrado.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim().replace(/\s+/g, ' ') || '';
    const type = params.get('type') || 'all';
    const country = params.get('country') || 'all';
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get('pageSize')) || PAGE_SIZE_DEFAULT));
    const order = params.get('order') === 'desc' ? 'desc' : 'asc';

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    let query = supabase.from('suppliers').select('id,name,integration_type,lead_time_days,contact_info');
    if (q) {
      const pattern = `%${q.replace(/[,()]/g, '')}%`;
      query = query.or(`name.ilike.${pattern},contact_info->>email.ilike.${pattern},contact_info->>ref.ilike.${pattern}`);
    }
    if (type === 'corporate' || type === 'traditional') query = query.eq('integration_type', type);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let items = (data || []).map(toDTO);
    if (country !== 'all') {
      items = items.filter((i) => i.country.toLowerCase() === country.toLowerCase());
    }
    items.sort((a, b) => (order === 'asc' ? a.ref.localeCompare(b.ref) : b.ref.localeCompare(a.ref)));

    const kpis = {
      total: items.length,
      withBranch: items.filter((i) => i.branch).length,
      cities: new Set(items.map((i) => i.city).filter(Boolean)).size,
      countries: new Set(items.map((i) => i.country).filter(Boolean)).size,
    };

    return NextResponse.json({
      success: true,
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
      kpis,
      countries: [...new Set(items.map((i) => i.country).filter(Boolean))],
    });
  } catch (error: any) {
    console.error('Error en GET /api/suppliers:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/suppliers — crea un proveedor real (contact_info JSONB, sin DDL).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'El nombre es obligatorio.' }, { status: 400 });
    if (name.length > 160) return NextResponse.json({ error: 'El nombre no puede superar 160 caracteres.' }, { status: 400 });

    const str = (v: unknown, max: number): string => {
      if (typeof v !== 'string') return '';
      return v.trim().slice(0, max);
    };
    const email = str(body?.email, 160);
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
    }
    const type = body?.type === 'corporate' ? 'corporate' : 'traditional';
    const leadTime = body?.leadTime === undefined || body?.leadTime === '' ? 5 : Math.floor(Number(body.leadTime));
    if (!Number.isInteger(leadTime) || leadTime < 0 || leadTime > 365) {
      return NextResponse.json({ error: 'Lead time inválido (0–365 días).' }, { status: 400 });
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 24) || 'sup';
    let id = `sup-${slug}`;
    let suffix = 1;
    while ((await supabase.from('suppliers').select('id').eq('id', id).maybeSingle()).data) {
      suffix++;
      id = `sup-${slug}-${suffix}`;
    }

    const { data: existingRefs } = await supabase.from('suppliers').select('contact_info');
    const usedRefs = new Set(
      ((existingRefs || []) as any[]).map((r) => String(r.contact_info?.ref || '').toUpperCase())
    );
    let n = (existingRefs || []).length + 1;
    let ref = `SUP-${String(n).padStart(2, '0')}`;
    while (usedRefs.has(ref)) {
      n++;
      ref = `SUP-${String(n).padStart(2, '0')}`;
    }

    const { data: inserted, error } = await supabase
      .from('suppliers')
      .insert({
        id,
        name,
        integration_type: type,
        lead_time_days: leadTime,
        contact_info: {
          ref,
          email,
          phone: str(body?.phone, 40),
          branch: str(body?.branch, 120) || 'Sede Lima Central',
          address: str(body?.address, 200),
          city: str(body?.city, 80),
          country: str(body?.country, 80),
          status: str(body?.status, 40) || 'Confiable',
          skus: [],
        },
      })
      .select('id,name,integration_type,lead_time_days,contact_info')
      .single();

    if (error || !inserted) {
      console.error('Error al crear proveedor:', error);
      return NextResponse.json({ error: 'No se pudo crear el proveedor.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, item: toDTO(inserted) }, { status: 201 });
  } catch (error: any) {
    console.error('Error en POST /api/suppliers:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
