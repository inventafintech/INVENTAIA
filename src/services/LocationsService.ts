import {
  getEffectiveLocations,
  getStoredLocations,
  resolveWorkspaceId as resolveWorkspaceIdFromStore,
  type StoredLocation,
} from '@/lib/locationsStore';

export type { StoredLocation };

export interface LocationFilter {
  /** Ref de ubicación, ej. LOC-00004. 'all' o vacío = sin filtro. */
  locationRef?: string | null;
  /** Nombre de sucursal, ej. 'Sucursal Principal'. 'all' o vacío = sin filtro. */
  branch?: string | null;
}

export const ALL_LOCATIONS = 'all';

export function normalizeLocationFilter(
  rawLocation?: string | null,
  rawBranch?: string | null
): LocationFilter {
  const loc = (rawLocation || '').trim();
  const br = (rawBranch || '').trim();
  return {
    locationRef: !loc || loc === 'all' ? null : loc.toUpperCase(),
    branch: !br || br === 'all' ? null : br,
  };
}

export function isLocationFiltered(f: LocationFilter): boolean {
  return Boolean(f.locationRef || f.branch);
}

/**
 * LocationsService — capa Backend para Ubicaciones/Sucursales.
 * Fuente real: settings.locations del workspace (persistido en Supabase)
 * con semilla canónica como fallback. Cero mocks, cero datos en duro.
 */
export class LocationsService {
  static async resolveWorkspaceId(supabase: any): Promise<string | null> {
    return resolveWorkspaceIdFromStore(supabase);
  }

  static async getLocations(
    supabase: any,
    workspaceId: string
  ): Promise<StoredLocation[]> {
    return getEffectiveLocations(supabase, workspaceId);
  }

  static async getStoredLocations(
    supabase: any,
    workspaceId: string
  ): Promise<StoredLocation[] | null> {
    return getStoredLocations(supabase, workspaceId);
  }

  static async getBranches(supabase: any, workspaceId: string): Promise<string[]> {
    const list = await getEffectiveLocations(supabase, workspaceId);
    return [...new Set(list.map((l) => l.branch).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  static async locationExists(
    supabase: any,
    workspaceId: string,
    ref: string
  ): Promise<boolean> {
    const key = ref.trim().toUpperCase();
    if (!key) return false;
    const list = await getEffectiveLocations(supabase, workspaceId);
    return list.some((l) => l.ref.toUpperCase() === key);
  }

  /**
   * Placement real del workspace: productId -> { branch, locationRef }.
   * Es la verdad relacional que conecta stock con ubicaciones.
   */
  static async getPlacement(
    supabase: any,
    workspaceId: string
  ): Promise<Record<string, { branch: string; locationRef: string }>> {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('settings')
      .eq('id', workspaceId)
      .maybeSingle();
    const placement = (ws?.settings as any)?.inventoryPlacement;
    return placement && typeof placement === 'object' ? placement : {};
  }

  /** ¿El placement de un producto pertenece al filtro de ubicación? */
  static matchesLocation(
    place: { branch?: string; locationRef?: string } | undefined,
    filter: LocationFilter,
    defaults = { branch: 'Sede Lima Central', locationRef: 'LOC-00004' }
  ): boolean {
    const branch = place?.branch || defaults.branch;
    const ref = (place?.locationRef || defaults.locationRef).toUpperCase();
    if (filter.locationRef && ref !== filter.locationRef.toUpperCase()) return false;
    if (filter.branch && branch !== filter.branch) return false;
    return true;
  }

  /** Filtra una lista genérica con placement por ubicación/sucursal. */
  static filterByPlacement<
    T extends { id?: string; productId?: string; product_id?: string },
  >(
    rows: T[],
    placement: Record<string, { branch: string; locationRef: string }>,
    filter: LocationFilter,
    getProductId: (row: T) => string
  ): T[] {
    if (!isLocationFiltered(filter)) return rows;
    return rows.filter((r) => this.matchesLocation(placement[getProductId(r)], filter));
  }
}
