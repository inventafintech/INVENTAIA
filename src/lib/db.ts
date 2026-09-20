import fs from 'fs';
import path from 'path';

export interface IntegrationRecord {
  id: string;
  provider: string;
  status: 'pending_configuration' | 'configured' | 'active' | 'error';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OAuthTokenRecord {
  id: string;
  integration_id?: string;
  provider: string;
  shop_domain?: string;
  access_token: string;
  refresh_token?: string;
  scope?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SyncJobRecord {
  id: string;
  integration_id: string;
  job_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface SyncResultRecord {
  id: string;
  sync_job_id: string;
  entity_type: string;
  items_synced: number;
  items_failed: number;
  details?: Record<string, any>;
  created_at: string;
}

export interface IntegrationLogRecord {
  id: string;
  provider: string;
  user_email: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  action: string;
  result: string;
  error_details?: string;
  ip_address?: string;
  created_at: string;
}

export interface CategoryRecord {
  id: string;
  name: string;
  description?: string;
}

export interface ProductRecord {
  id: string;
  sku_code: string;
  name: string;
  category_id: string;
  category_name: string;
  unit_cost: number;
  unit_price: number;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface InventoryLevelRecord {
  id: string;
  product_id: string;
  physical_stock: number;
  safety_stock: number;
  last_synced_at: string;
}

export interface SupplierRecord {
  id: string;
  name: string;
  contact_info: {
    email?: string;
    phone?: string;
    address?: string;
    tax_id?: string; // RUC
  };
  integration_type: 'corporate' | 'traditional';
  lead_time_days: number;
}

export interface PurchaseOrderRecord {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  condition: string;
  total_amount: number;
  estimated_arrival: string;
  status: 'draft' | 'approved' | 'transit' | 'received';
  created_at: string;
  updated_at: string;
  lines_count: number;
}

export interface PurchaseOrderLineRecord {
  id: string;
  po_id: string;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CreditLineRecord {
  id: string;
  partner_bank_id: string;
  partner_bank_name: string;
  total_amount: number;
  available_amount: number;
  used_amount: number;
  monthly_interest_rate: number;
  status: 'active' | 'suspended' | 'pending_configuration';
  active_orders_description: string;
}

export interface DisbursementRequestRecord {
  id: string;
  credit_line_id: string;
  requested_amount: number;
  term_days: number;
  financial_cost: number;
  protected_sales: number;
  net_return: number;
  status: 'pending' | 'approved' | 'disbursed' | 'rejected' | 'failed';
  created_at: string;
}

// In-memory + persistent storage
const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'integrations_store.json');

interface DatabaseStore {
  integrations: Record<string, IntegrationRecord>;
  oauth_tokens: Record<string, OAuthTokenRecord>;
  sync_jobs: SyncJobRecord[];
  sync_results: SyncResultRecord[];
  integration_logs: IntegrationLogRecord[];
  categories: Record<string, CategoryRecord>;
  products: Record<string, ProductRecord>;
  inventory_levels: Record<string, InventoryLevelRecord>;
  suppliers: Record<string, SupplierRecord>;
  purchase_orders: Record<string, PurchaseOrderRecord>;
  purchase_order_lines: PurchaseOrderLineRecord[];
  credit_lines: Record<string, CreditLineRecord>;
  disbursement_requests: DisbursementRequestRecord[];
}

function initDb(): DatabaseStore {
  const defaultCategories: Record<string, CategoryRecord> = {
    'cat-abarrotes': { id: 'cat-abarrotes', name: 'Abarrotes', description: 'Alimentos básicos y consumo masivo' },
    'cat-lacteos': { id: 'cat-lacteos', name: 'Lácteos', description: 'Leches, yogures y derivados lácteos' },
    'cat-construccion': { id: 'cat-construccion', name: 'Construcción', description: 'Materiales pesados y acabados' },
    'cat-bebidas': { id: 'cat-bebidas', name: 'Bebidas', description: 'Aguas, cervezas y gaseosas' },
  };

  const defaultProducts: Record<string, ProductRecord> = {
    'prod-1': {
      id: 'prod-1',
      sku_code: 'SKU-ALI-001',
      name: 'Aceite Primor Premium 1L',
      category_id: 'cat-abarrotes',
      category_name: 'Abarrotes',
      unit_cost: 8.50,
      unit_price: 11.22,
      status: 'active',
      created_at: '2026-09-10T08:00:00Z',
      updated_at: '2026-09-10T08:00:00Z',
    },
    'prod-2': {
      id: 'prod-2',
      sku_code: 'SKU-GLO-002',
      name: 'Leche Evaporada Gloria Azul 400g',
      category_id: 'cat-lacteos',
      category_name: 'Lácteos',
      unit_cost: 3.80,
      unit_price: 4.75,
      status: 'active',
      created_at: '2026-09-10T08:00:00Z',
      updated_at: '2026-09-10T08:00:00Z',
    },
    'prod-3': {
      id: 'prod-3',
      sku_code: 'SKU-COS-003',
      name: 'Arroz Costeño Extra 5kg',
      category_id: 'cat-abarrotes',
      category_name: 'Abarrotes',
      unit_cost: 21.00,
      unit_price: 26.88,
      status: 'active',
      created_at: '2026-09-10T08:00:00Z',
      updated_at: '2026-09-10T08:00:00Z',
    },
    'prod-4': {
      id: 'prod-4',
      sku_code: 'SKU-SOL-004',
      name: 'Cemento Sol Tipo I 42.5kg',
      category_id: 'cat-construccion',
      category_name: 'Construcción',
      unit_cost: 29.50,
      unit_price: 35.105,
      status: 'active',
      created_at: '2026-09-10T08:00:00Z',
      updated_at: '2026-09-10T08:00:00Z',
    },
    'prod-5': {
      id: 'prod-5',
      sku_code: 'SKU-DON-005',
      name: 'Fideos Don Vittorio Spaghetti 500g',
      category_id: 'cat-abarrotes',
      category_name: 'Abarrotes',
      unit_cost: 3.20,
      unit_price: 3.904,
      status: 'active',
      created_at: '2026-09-10T08:00:00Z',
      updated_at: '2026-09-10T08:00:00Z',
    },
    'prod-6': {
      id: 'prod-6',
      sku_code: 'SKU-BAC-006',
      name: 'Cerveza Pilsen Callao 330ml Sixpack',
      category_id: 'cat-bebidas',
      category_name: 'Bebidas',
      unit_cost: 24.00,
      unit_price: 33.12,
      status: 'active',
      created_at: '2026-09-10T08:00:00Z',
      updated_at: '2026-09-10T08:00:00Z',
    },
  };

  const defaultInventory: Record<string, InventoryLevelRecord> = {
    'inv-1': { id: 'inv-1', product_id: 'prod-1', physical_stock: 180, safety_stock: 56, last_synced_at: '2026-09-20T00:00:00Z' },
    'inv-2': { id: 'inv-2', product_id: 'prod-2', physical_stock: 340, safety_stock: 120, last_synced_at: '2026-09-20T00:00:00Z' },
    'inv-3': { id: 'inv-3', product_id: 'prod-3', physical_stock: 520, safety_stock: 200, last_synced_at: '2026-09-20T00:00:00Z' },
    'inv-4': { id: 'inv-4', product_id: 'prod-4', physical_stock: 850, safety_stock: 300, last_synced_at: '2026-09-20T00:00:00Z' },
    'inv-5': { id: 'inv-5', product_id: 'prod-5', physical_stock: 410, safety_stock: 150, last_synced_at: '2026-09-20T00:00:00Z' },
    'inv-6': { id: 'inv-6', product_id: 'prod-6', physical_stock: 620, safety_stock: 180, last_synced_at: '2026-09-20T00:00:00Z' },
  };

  const defaultSuppliers: Record<string, SupplierRecord> = {
    'sup-alicorp': {
      id: 'sup-alicorp',
      name: 'Alicorp S.A.',
      contact_info: {
        email: 'ventas.corporativas@alicorp.com.pe',
        phone: '+51987654321',
        address: 'Av. Argentina 4793, Callao',
        tax_id: '20100055237',
      },
      integration_type: 'traditional',
      lead_time_days: 4,
    },
    'sup-gloria': {
      id: 'sup-gloria',
      name: 'Leche Gloria S.A.',
      contact_info: {
        email: 'pedidos@gloria.com.pe',
        phone: '+51987654322',
        address: 'Av. República de Panamá 2461, Lima',
        tax_id: '20100190797',
      },
      integration_type: 'traditional',
      lead_time_days: 5,
    },
    'sup-unacem': {
      id: 'sup-unacem',
      name: 'UNACEM S.A.A.',
      contact_info: {
        email: 'atencion.sap@unacem.pe',
        phone: '+51987654324',
        address: 'Carretera Atocongo Km. 11, Villa María del Triunfo',
        tax_id: '20100138281',
      },
      integration_type: 'corporate', // SAP S/4HANA OData
      lead_time_days: 7,
    },
    'sup-costeno': {
      id: 'sup-costeno',
      name: 'Costeño Alimentos S.A.C.',
      contact_info: {
        email: 'ventas@costeno.com.pe',
        phone: '+51987654323',
        address: 'Av. Elmer Faucett 450, Callao',
        tax_id: '20504143285',
      },
      integration_type: 'traditional',
      lead_time_days: 6,
    },
    'sup-backus': {
      id: 'sup-backus',
      name: 'Backus & Johnston',
      contact_info: {
        email: 'pedidos@backus.com.pe',
        phone: '+51987654325',
        address: 'Av. Nicolás Ayllón 3986, Ate',
        tax_id: '20100113610',
      },
      integration_type: 'traditional',
      lead_time_days: 3,
    },
  };

  const defaultOrders: Record<string, PurchaseOrderRecord> = {
    'po-1': {
      id: 'po-1',
      order_number: 'OC-2026-089',
      supplier_id: 'sup-alicorp',
      supplier_name: 'Alicorp S.A.',
      condition: 'Crédito 30d',
      total_amount: 38450.00,
      estimated_arrival: '24 Sep 2026',
      status: 'draft',
      created_at: '2026-09-18T10:00:00Z',
      updated_at: '2026-09-18T10:00:00Z',
      lines_count: 4,
    },
    'po-2': {
      id: 'po-2',
      order_number: 'OC-2026-088',
      supplier_id: 'sup-gloria',
      supplier_name: 'Leche Gloria S.A.',
      condition: 'Factoring Pichincha',
      total_amount: 19800.00,
      estimated_arrival: '22 Sep 2026',
      status: 'draft',
      created_at: '2026-09-17T14:30:00Z',
      updated_at: '2026-09-17T14:30:00Z',
      lines_count: 2,
    },
    'po-3': {
      id: 'po-3',
      order_number: 'OC-2026-087',
      supplier_id: 'sup-unacem',
      supplier_name: 'UNACEM S.A.A.',
      condition: 'Contado Anticipado',
      total_amount: 88500.00,
      estimated_arrival: '21 Sep 2026',
      status: 'approved',
      created_at: '2026-09-16T09:15:00Z',
      updated_at: '2026-09-16T11:00:00Z',
      lines_count: 1,
    },
    'po-4': {
      id: 'po-4',
      order_number: 'OC-2026-086',
      supplier_id: 'sup-costeno',
      supplier_name: 'Costeño Alimentos S.A.C.',
      condition: 'Crédito 45d',
      total_amount: 25200.00,
      estimated_arrival: '20 Sep 2026',
      status: 'transit',
      created_at: '2026-09-15T16:00:00Z',
      updated_at: '2026-09-16T08:30:00Z',
      lines_count: 3,
    },
    'po-5': {
      id: 'po-5',
      order_number: 'OC-2026-085',
      supplier_id: 'sup-backus',
      supplier_name: 'Backus & Johnston',
      condition: 'Crédito 15d',
      total_amount: 54100.00,
      estimated_arrival: '18 Sep 2026',
      status: 'received',
      created_at: '2026-09-12T11:20:00Z',
      updated_at: '2026-09-18T17:45:00Z',
      lines_count: 6,
    },
  };

  const defaultLines: PurchaseOrderLineRecord[] = [
    { id: 'pol-1', po_id: 'po-1', sku: 'SKU-ALI-001', product_name: 'Aceite Primor Premium 1L', quantity: 2500, unit_price: 8.50, subtotal: 21250.00 },
    { id: 'pol-2', po_id: 'po-1', sku: 'SKU-DON-005', product_name: 'Fideos Don Vittorio Spaghetti 500g', quantity: 1500, unit_price: 3.20, subtotal: 4800.00 },
    { id: 'pol-3', po_id: 'po-1', sku: 'SKU-ALI-010', product_name: 'Harina Blanca Flor 1kg', quantity: 2000, unit_price: 4.20, subtotal: 8400.00 },
    { id: 'pol-4', po_id: 'po-1', sku: 'SKU-ALI-012', product_name: 'Detergente Bolívar 800g', quantity: 800, unit_price: 5.00, subtotal: 4000.00 },
    { id: 'pol-5', po_id: 'po-2', sku: 'SKU-GLO-002', product_name: 'Leche Evaporada Gloria Azul 400g', quantity: 1800, unit_price: 3.80, subtotal: 6840.00 },
    { id: 'pol-6', po_id: 'po-2', sku: 'SKU-GLO-004', product_name: 'Yogurt Gloria Fresa 1kg', quantity: 2500, unit_price: 5.184, subtotal: 12960.00 },
    { id: 'pol-7', po_id: 'po-3', sku: 'SKU-SOL-004', product_name: 'Cemento Sol Tipo I 42.5kg', quantity: 3000, unit_price: 29.50, subtotal: 88500.00 },
    { id: 'pol-8', po_id: 'po-4', sku: 'SKU-COS-003', product_name: 'Arroz Costeño Extra 5kg', quantity: 1200, unit_price: 21.00, subtotal: 25200.00 },
    { id: 'pol-9', po_id: 'po-5', sku: 'SKU-BAC-001', product_name: 'Cerveza Cristal 330ml Pack 24', quantity: 800, unit_price: 52.00, subtotal: 41600.00 },
    { id: 'pol-10', po_id: 'po-5', sku: 'SKU-BAC-002', product_name: 'Agua San Mateo 500ml Pack 12', quantity: 1000, unit_price: 12.50, subtotal: 12500.00 },
  ];

  const defaultCreditLines: Record<string, CreditLineRecord> = {
    'cl-pichincha': {
      id: 'cl-pichincha',
      partner_bank_id: 'banco-pichincha-b2b',
      partner_bank_name: 'Banco Pichincha B2B',
      total_amount: 150000.00,
      available_amount: 105000.00,
      used_amount: 45000.00,
      monthly_interest_rate: 0.0145, // 1.45% mensual
      status: 'active',
      active_orders_description: '1 Orden activa (Alicorp #OC-089)',
    },
  };

  const defaultStore: DatabaseStore = {
    integrations: {
      shopify: {
        id: 'int-shopify',
        provider: 'shopify',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      mercadolibre: {
        id: 'int-meli',
        provider: 'mercadolibre',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      whatsapp: {
        id: 'int-whatsapp',
        provider: 'whatsapp',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      sap: {
        id: 'int-sap',
        provider: 'sap',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      amazon: {
        id: 'int-amazon',
        provider: 'amazon',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      sunat: {
        id: 'int-sunat',
        provider: 'sunat',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      pichincha_b2b: {
        id: 'int-pichincha-b2b',
        provider: 'pichincha_b2b',
        status: 'pending_configuration',
        config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
    oauth_tokens: {},
    sync_jobs: [],
    sync_results: [],
    integration_logs: [],
    categories: defaultCategories,
    products: defaultProducts,
    inventory_levels: defaultInventory,
    suppliers: defaultSuppliers,
    purchase_orders: defaultOrders,
    purchase_order_lines: defaultLines,
    credit_lines: defaultCreditLines,
    disbursement_requests: [],
  };

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        ...defaultStore,
        ...parsed,
        categories: { ...defaultCategories, ...(parsed.categories || {}) },
        products: { ...defaultProducts, ...(parsed.products || {}) },
        inventory_levels: { ...defaultInventory, ...(parsed.inventory_levels || {}) },
        suppliers: { ...defaultSuppliers, ...(parsed.suppliers || {}) },
        purchase_orders: { ...defaultOrders, ...(parsed.purchase_orders || {}) },
        purchase_order_lines: parsed.purchase_order_lines?.length ? parsed.purchase_order_lines : defaultLines,
        credit_lines: { ...defaultCreditLines, ...(parsed.credit_lines || {}) },
        disbursement_requests: parsed.disbursement_requests || [],
      };
    }
  } catch (err) {
    console.warn('Using memory store for integrations:', err);
  }

  return defaultStore;
}

let store: DatabaseStore = initDb();

function persistStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    // In serverless read-only contexts, retain in memory
  }
}

export const db = {
  getIntegrations: (): IntegrationRecord[] => {
    return Object.values(store.integrations);
  },

  getIntegration: (provider: string): IntegrationRecord | undefined => {
    return store.integrations[provider];
  },

  saveIntegration: (provider: string, config: Record<string, any>, status?: IntegrationRecord['status']) => {
    const existing = store.integrations[provider] || {
      id: `int-${provider}`,
      provider,
      status: 'pending_configuration',
      config: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    existing.config = { ...existing.config, ...config };
    if (status) existing.status = status;
    existing.updated_at = new Date().toISOString();

    store.integrations[provider] = existing;
    persistStore();
    return existing;
  },

  getOAuthToken: (provider: string): OAuthTokenRecord | undefined => {
    return store.oauth_tokens[provider];
  },

  saveOAuthToken: (provider: string, tokenData: Partial<OAuthTokenRecord>) => {
    const now = new Date().toISOString();
    const token: OAuthTokenRecord = {
      id: `tok-${provider}-${Date.now()}`,
      provider,
      access_token: tokenData.access_token || '',
      refresh_token: tokenData.refresh_token,
      shop_domain: tokenData.shop_domain,
      scope: tokenData.scope,
      expires_at: tokenData.expires_at,
      created_at: now,
      updated_at: now,
    };

    store.oauth_tokens[provider] = token;
    
    // Update integration status to configured
    if (store.integrations[provider]) {
      store.integrations[provider].status = 'configured';
      store.integrations[provider].updated_at = now;
    }

    persistStore();
    return token;
  },

  createSyncJob: (integrationId: string, jobType: string): SyncJobRecord => {
    const job: SyncJobRecord = {
      id: `job-${Date.now()}`,
      integration_id: integrationId,
      job_type: jobType,
      status: 'running',
      started_at: new Date().toISOString(),
    };
    store.sync_jobs.unshift(job);
    persistStore();
    return job;
  },

  updateSyncJob: (jobId: string, status: SyncJobRecord['status'], errorMessage?: string) => {
    const job = store.sync_jobs.find(j => j.id === jobId);
    if (job) {
      job.status = status;
      job.completed_at = new Date().toISOString();
      if (errorMessage) job.error_message = errorMessage;
      persistStore();
    }
  },

  saveSyncResult: (jobId: string, entityType: string, itemsSynced: number, itemsFailed: number, details?: Record<string, any>) => {
    const result: SyncResultRecord = {
      id: `res-${Date.now()}`,
      sync_job_id: jobId,
      entity_type: entityType,
      items_synced: itemsSynced,
      items_failed: itemsFailed,
      details,
      created_at: new Date().toISOString(),
    };
    store.sync_results.unshift(result);
    persistStore();
    return result;
  },

  addLog: (
    provider: string,
    level: IntegrationLogRecord['level'],
    action: string,
    result: string,
    errorDetails?: string,
    userEmail: string = 'admin@inventa.ai',
    ipAddress: string = '127.0.0.1'
  ): IntegrationLogRecord => {
    const log: IntegrationLogRecord = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      provider,
      user_email: userEmail,
      level,
      action,
      result,
      error_details: errorDetails,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    };
    store.integration_logs.unshift(log);
    if (store.integration_logs.length > 500) {
      store.integration_logs = store.integration_logs.slice(0, 500);
    }
    persistStore();
    return log;
  },

  getLogs: (limit: number = 100): IntegrationLogRecord[] => {
    return store.integration_logs.slice(0, limit);
  },

  // --- Categories & Products (Inventory) ---
  getCategories: (): CategoryRecord[] => {
    return Object.values(store.categories || {});
  },

  getCategory: (idOrName: string): CategoryRecord | undefined => {
    return store.categories?.[idOrName] || Object.values(store.categories || {}).find(c => c.name === idOrName);
  },

  getProductsWithInventory: (): Array<ProductRecord & { physical_stock: number; safety_stock: number; last_synced_at: string }> => {
    const products = Object.values(store.products || {});
    return products.map(p => {
      const inv = Object.values(store.inventory_levels || {}).find(i => i.product_id === p.id);
      return {
        ...p,
        physical_stock: inv?.physical_stock ?? 0,
        safety_stock: inv?.safety_stock ?? 0,
        last_synced_at: inv?.last_synced_at || new Date().toISOString(),
      };
    });
  },

  createProduct: (
    productData: Omit<ProductRecord, 'id' | 'created_at' | 'updated_at'>,
    physicalStock: number,
    safetyStock: number
  ): ProductRecord & { physical_stock: number; safety_stock: number } => {
    const id = `prod-${Date.now()}`;
    const now = new Date().toISOString();

    const product: ProductRecord = {
      ...productData,
      id,
      created_at: now,
      updated_at: now,
    };

    const invId = `inv-${Date.now()}`;
    const inv: InventoryLevelRecord = {
      id: invId,
      product_id: id,
      physical_stock: physicalStock,
      safety_stock: safetyStock,
      last_synced_at: now,
    };

    if (!store.products) store.products = {};
    if (!store.inventory_levels) store.inventory_levels = {};

    store.products[id] = product;
    store.inventory_levels[invId] = inv;
    persistStore();

    return {
      ...product,
      physical_stock: physicalStock,
      safety_stock: safetyStock,
    };
  },

  // --- Purchase Orders Methods ---
  getSuppliers: (): SupplierRecord[] => {
    return Object.values(store.suppliers || {});
  },

  getSupplier: (id: string): SupplierRecord | undefined => {
    return store.suppliers?.[id] || Object.values(store.suppliers || {}).find(s => s.name === id);
  },

  getPurchaseOrders: (): PurchaseOrderRecord[] => {
    return Object.values(store.purchase_orders || {});
  },

  getPurchaseOrder: (idOrNumber: string): PurchaseOrderRecord | undefined => {
    return (
      store.purchase_orders?.[idOrNumber] ||
      Object.values(store.purchase_orders || {}).find(
        (po) => po.id === idOrNumber || po.order_number === idOrNumber
      )
    );
  },

  getPurchaseOrderLines: (poId: string): PurchaseOrderLineRecord[] => {
    return (store.purchase_order_lines || []).filter((l) => l.po_id === poId);
  },

  updatePurchaseOrderStatus: (
    idOrNumber: string,
    status: PurchaseOrderRecord['status']
  ): PurchaseOrderRecord | undefined => {
    const po = db.getPurchaseOrder(idOrNumber);
    if (po && store.purchase_orders) {
      po.status = status;
      po.updated_at = new Date().toISOString();
      store.purchase_orders[po.id] = po;
      persistStore();
      return po;
    }
    return undefined;
  },

  createPurchaseOrder: (
    poData: Omit<PurchaseOrderRecord, 'id' | 'created_at' | 'updated_at'>,
    lines: Omit<PurchaseOrderLineRecord, 'id' | 'po_id'>[]
  ): { po: PurchaseOrderRecord; lines: PurchaseOrderLineRecord[] } => {
    const id = `po-${Date.now()}`;
    const now = new Date().toISOString();

    const po: PurchaseOrderRecord = {
      ...poData,
      id,
      created_at: now,
      updated_at: now,
    };

    const createdLines: PurchaseOrderLineRecord[] = lines.map((l, idx) => ({
      ...l,
      id: `pol-${Date.now()}-${idx}`,
      po_id: id,
    }));

    if (!store.purchase_orders) store.purchase_orders = {};
    if (!store.purchase_order_lines) store.purchase_order_lines = [];

    store.purchase_orders[id] = po;
    store.purchase_order_lines.push(...createdLines);
    persistStore();

    return { po, lines: createdLines };
  },

  // --- Credit Lines & Financing Methods ---
  getCreditLine: (id: string = 'cl-pichincha'): CreditLineRecord | undefined => {
    return store.credit_lines?.[id] || Object.values(store.credit_lines || {})[0];
  },

  updateCreditLine: (
    id: string,
    updates: Partial<CreditLineRecord>
  ): CreditLineRecord | undefined => {
    const cl = store.credit_lines?.[id] || Object.values(store.credit_lines || {})[0];
    if (cl && store.credit_lines) {
      const updated = { ...cl, ...updates };
      store.credit_lines[cl.id] = updated;
      persistStore();
      return updated;
    }
    return undefined;
  },

  createDisbursementRequest: (
    data: Omit<DisbursementRequestRecord, 'id' | 'created_at'>
  ): DisbursementRequestRecord => {
    const id = `disb-${Date.now()}`;
    const record: DisbursementRequestRecord = {
      ...data,
      id,
      created_at: new Date().toISOString(),
    };
    if (!store.disbursement_requests) store.disbursement_requests = [];
    store.disbursement_requests.unshift(record);
    persistStore();
    return record;
  },

  getDisbursementRequests: (): DisbursementRequestRecord[] => {
    return store.disbursement_requests || [];
  },
};
