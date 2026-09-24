-- ==============================================================================
-- INVENTA.AI · Migración de esquema faltante (idempotente, seguro re-ejecutar)
-- Fecha: 2026-09-24
-- Uso: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Crea las 4 tablas que la app tolera hoy en modo degradado + las columnas
-- de perfil/seguridad. Al aplicarse, la app las adopta sola (sin deploy):
-- trazabilidad total en sync_jobs, config de conectores por UI en
-- integrations/oauth_tokens, y persistencia de teléfono/cargo/idioma/zona,
-- contraseña local y 2FA en users.
-- ==============================================================================

-- 1. Columnas de Perfil (Mi Perfil) -------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es';
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Lima';

-- 2. Columnas de Seguridad (contraseña local + 2FA TOTP) -----------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled_at TIMESTAMP WITH TIME ZONE;

-- 3. Tabla de Integraciones Empresariales --------------------------------------
CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- shopify, mercadolibre, whatsapp, sap, sunat
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_CONFIG', -- PENDING_CONFIG, ACTIVE, ERROR, DISCONNECTED
    config JSONB DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_workspace_provider UNIQUE (workspace_id, provider)
);

-- 4. Tabla de Tokens OAuth ------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_oauth_workspace_provider UNIQUE (workspace_id, provider)
);

-- 5. Tabla de Trabajos de Sincronización ---------------------------------------
CREATE TABLE IF NOT EXISTS sync_jobs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    job_type TEXT NOT NULL, -- PRODUCTS, ORDERS, INVENTORY, FULL, SAP_ODATA_*, WHATSAPP_*
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- 6. Tabla de Resultados de Sincronización --------------------------------------
CREATE TABLE IF NOT EXISTS sync_results (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
    items_processed INT DEFAULT 0,
    items_failed INT DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Acceso total (mismo estándar del resto del esquema) -------------------------
ALTER TABLE integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_results DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all integrations" ON integrations;
CREATE POLICY "Allow all integrations" ON integrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all oauth_tokens" ON oauth_tokens;
CREATE POLICY "Allow all oauth_tokens" ON oauth_tokens FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all sync_jobs" ON sync_jobs;
CREATE POLICY "Allow all sync_jobs" ON sync_jobs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all sync_results" ON sync_results;
CREATE POLICY "Allow all sync_results" ON sync_results FOR ALL USING (true) WITH CHECK (true);

-- 8. Verificación inmediata (debe devolver 4 filas TRUE) --------------------------
SELECT
  to_regclass('public.integrations') IS NOT NULL AS integrations_ok,
  to_regclass('public.oauth_tokens') IS NOT NULL AS oauth_tokens_ok,
  to_regclass('public.sync_jobs') IS NOT NULL AS sync_jobs_ok,
  to_regclass('public.sync_results') IS NOT NULL AS sync_results_ok;
