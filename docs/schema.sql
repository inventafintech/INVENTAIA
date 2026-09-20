-- ============================================================================
-- INVENTA.AI — ENTERPRISE DATABASE SCHEMA (docs/schema.sql)
-- Clean Architecture & Production Ready
-- Tablas requeridas: integrations, integration_logs, sync_jobs, sync_results, oauth_tokens
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tabla: integrations
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE, -- shopify | mercadolibre | whatsapp | sap | amazon | sunat
  status TEXT NOT NULL DEFAULT 'pending_configuration', -- pending_configuration | configured | active | error
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla: oauth_tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  shop_domain TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla: sync_jobs
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL, -- SHOPIFY_FULL_SYNC | MERCADOLIBRE_FULL_SYNC | SAP_S4HANA_ODATA_FULL_SYNC
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | completed | failed
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- 4. Tabla: sync_results
CREATE TABLE IF NOT EXISTS sync_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id UUID REFERENCES sync_jobs(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- products | orders | inventory | sales | stock | SAP_PRODUCTS
  items_synced INT NOT NULL DEFAULT 0,
  items_failed INT NOT NULL DEFAULT 0,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabla: integration_logs
-- Registra: fecha, usuario, integración, resultado, errores
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario TEXT NOT NULL DEFAULT 'admin@inventa.ai',
  integracion TEXT NOT NULL, -- shopify | mercadolibre | whatsapp | sap | amazon | sunat
  nivel TEXT NOT NULL DEFAULT 'INFO', -- INFO | WARN | ERROR | SUCCESS
  accion TEXT NOT NULL, -- SYNC_PRODUCTS | OAUTH_EXCHANGE | SEND_MESSAGE | ODATA_QUERY
  resultado TEXT NOT NULL, -- EXITOSO | FALLIDO
  errores TEXT, -- Detalle técnico del error o excepción
  ip_address TEXT DEFAULT '127.0.0.1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de búsqueda y optimización
CREATE INDEX IF NOT EXISTS idx_integration_logs_lookup ON integration_logs(integracion, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_results_job ON sync_results(sync_job_id);
