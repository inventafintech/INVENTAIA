-- ==============================================================================
-- INVENTA.AI - Módulos de Inventario, Órdenes de Compra (OC) & Financiamiento B2B
-- PostgreSQL / Supabase / Cloud SQL Relational Schema
-- ==============================================================================

-- 1. Tabla de Categorías (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- 2. Tabla de Productos (Products)
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    sku_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku_code);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- 3. Tabla de Niveles de Inventario (Inventory Levels)
CREATE TABLE IF NOT EXISTS inventory_levels (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    physical_stock INT NOT NULL DEFAULT 0 CHECK (physical_stock >= 0),
    safety_stock INT NOT NULL DEFAULT 0 CHECK (safety_stock >= 0),
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_levels(product_id);

-- 4. Tabla de Proveedores (Suppliers)
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('corporate', 'traditional')),
    lead_time_days INT NOT NULL DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_integration ON suppliers(integration_type);

-- 5. Tabla de Órdenes de Compra (Purchase Orders)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    condition VARCHAR(100) NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    estimated_arrival DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'approved', 'transit', 'received')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_order_number ON purchase_orders(order_number);

-- 6. Tabla de Líneas de Órdenes de Compra (Purchase Order Lines)
CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id VARCHAR(50) PRIMARY KEY,
    po_id VARCHAR(50) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pol_po_id ON purchase_order_lines(po_id);
CREATE INDEX IF NOT EXISTS idx_pol_sku ON purchase_order_lines(sku);

-- 7. Tabla de Líneas de Crédito (Credit Lines)
CREATE TABLE IF NOT EXISTS credit_lines (
    id VARCHAR(50) PRIMARY KEY,
    partner_bank_id VARCHAR(100) NOT NULL,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    available_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    monthly_interest_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0145, -- 1.45% mensual
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'suspended', 'pending_configuration')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_credit_lines_bank ON credit_lines(partner_bank_id);

-- 8. Tabla de Solicitudes de Desembolso (Disbursement Requests)
CREATE TABLE IF NOT EXISTS disbursement_requests (
    id VARCHAR(50) PRIMARY KEY,
    credit_line_id VARCHAR(50) NOT NULL REFERENCES credit_lines(id) ON DELETE RESTRICT,
    requested_amount NUMERIC(14, 2) NOT NULL,
    term_days INT NOT NULL,
    financial_cost NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'disbursed', 'rejected', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_disbursement_cl_id ON disbursement_requests(credit_line_id);

-- 9. Tabla de Auditoría de Integraciones (Integration Logs)
CREATE TABLE IF NOT EXISTS integration_logs (
    id VARCHAR(100) PRIMARY KEY,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(255) NOT NULL,
    integracion VARCHAR(100) NOT NULL,
    resultado VARCHAR(50) NOT NULL,
    errores TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_integracion ON integration_logs(integracion);
CREATE INDEX IF NOT EXISTS idx_logs_fecha ON integration_logs(fecha);

-- 10. Tabla de Logs de Precisión de Pronóstico (Forecast Accuracy Logs)
CREATE TABLE IF NOT EXISTS forecast_accuracy_logs (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    forecasted_demand NUMERIC(12, 2) NOT NULL,
    actual_demand NUMERIC(12, 2) NOT NULL,
    mape_score NUMERIC(6, 4) NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forecast_product_id ON forecast_accuracy_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_forecast_calculated_at ON forecast_accuracy_logs(calculated_at);

-- 11. Tabla de Logs de Ahorros de Inventario (Inventory Savings Logs)
CREATE TABLE IF NOT EXISTS inventory_savings_logs (
    id VARCHAR(64) PRIMARY KEY,
    saved_amount NUMERIC(14, 2) NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_savings_created_at ON inventory_savings_logs(created_at);

-- 12. Tabla de Quiebres Prevenidos (Prevented Stockouts)
CREATE TABLE IF NOT EXISTS prevented_stockouts (
    id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    days_prevented INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prevented_product_id ON prevented_stockouts(product_id);
CREATE INDEX IF NOT EXISTS idx_prevented_created_at ON prevented_stockouts(created_at);
