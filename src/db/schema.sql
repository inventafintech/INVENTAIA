-- ==============================================================================
-- INVENTA.AI - Schema Completo para Supabase (PostgreSQL)
-- Ejecutar este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/eztnhqcsfhwgjwfdqxlg/sql/new
-- ==============================================================================

-- 1. Tabla de Espacios de Trabajo Multi-Tenant (Workspaces)
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug_url TEXT UNIQUE NOT NULL,
    industry TEXT,
    plan TEXT DEFAULT 'FREE',
    status TEXT DEFAULT 'ACTIVE',
    sla_days INTEGER DEFAULT 3,
    lead_time_days INTEGER DEFAULT 7,
    safety_margin_percent INTEGER DEFAULT 15,
    auto_reorder BOOLEAN DEFAULT false,
    tax_id TEXT,
    address TEXT,
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'America/Lima',
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS sla_days INTEGER DEFAULT 3;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS safety_margin_percent INTEGER DEFAULT 15;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS auto_reorder BOOLEAN DEFAULT false;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Lima';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug_url);

-- 2. Tabla de Usuarios (Users)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    image TEXT,
    google_id TEXT UNIQUE,
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(workspace_id);

-- 3. Tabla Pivote de Usuarios por Espacio (Workspace Users)
CREATE TABLE IF NOT EXISTS workspace_users (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'OWNER',
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_workspace_user UNIQUE (user_id, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_wu_user_id ON workspace_users(user_id);
CREATE INDEX IF NOT EXISTS idx_wu_workspace_id ON workspace_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_wu_role ON workspace_users(role);

-- 4. Tabla de Categorías (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Productos (Products)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    sku_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Niveles de Inventario (Inventory Levels)
CREATE TABLE IF NOT EXISTS inventory_levels (
    id TEXT PRIMARY KEY,
    product_id TEXT UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    physical_stock INT NOT NULL DEFAULT 0 CHECK (physical_stock >= 0),
    safety_stock INT NOT NULL DEFAULT 0 CHECK (safety_stock >= 0),
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Proveedores (Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    integration_type TEXT NOT NULL DEFAULT 'corporate',
    lead_time_days INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Órdenes de Compra (Purchase Orders)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE RESTRICT,
    condition TEXT NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    estimated_arrival DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabla de Líneas de Órdenes de Compra (Purchase Order Lines)
CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id TEXT PRIMARY KEY,
    po_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    sku TEXT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabla de Logs de Integraciones
CREATE TABLE IF NOT EXISTS integration_logs (
    id TEXT PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario TEXT NOT NULL,
    integracion TEXT NOT NULL,
    resultado TEXT NOT NULL,
    errores TEXT
);

-- 11. Tabla de Integraciones Empresariales (Integrations)
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

-- 12. Tabla de Tokens OAuth Encritados (OAuth Tokens)
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_oauth_workspace_provider UNIQUE (workspace_id, provider)
);

-- 13. Tabla de Trabajos de Sincronización (Sync Jobs)
CREATE TABLE IF NOT EXISTS sync_jobs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    job_type TEXT NOT NULL, -- PRODUCTS, ORDERS, INVENTORY, FULL
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- 14. Tabla de Resultados de Sincronización (Sync Results)
CREATE TABLE IF NOT EXISTS sync_results (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
    items_processed INT DEFAULT 0,
    items_failed INT DEFAULT 0,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- DESHABILITAR ROW-LEVEL SECURITY (RLS) / PERMITIR ACCESO TOTAL A TABLAS
-- ==============================================================================
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_results DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all workspaces" ON workspaces;
CREATE POLICY "Allow all workspaces" ON workspaces FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all users" ON users;
CREATE POLICY "Allow all users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all workspace_users" ON workspace_users;
CREATE POLICY "Allow all workspace_users" ON workspace_users FOR ALL USING (true) WITH CHECK (true);
