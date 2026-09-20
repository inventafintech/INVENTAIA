/**
 * INVENTA.AI - Enterprise Domain Types
 * Clean Architecture & SOLID Principles
 */

export type IntegrationStatus = 
  | 'pending_configuration' 
  | 'configured' 
  | 'active' 
  | 'error';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Integration {
  id: string;
  provider: 'shopify' | 'mercadolibre' | 'whatsapp' | 'sap' | 'amazon' | 'sunat' | string;
  status: IntegrationStatus;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OAuthToken {
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

export interface SyncJob {
  id: string;
  integration_id: string;
  job_type: string;
  status: SyncJobStatus;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface SyncResult {
  id: string;
  sync_job_id: string;
  entity_type: 'products' | 'orders' | 'inventory' | 'sales' | 'stock' | 'business_partners' | string;
  items_synced: number;
  items_failed: number;
  details?: Record<string, any>;
  created_at: string;
}

export interface IntegrationLog {
  id: string;
  provider: string;
  user_email: string;
  level: LogLevel;
  action: string;
  result: string;
  error_details?: string | null;
  ip_address?: string;
  created_at: string;
}

/**
 * Cerebro de Compras - Executive Summary Domain Model
 */
export interface SKURiskItem {
  id: string;
  sku: string;
  nombre: string;
  stockActual: number;
  diasRestantes: number;
  ventasEnRiesgo: number;
  nivelRiesgo: 'critico' | 'alto' | 'medio';
}

export interface RecommendedOrder {
  id: string;
  proveedor: string;
  skusCount: number;
  unidadesTotales: number;
  montoEstimado: number;
  fechaRecomendada: string;
  confianzaForecast: number;
}

export interface ForecastDataPoint {
  mes: string;
  proyeccion: number;
  real?: number;
}

export interface SKUProfitability {
  sku: string;
  nombre: string;
  gmroi: number;
  rotacion: number;
}

export interface CriticalSupplier {
  nombre: string;
  leadTimeDias: number;
  ubicacion: string;
  estado: 'normal' | 'alerta';
}

export interface PurchasingBrainSummary {
  // Global integration status
  hasActiveIntegrations: boolean;
  activeIntegrationsCount: number;
  statusText: string;
  lastSyncTimestamp: string | null;
  
  // 1. Riesgo de Quiebre
  skusEnRiesgoCount: number;
  ventasEnRiesgoMonto: number;
  skusEnRiesgoDetalles: SKURiskItem[];
  
  // 2. Inventario Inmovilizado
  inventarioInmovilizadoMonto: number;
  porcentajeVariacionMensual: number;
  
  // 3. Compras Recomendadas
  ordenesRecomendadasCount: number;
  ordenesRecomendadasDetalles: RecommendedOrder[];
  confianzaForecastPromedio: number;
  
  // 4. Capital Requerido
  capitalRequeridoMonto: number;
  diasPlazo: number;
  porcentajeEjecucion: number;
  
  // 5. Financiamiento Disponible
  financiamientoDisponibleMonto: number;
  tasaMensual: number;
  entidadFinanciera: string;
  estadoFinanciamiento: 'aprobado' | 'evaluacion' | 'no_disponible';
  
  // 6. Forecast 90 Días
  forecast90Dias: ForecastDataPoint[];
  
  // 7. Rentabilidad por SKU
  rentabilidadSKUs: SKUProfitability[];
  
  // 8. Proveedores Críticos
  proveedoresCriticos: CriticalSupplier[];
}
