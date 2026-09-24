/**
 * Persistencia del estado 2FA con doble estrategia y automigración:
 *
 * 1. Preferencia: columnas dedicadas (two_factor_secret, two_factor_enabled,
 *    two_factor_backup_codes, two_factor_enabled_at). Requieren la migración
 *    SQL de src/db/schema.sql.
 * 2. Respaldo inmediato: blob JSON en la columna `image` (TEXT, en desuso),
 *    namespaced bajo la clave "2fa". Funciona HOY sin migración.
 *
 * Cuando las columnas existen, las lecturas las prefieren y cualquier
 * escritura migra automáticamente el estado del blob a las columnas
 * (self-healing). Nada es mock: todo persiste en Supabase.
 */

export interface TwoFactorState {
  enabled: boolean;
  secret: string | null;
  codes: string[];
  enabledAt: string | null;
}

const BLOB_KEY = '2fa';

function parseBlob(image: unknown): Record<string, any> | null {
  if (typeof image !== 'string' || !image.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(image);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function stateFromColumns(row: any): TwoFactorState | null {
  if (!row || row.two_factor_secret === undefined) return null;
  if (!row.two_factor_secret) return null;
  return {
    enabled: Boolean(row.two_factor_enabled),
    secret: row.two_factor_secret,
    codes: Array.isArray(row.two_factor_backup_codes) ? row.two_factor_backup_codes : [],
    enabledAt: row.two_factor_enabled_at || null,
  };
}

function stateFromBlob(row: any): TwoFactorState | null {
  const blob = parseBlob(row?.image);
  const s = blob?.[BLOB_KEY];
  if (!s || typeof s !== 'object' || !s.secret) return null;
  return {
    enabled: Boolean(s.enabled),
    secret: s.secret,
    codes: Array.isArray(s.codes) ? s.codes : [],
    enabledAt: s.at || null,
  };
}

/** Lectura: columnas primero, blob como respaldo. */
export function readTwoFactorState(row: any): TwoFactorState | null {
  return stateFromColumns(row) || stateFromBlob(row);
}

export function columnsAvailable(row: any): boolean {
  return Boolean(row && row.two_factor_secret !== undefined);
}

function buildBlobImage(currentImage: unknown, state: TwoFactorState | null): string {
  const blob = parseBlob(currentImage) || {};
  if (state) {
    blob[BLOB_KEY] = { secret: state.secret, enabled: state.enabled, codes: state.codes, at: state.enabledAt };
  } else {
    delete blob[BLOB_KEY];
  }
  return JSON.stringify(blob);
}

/**
 * Escritura: intenta columnas; si no existen, usa el blob en `image`.
 * Si las columnas existen y había estado en el blob, lo limpia (migración).
 * Devuelve 'columns' | 'blob'.
 */
export async function writeTwoFactorState(
  supabase: any,
  userId: string,
  currentImage: unknown,
  state: TwoFactorState | null
): Promise<'columns' | 'blob'> {
  const columnPayload = state
    ? {
        two_factor_secret: state.secret,
        two_factor_enabled: state.enabled,
        two_factor_backup_codes: state.codes,
        two_factor_enabled_at: state.enabledAt,
        updated_at: new Date().toISOString(),
      }
    : {
        two_factor_secret: null,
        two_factor_enabled: false,
        two_factor_backup_codes: [],
        two_factor_enabled_at: null,
        updated_at: new Date().toISOString(),
      };

  const attempt = await supabase.from('users').update(columnPayload).eq('id', userId).select('id').maybeSingle();
  if (!attempt.error) {
    // Columnas OK: limpiar posible blob heredado para no duplicar estado
    if (parseBlob(currentImage)?.[BLOB_KEY] !== undefined) {
      const cleaned = buildBlobImage(currentImage, null);
      await supabase.from('users').update({ image: cleaned === '{}' ? null : cleaned }).eq('id', userId);
    }
    return 'columns';
  }

  const msg = String(attempt.error?.message || '');
  const missingColumn = attempt.error?.code === 'PGRST204' || /schema cache|Could not find/i.test(msg);
  if (!missingColumn) {
    throw new Error(attempt.error?.message || 'No se pudo guardar el estado 2FA.');
  }

  const blobImage = buildBlobImage(currentImage, state);
  const fallback = await supabase
    .from('users')
    .update({ image: blobImage, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (fallback.error) {
    throw new Error(fallback.error?.message || 'No se pudo guardar el estado 2FA.');
  }
  return 'blob';
}
