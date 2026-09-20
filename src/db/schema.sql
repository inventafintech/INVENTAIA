-- ==============================================================================
-- INVENTA.AI - Módulos de Órdenes de Compra (OC) & Financiamiento B2B
-- PostgreSQL / Supabase / Cloud SQL Relational Schema
-- ==============================================================================

-- 1. Tabla de Proveedores (Suppliers)
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

-- 2. Tabla de Órdenes de Compra (Purchase Orders)
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

-- 3. Tabla de Líneas de Órdenes de Compra (Purchase Order Lines)
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

-- 4. Tabla de Líneas de Crédito (Credit Lines)
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

-- 5. Tabla de Solicitudes de Desembolso (Disbursement Requests)
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

-- 6. Tabla de Auditoría de Integraciones (Integration Logs)
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
