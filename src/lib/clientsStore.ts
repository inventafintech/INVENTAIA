import { CLIENTS as SEED } from '@/data/businessDirectory';

export type ClientSegment = 'B2B' | 'B2C';

export interface StoredClient {
  ref: string;
  name: string;
  segment: ClientSegment;
  branch: string;
  address: string;
  city: string;
  country: string;
  status: string;
  email: string;
  phone: string;
  ruc: string;
  updatedAt?: string;
}

/**
 * Directorio efectivo: settings.clients del workspace si existe,
 * si no la semilla canónica (businessDirectory, segmento B2B).
 * El primer POST/PUT/DELETE persiste el arreglo en settings (sin DDL).
 */
export async function getEffectiveClients(supabase: any, workspaceId: string): Promise<StoredClient[]> {
  try {
    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const stored = (ws?.settings as any)?.clients;
    if (Array.isArray(stored)) return stored as StoredClient[];
  } catch {
    // continuar con la semilla
  }
  return SEED.map((c) => ({
    ref: c.id,
    name: c.name,
    segment: 'B2B' as ClientSegment,
    branch: 'Sede Lima Central',
    address: '',
    city: 'Lima',
    country: 'Perú',
    status: c.status,
    email: '',
    phone: '',
    ruc: c.ruc,
  }));
}

export async function saveClients(supabase: any, workspaceId: string, clients: StoredClient[]): Promise<void> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const settings = { ...((ws?.settings as any) || {}), clients };
  const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
  if (error) throw new Error(error.message || 'No se pudo guardar.');
}

export function nextClientRef(clients: StoredClient[]): string {
  let max = 0;
  for (const c of clients) {
    const m = /^CLI-(\d+)$/.exec(c.ref || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `CLI-${String(max + 1).padStart(2, '0')}`;
}
