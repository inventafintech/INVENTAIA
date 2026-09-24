import { LOCATIONS as SEED } from '@/data/businessDirectory';

export type LocationStatus = 'disponible' | 'entrante' | 'cuarentena' | 'desecho';

export interface StoredLocation {
  ref: string;
  name: string;
  status: LocationStatus;
  storageType: string;
  branch: string;
  description: string;
  area: string;
  updatedAt?: string;
}

export const LOCATION_STATUSES: LocationStatus[] = ['disponible', 'entrante', 'cuarentena', 'desecho'];

/**
 * Directorio efectivo: settings.locations del workspace si existe,
 * si no la semilla canónica (businessDirectory). El primer POST/PUT/DELETE
 * persiste el arreglo en settings (sin DDL).
 */
export async function getEffectiveLocations(supabase: any, workspaceId: string): Promise<StoredLocation[]> {
  try {
    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const stored = (ws?.settings as any)?.locations;
    if (Array.isArray(stored)) return stored as StoredLocation[];
  } catch {
    // continuar con la semilla
  }
  return SEED.map((l) => ({
    ref: l.ref,
    name: l.name,
    status: l.statusKey,
    storageType: l.storageType,
    branch: l.branch,
    description: l.description,
    area: l.area,
  }));
}

/**
 * Ubicaciones creadas por el workspace (null si nunca personalizó el
 * directorio). Permite distinguir semilla canónica de datos propios.
 */
export async function getStoredLocations(supabase: any, workspaceId: string): Promise<StoredLocation[] | null> {
  try {
    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const stored = (ws?.settings as any)?.locations;
    if (Array.isArray(stored)) return stored as StoredLocation[];
  } catch {
    // sin respaldo: se considera semilla
  }
  return null;
}

export async function saveLocations(supabase: any, workspaceId: string, locations: StoredLocation[]): Promise<void> {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const settings = { ...((ws?.settings as any) || {}), locations };
  const { error } = await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
  if (error) throw new Error(error.message || 'No se pudo guardar.');
}

export async function resolveWorkspaceId(supabase: any): Promise<string | null> {
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

export function nextRef(locations: StoredLocation[]): string {
  let max = 0;
  for (const l of locations) {
    const m = /^LOC-(\d+)$/.exec(l.ref || '');
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `LOC-${String(max + 1).padStart(5, '0')}`;
}
