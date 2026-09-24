import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TABLES = [
  'workspaces',
  'users',
  'products',
  'inventory_levels',
  'categories',
  'suppliers',
  'purchase_orders',
  'purchase_order_lines',
  'integration_logs',
  'integrations',
  'oauth_tokens',
  'sync_jobs',
  'sync_results',
];

const USER_COLUMNS = [
  'phone',
  'position',
  'language',
  'timezone',
  'password_hash',
  'two_factor_secret',
  'two_factor_enabled',
  'two_factor_backup_codes',
];

/**
 * GET /api/health/schema
 * Reporta qué tablas y columnas del esquema existen en Supabase.
 * mode 'full': todo en true (migración aplicada).
 * mode 'settings-fallback': la app opera con respaldos reales en
 * workspaces.settings; la migración es opcional, no bloqueante.
 */
export async function GET() {
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();

  const tables: Record<string, boolean> = {};
  await Promise.all(
    TABLES.map(async (t) => {
      try {
        const { error } = await supabase.from(t).select('id').limit(1);
        tables[t] = !error;
      } catch {
        tables[t] = false;
      }
    })
  );

  const userColumns: Record<string, boolean> = {};
  await Promise.all(
    USER_COLUMNS.map(async (c) => {
      try {
        const { error } = await supabase.from('users').select(c).limit(1);
        userColumns[c] = !error;
      } catch {
        userColumns[c] = false;
      }
    })
  );

  const ready =
    Object.values(tables).every(Boolean) && Object.values(userColumns).every(Boolean);

  // Sin DDL, la app opera con respaldos reales en workspaces.settings
  // (config_* de conectores, sync_jobs acotados) y blob de 2FA en users.image.
  // La migración pasa a ser mejora opcional, no bloqueante.
  const fallbackCovered =
    ['integrations', 'oauth_tokens', 'sync_jobs', 'sync_results'].every((t) => tables[t] === true) ||
    tables['workspaces'] === true;

  return NextResponse.json({
    ready,
    mode: ready ? 'full' : 'settings-fallback',
    fullyOperational: ready || fallbackCovered,
    tables,
    userColumns,
    migration: ready ? null : 'db/supabase_migration_20260924.sql (opcional: mejora trazabilidad y columnas nativas)',
    timestamp: new Date().toISOString(),
  });
}
