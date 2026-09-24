import { NextRequest, NextResponse } from 'next/server';
import { SUPPLIERS_DIRECTORY, BRANCHES } from '@/data/businessDirectory';
import { getEffectiveLocations, resolveWorkspaceId } from '@/lib/locationsStore';
import { getEffectiveClients } from '@/lib/clientsStore';

export const dynamic = 'force-dynamic';

const MAX_PER_GROUP = 5;
const MIN_QUERY_LENGTH = 2;

export interface SearchHit {
  id: string;
  name: string;
  detail: string;
  href: string;
}

/** Normaliza: minúsculas, sin espacios extra (búsqueda case-insensitive). */
function normalize(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function searchProducts(supabase: any, q: string): Promise<SearchHit[]> {
  const pattern = `%${q.replace(/[,()]/g, '')}%`;
  const [{ data: rows }, { data: categories }] = await Promise.all([
    supabase.from('products').select('id,sku_code,name,category_id').or(`name.ilike.${pattern},sku_code.ilike.${pattern}`).limit(MAX_PER_GROUP),
    supabase.from('categories').select('id,name'),
  ]);
  const catById = new Map((categories || []).map((c: any) => [c.id, c.name]));
  return (rows || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    detail: [p.sku_code, catById.get(p.category_id)].filter(Boolean).join(' · '),
    href: `/products/${p.id}`,
  }));
}

async function searchSuppliers(supabase: any, q: string): Promise<SearchHit[]> {
  const pattern = `%${q.replace(/[,()]/g, '')}%`;
  const { data: rows } = await supabase
    .from('suppliers')
    .select('id,name,contact_info,lead_time_days')
    .ilike('name', pattern)
    .limit(MAX_PER_GROUP);

  // Unión con el directorio visible en /inventory/vendors (Supabase primero),
  // deduplicada por nombre para no repetir resultados.
  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  for (const s of rows || []) {
    const key = String(s.name || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const contact = (s.contact_info as any)?.email || (s.contact_info as any)?.contact;
    hits.push({
      id: s.id,
      name: s.name,
      detail: [contact, s.lead_time_days ? `Lead time ${s.lead_time_days}d` : null].filter(Boolean).join(' · '),
      href: `/inventory/vendors?q=${encodeURIComponent(s.name)}`,
    });
  }
  if (hits.length < MAX_PER_GROUP) {
    for (const s of SUPPLIERS_DIRECTORY) {
      if (hits.length >= MAX_PER_GROUP) break;
      const key = s.name.toLowerCase();
      if (seen.has(key) || !key.includes(q)) continue;
      seen.add(key);
      hits.push({
        id: s.id,
        name: s.name,
        detail: `${s.ruc} · Lead time ${s.leadTime}d`,
        href: `/inventory/vendors?q=${encodeURIComponent(s.name)}`,
      });
    }
  }
  return hits;
}

function searchClientsSync(list: Array<{ ref: string; name: string; ruc?: string; city?: string }>, q: string): SearchHit[] {
  return list
    .filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.ruc || '').includes(q) ||
        (c.city || '').toLowerCase().includes(q)
    )
    .slice(0, MAX_PER_GROUP)
    .map((c) => ({
      id: c.ref,
      name: c.name,
      detail: [c.ruc, c.city].filter(Boolean).join(' · '),
      href: `/inventory/clients?q=${encodeURIComponent(c.name)}`,
    }));
}

function searchBranches(q: string): SearchHit[] {
  return BRANCHES.filter(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.company.toLowerCase().includes(q) ||
      b.ruc.includes(q) ||
      b.address.toLowerCase().includes(q)
  )
    .slice(0, MAX_PER_GROUP)
    .map((b) => ({
      id: b.id,
      name: b.name,
      detail: `${b.company} · ${b.address}`,
      href: '/inventory/branch-details',
    }));
}

function searchLocationsSync(list: Array<{ ref: string; name: string; code?: string; zone?: string }>, q: string): SearchHit[] {
  return list
    .filter((l) => {
      const code = (l as any).code || (l as any).ref || '';
      const zone = (l as any).zone || (l as any).branch || '';
      return (
        l.name.toLowerCase().includes(q) ||
        String(code).toLowerCase().includes(q) ||
        String(zone).toLowerCase().includes(q)
      );
    })
    .slice(0, MAX_PER_GROUP)
    .map((l) => {
      const code = (l as any).code || (l as any).ref || '';
      const zone = (l as any).zone || (l as any).branch || '';
      return {
        id: code,
        name: l.name,
        detail: `${code} · ${zone}`,
        href: `/inventory/locations?q=${encodeURIComponent(l.name)}`,
      };
    });
}

/**
 * GET /api/search?q=termino
 * Buscador global omnicanal: consulta en paralelo (Promise.all) productos y
 * proveedores en Supabase + directorio (clientes, sucursales, ubicaciones).
 * Máximo 5 resultados por categoría. Requiere al menos 2 caracteres.
 */
export async function GET(req: NextRequest) {
  try {
    const q = normalize(req.nextUrl.searchParams.get('q') || '');
    const empty = { q, products: [], suppliers: [], clients: [], branches: [], locations: [] };
    if (q.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(empty);
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // Directorio efectivo de ubicaciones y clientes (settings o semilla canónica)
    const workspaceId = await resolveWorkspaceId(supabase).catch(() => null);
    const [effectiveLocations, effectiveClients] = await Promise.all([
      workspaceId ? getEffectiveLocations(supabase, workspaceId).catch(() => []) : Promise.resolve([]),
      workspaceId ? getEffectiveClients(supabase, workspaceId).catch(() => []) : Promise.resolve([]),
    ]);

    const [products, suppliers, clients, branches, locations] = await Promise.all([
      searchProducts(supabase, q).catch(() => [] as SearchHit[]),
      searchSuppliers(supabase, q).catch(() => [] as SearchHit[]),
      Promise.resolve(searchClientsSync(effectiveClients, q)),
      Promise.resolve(searchBranches(q)),
      Promise.resolve(searchLocationsSync(effectiveLocations, q)),
    ]);

    return NextResponse.json({ q, products, suppliers, clients, branches, locations });
  } catch (error: any) {
    console.error('Error en GET /api/search:', error);
    return NextResponse.json({ error: 'Error interno de búsqueda.' }, { status: 500 });
  }
}
