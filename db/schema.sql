-- INVENTA.AI — Esquema PostgreSQL (db/schema.sql)
-- Multi-tenant por company_id + RLS. Listo para Supabase.
-- Escala objetivo: 500k empresas · 5M SKUs · miles de M de registros (particionado mensual).

create extension if not exists "pgcrypto";

-- Tenants
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null, country char(2) default 'PE',
  plan text default 'growth', created_at timestamptz default now()
);
create table users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  email citext unique not null, role text default 'owner', -- owner|buyer|viewer|admin
  mfa_secret text, created_at timestamptz default now()
);
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null, lead_time_days int default 4, rating numeric(2,1),
  contact_name text, contact_email text, contact_phone text,
  created_at timestamptz default now()
);
-- Sucursales (reposición multisedes)
create table branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null, city text, is_main boolean default false
);
-- Stock por sucursal (el campo skus.stock queda como consolidado)
create table branch_stock (
  branch_id uuid references branches(id) on delete cascade,
  sku_id uuid references skus(id) on delete cascade,
  qty int default 0, updated_at timestamptz default now(),
  primary key (branch_id, sku_id)
);
-- Alertas y reglas de automatización
create table auto_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  code text not null, name text not null, enabled boolean default true,
  last_run timestamptz, unique(company_id, code)
);
create table alerts (
  id bigint generated always as identity primary key,
  company_id uuid references companies(id) on delete cascade,
  level text not null, -- crit|warn|info
  title text not null, detail text, link text,
  read boolean default false, created_at timestamptz default now()
);
create index alerts_lookup on alerts(company_id, read, created_at desc);
create table skus (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  code text not null, name text not null, category text,
  supplier_id uuid references suppliers(id),
  cost numeric(12,2) not null, price numeric(12,2) not null,
  stock int default 0, stock_min int default 0, stock_max int default 0,
  abc char(1), xyz char(1), unique(company_id, code)
);
create index skus_company on skus(company_id);

-- Ventas e inventario: particionado mensual en prod
create table sales (
  id bigint generated always as identity,
  company_id uuid references companies(id) on delete cascade,
  sku_id uuid references skus(id) on delete cascade,
  day date not null, qty int not null, revenue numeric(12,2),
  channel text default 'pos', primary key (company_id, day, id)
) partition by range (day);
create table sales_2026_09 partition of sales for values from ('2026-09-01') to ('2026-10-01');
create table sales_2026_10 partition of sales for values from ('2026-10-01') to ('2026-11-01');

create table forecasts (
  id bigint generated always as identity primary key,
  company_id uuid references companies(id) on delete cascade,
  sku_id uuid references skus(id) on delete cascade,
  horizon int not null, target_date date not null, qty int not null,
  confidence numeric(4,3), model_version text default 'ma30-seas-v1',
  created_at timestamptz default now()
);
create index forecasts_lookup on forecasts(company_id, sku_id, horizon, target_date);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  code text not null, supplier_id uuid references suppliers(id),
  total numeric(12,2), status text default 'pending', -- pending|approved|rejected|received
  ai_rationale text, created_at timestamptz default now(), unique(company_id, code)
);
create table po_lines (
  po_id uuid references purchase_orders(id) on delete cascade,
  sku_id uuid references skus(id), qty int not null, unit_cost numeric(12,2),
  primary key (po_id, sku_id)
);
create table financing_quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  entity text, amount numeric(12,2), monthly_rate numeric(5,2),
  term_days int, quota numeric(12,2), score int, created_at timestamptz default now()
);
create table audit_log (
  id bigint generated always as identity primary key,
  company_id uuid, user_id uuid, action text, entity text, entity_id text,
  meta jsonb, created_at timestamptz default now()
);

-- RLS: cada tenant solo ve lo suyo (Supabase: setear app.company_id por JWT)
alter table skus enable row level security;
create policy tenant_isolation on skus using (company_id = current_setting('app.company_id', true)::uuid);

-- ============================================================================
-- INTEGRACIONES ENTERPRISE: Conectores, Tokens OAuth, Jobs y Auditoría de Sincronización
-- ============================================================================

create table integrations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  provider text not null, -- shopify | mercadolibre | whatsapp | sap | amazon | sunat
  status text default 'pending_configuration', -- pending_configuration | configured | active | error
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(company_id, provider)
);

create table oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references integrations(id) on delete cascade,
  provider text not null,
  shop_domain text,
  access_token text not null,
  refresh_token text,
  scope text,
  token_type text default 'Bearer',
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table sync_jobs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references integrations(id) on delete cascade,
  job_type text not null, -- products | orders | inventory | full
  status text default 'pending', -- pending | running | completed | failed
  started_at timestamptz default now(),
  completed_at timestamptz,
  error_message text
);

create table sync_results (
  id uuid primary key default gen_random_uuid(),
  sync_job_id uuid references sync_jobs(id) on delete cascade,
  entity_type text not null, -- products | orders | inventory | sales
  items_synced int default 0,
  items_failed int default 0,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table integration_logs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid references integrations(id) on delete set null,
  provider text not null,
  user_email text,
  level text not null, -- INFO | WARN | ERROR | SUCCESS
  action text not null,
  result text not null,
  error_details text,
  ip_address text,
  created_at timestamptz default now()
);
