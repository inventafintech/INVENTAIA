import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { LOCATIONS } from '@/data/businessDirectory';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

export interface BranchProfile {
  code: string;
  name: string;
  company: string;
  nif: string;
  fiscalStart: string;
  contact: { person: string; phone: string; email: string };
  address: {
    line1: string;
    line2: string;
    district: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  };
  departments: Array<{ id: string; name: string }>;
}

/** Perfil por defecto: datos reales de la sede (misma fuente que la vista legacy). */
function defaultBranchProfile(): BranchProfile {
  return {
    code: 'BRN-00001',
    name: 'Sede Lima Central',
    company: 'INVENTA LOGISTICS PERU S.A.C.',
    nif: '20609876543',
    fiscalStart: '2026-09-20',
    contact: { person: '', phone: '', email: '' },
    address: {
      line1: 'Av. Elmer Faucett 2850, Callao, Lima',
      line2: '',
      district: 'Callao',
      city: 'Lima',
      state: 'Lima',
      postal: '',
      country: 'Perú',
    },
    departments: [],
  };
}

async function resolveWorkspace(supabase: any): Promise<{ id: string; settings: any; updatedAt: string } | null> {
  const session = await SessionManager.getSession().catch(() => null);
  if (session?.workspaceId && session.workspaceId !== 'ws-default') {
    const { data } = await supabase
      .from('workspaces')
      .select('id,settings,updated_at')
      .eq('id', session.workspaceId)
      .maybeSingle();
    if (data) return { id: data.id, settings: data.settings || {}, updatedAt: data.updated_at };
  }
  const { data: first } = await supabase
    .from('workspaces')
    .select('id,settings,updated_at')
    .limit(1)
    .maybeSingle();
  if (first) return { id: first.id, settings: first.settings || {}, updatedAt: first.updated_at };
  return null;
}

function readBranch(settings: any): BranchProfile {
  const stored = (settings as any)?.branch;
  const base = defaultBranchProfile();
  if (!stored || typeof stored !== 'object') return base;
  return {
    ...base,
    ...stored,
    contact: { ...base.contact, ...(stored.contact || {}) },
    address: { ...base.address, ...(stored.address || {}) },
    departments: Array.isArray(stored.departments) ? stored.departments : [],
  };
}

/**
 * GET /api/branch — perfil de la sede (settings del workspace) + conteos.
 */
export async function GET() {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const ws = await resolveWorkspace(supabase);
    if (!ws) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }
    const branch = readBranch(ws.settings);
    return NextResponse.json({
      success: true,
      branch,
      locationsCount: LOCATIONS.length,
      departmentsCount: branch.departments.length,
      updatedAt: ws.updatedAt,
    });
  } catch (error: any) {
    console.error('Error en GET /api/branch:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * PUT /api/branch — actualiza el perfil (merge parcial validado).
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const ws = await resolveWorkspace(supabase);
    if (!ws) {
      return NextResponse.json({ error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const current = readBranch(ws.settings);
    const next: BranchProfile = {
      ...current,
      contact: { ...current.contact },
      address: { ...current.address },
      departments: [...current.departments],
    };

    const str = (v: unknown, max: number): string | undefined => {
      if (v === undefined) return undefined;
      if (typeof v !== 'string') return undefined;
      return v.trim().slice(0, max);
    };

    const name = str(body.name, 120);
    if (name !== undefined) {
      if (!name) return NextResponse.json({ error: 'El nombre de la sucursal es obligatorio.' }, { status: 400 });
      next.name = name;
    }
    const nif = str(body.nif, 20);
    if (nif !== undefined) next.nif = nif;
    const fiscalStart = str(body.fiscalStart, 10);
    if (fiscalStart !== undefined) {
      if (fiscalStart && !/^\d{4}-\d{2}-\d{2}$/.test(fiscalStart)) {
        return NextResponse.json({ error: 'Fecha fiscal inválida (YYYY-MM-DD).' }, { status: 400 });
      }
      next.fiscalStart = fiscalStart;
    }

    const contact = body.contact;
    if (contact && typeof contact === 'object') {
      const person = str(contact.person, 120);
      if (person !== undefined) next.contact.person = person;
      const phone = str(contact.phone, 40);
      if (phone !== undefined) next.contact.phone = phone;
      const email = str(contact.email, 160);
      if (email !== undefined) {
        if (email && !EMAIL_RE.test(email)) {
          return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
        }
        next.contact.email = email;
      }
    }

    const address = body.address;
    if (address && typeof address === 'object') {
      for (const key of ['line1', 'line2', 'district', 'city', 'state', 'postal'] as const) {
        const v = str(address[key], 160);
        if (v !== undefined) next.address[key] = v;
      }
      const country = str(address.country, 80);
      if (country !== undefined) {
        if (!country) return NextResponse.json({ error: 'El país es obligatorio.' }, { status: 400 });
        next.address.country = country;
      }
    }

    if (body.departments !== undefined) {
      if (!Array.isArray(body.departments)) {
        return NextResponse.json({ error: 'Departamentos inválido.' }, { status: 400 });
      }
      if (body.departments.length > 50) {
        return NextResponse.json({ error: 'Máximo 50 departamentos.' }, { status: 400 });
      }
      next.departments = body.departments.map((d: any, idx: number) => ({
        id: typeof d?.id === 'string' && d.id ? d.id : `dep-${Date.now().toString(36)}-${idx}`,
        name: String(d?.name || '').trim().slice(0, 80),
      })).filter((d: any) => d.name);
    }

    const mergedSettings = { ...(ws.settings || {}), branch: next };
    const { error } = await supabase.from('workspaces').update({ settings: mergedSettings }).eq('id', ws.id);
    if (error) {
      console.error('Error al guardar sucursal:', error);
      return NextResponse.json({ error: 'No se pudo guardar la sucursal.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      branch: next,
      locationsCount: LOCATIONS.length,
      departmentsCount: next.departments.length,
    });
  } catch (error: any) {
    console.error('Error en PUT /api/branch:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
