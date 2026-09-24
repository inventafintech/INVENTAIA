/**
 * Preferencias del workspace (Tenant): defaults, catálogos y tipos.
 * Persisten en workspaces.settings.preferences (sin DDL).
 */

export interface LocalePrefs {
  language: string;
  currency: string;
  country: string;
  numberFormat: string;
  dateFormat: string;
}

export interface WorkspacePreferences {
  locale: LocalePrefs;
  lowStockThreshold: number;
  sector: string | null;
  productFields: Record<string, boolean>;
  tracking: { lote: boolean; caducidad: boolean };
  customUnits: Array<{ id: string; name: string; symbol: string }>;
}

export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  locale: {
    language: 'es',
    currency: 'PEN',
    country: 'PE',
    numberFormat: '1,234.56',
    dateFormat: 'DD/MM/YYYY',
  },
  lowStockThreshold: 10,
  sector: null,
  productFields: {
    dimensiones: false,
    embalaje: false,
    fabricacion: false,
    clima: false,
    'tamano-color': false,
    recursos: false,
    umbral: true,
  },
  tracking: { lote: false, caducidad: false },
  customUnits: [],
};

export const LANGUAGES = [
  { value: 'es', label: 'Español (América Latina)' },
  { value: 'en', label: 'English (United States)' },
  { value: 'pt', label: 'Português (Brasil)' },
];

export const CURRENCIES = [
  { value: 'PEN', label: 'Sol Peruano (PEN)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'MXN', label: 'Peso Mexicano (MXN)' },
  { value: 'CLP', label: 'Peso Chileno (CLP)' },
  { value: 'COP', label: 'Peso Colombiano (COP)' },
  { value: 'ARS', label: 'Peso Argentino (ARS)' },
  { value: 'BRL', label: 'Real Brasileño (BRL)' },
];

export const COUNTRIES = [
  { value: 'PE', label: 'Perú' },
  { value: 'CO', label: 'Colombia' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'CL', label: 'Chile' },
  { value: 'MX', label: 'México' },
  { value: 'AR', label: 'Argentina' },
  { value: 'BR', label: 'Brasil' },
];

export const NUMBER_FORMATS = [
  { value: '1,234.56', label: 'Estilo EE.UU./Reino Unido (1,234.56)' },
  { value: '1.234,56', label: 'Estilo España/Latam (1.234,56)' },
];

export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 24/09/2026)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 09/24/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-09-24)' },
];

export interface SectorDef {
  id: string;
  label: string;
  icon: string;
}

export const SECTORS: SectorDef[] = [
  { id: 'sanidad', label: 'Sanidad', icon: 'Stethoscope' },
  { id: 'alimentos', label: 'Alimentos y Bebidas', icon: 'Apple' },
  { id: 'minorista', label: 'Venta Minorista y Ropa', icon: 'Shirt' },
  { id: 'electronica', label: 'Electrónica', icon: 'Cpu' },
  { id: 'industrial', label: 'Industrial', icon: 'Factory' },
  { id: 'otro', label: 'Otro / Personalizado', icon: 'Wrench' },
];

export interface ProductFieldDef {
  id: string;
  title: string;
  desc: string;
}

export const PRODUCT_FIELDS: ProductFieldDef[] = [
  { id: 'dimensiones', title: 'Dimensiones y peso', desc: 'Esto incluye longitud, altura, ancho y peso.' },
  { id: 'embalaje', title: 'Información de embalaje', desc: 'Esto incluye la cantidad de artículos por unidad de embalaje, así como información de pedido.' },
  { id: 'fabricacion', title: 'Información de fabricación', desc: 'Esto incluye el fabricante y el país de origen.' },
  { id: 'clima', title: 'Control climático', desc: 'Esto incluye si los artículos requieren condiciones climáticas específicas para el almacenamiento, como temperatura, humedad y calidad del aire.' },
  { id: 'tamano-color', title: 'Información de tamaño y color', desc: 'Esto incluye tallas y color de los artículos.' },
  { id: 'recursos', title: 'Recursos del producto', desc: 'Esto incluye recursos como certificados, manuales, guías y otros documentos relacionados.' },
  { id: 'umbral', title: 'Información del umbral', desc: 'Esto incluye niveles de stock bajo, stock de seguridad y punto de reorden para la gestión de inventario.' },
];

export interface SystemUnit {
  id: string;
  name: string;
  symbol: string;
  type: string;
}

/** 43 unidades del sistema (preservar conteo: el diseño muestra "43 UNIDADES"). */
export const SYSTEM_UNITS: SystemUnit[] = [
  { id: 'u-kg', name: 'Kilogramo', symbol: 'kg', type: 'Peso' },
  { id: 'u-g', name: 'Gramo', symbol: 'g', type: 'Peso' },
  { id: 'u-mg', name: 'Miligramo', symbol: 'mg', type: 'Peso' },
  { id: 'u-lb', name: 'Libra', symbol: 'lb', type: 'Peso' },
  { id: 'u-oz', name: 'Onza', symbol: 'oz', type: 'Peso' },
  { id: 'u-t', name: 'Tonelada', symbol: 't', type: 'Peso' },
  { id: 'u-l', name: 'Litro', symbol: 'l', type: 'Volumen' },
  { id: 'u-ml', name: 'Mililitro', symbol: 'ml', type: 'Volumen' },
  { id: 'u-gal', name: 'Galón', symbol: 'gal', type: 'Volumen' },
  { id: 'u-m3', name: 'Metro cúbico', symbol: 'm³', type: 'Volumen' },
  { id: 'u-cm3', name: 'Centímetro cúbico', symbol: 'cm³', type: 'Volumen' },
  { id: 'u-m', name: 'Metro', symbol: 'm', type: 'Longitud' },
  { id: 'u-cm', name: 'Centímetro', symbol: 'cm', type: 'Longitud' },
  { id: 'u-mm', name: 'Milímetro', symbol: 'mm', type: 'Longitud' },
  { id: 'u-km', name: 'Kilómetro', symbol: 'km', type: 'Longitud' },
  { id: 'u-in', name: 'Pulgada', symbol: 'pulg', type: 'Longitud' },
  { id: 'u-und', name: 'Unidad', symbol: 'und', type: 'Unidad' },
  { id: 'u-par', name: 'Par', symbol: 'par', type: 'Unidad' },
  { id: 'u-doc', name: 'Docena', symbol: 'doc', type: 'Unidad' },
  { id: 'u-cen', name: 'Centena', symbol: 'cen', type: 'Unidad' },
  { id: 'u-millar', name: 'Millar', symbol: 'millar', type: 'Unidad' },
  { id: 'u-caja', name: 'Caja', symbol: 'caja', type: 'Empaque' },
  { id: 'u-pack', name: 'Pack', symbol: 'pack', type: 'Empaque' },
  { id: 'u-display', name: 'Display', symbol: 'display', type: 'Empaque' },
  { id: 'u-blister', name: 'Blíster', symbol: 'blíster', type: 'Empaque' },
  { id: 'u-sobre', name: 'Sobre', symbol: 'sobre', type: 'Empaque' },
  { id: 'u-frasco', name: 'Frasco', symbol: 'frasco', type: 'Envase' },
  { id: 'u-botella', name: 'Botella', symbol: 'botella', type: 'Envase' },
  { id: 'u-lata', name: 'Lata', symbol: 'lata', type: 'Envase' },
  { id: 'u-tambor', name: 'Tambor', symbol: 'tambor', type: 'Envase' },
  { id: 'u-saco', name: 'Saco', symbol: 'saco', type: 'Envase' },
  { id: 'u-bolsa', name: 'Bolsa', symbol: 'bolsa', type: 'Envase' },
  { id: 'u-rollo', name: 'Rollo', symbol: 'rollo', type: 'Envase' },
  { id: 'u-carrete', name: 'Carrete', symbol: 'carrete', type: 'Envase' },
  { id: 'u-pallet', name: 'Pallet', symbol: 'pallet', type: 'Envase' },
  { id: 'u-hora', name: 'Hora', symbol: 'h', type: 'Tiempo' },
  { id: 'u-dia', name: 'Día', symbol: 'día', type: 'Tiempo' },
  { id: 'u-mes', name: 'Mes', symbol: 'mes', type: 'Tiempo' },
  { id: 'u-kit', name: 'Kit', symbol: 'kit', type: 'Otros' },
  { id: 'u-set', name: 'Set', symbol: 'set', type: 'Otros' },
  { id: 'u-serv', name: 'Servicio', symbol: 'serv', type: 'Otros' },
  { id: 'u-hh', name: 'Hora-hombre', symbol: 'h-h', type: 'Otros' },
  { id: 'u-m2', name: 'Metro cuadrado', symbol: 'm²', type: 'Otros' },
];

export interface SubscriptionState {
  plan: 'light' | 'essential' | 'pro' | 'enterprise';
  status: 'none' | 'trial' | 'active' | 'expired' | 'cancelled';
  trialEndsAt: string | null;
  updatedAt: string | null;
}

export const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  plan: 'light',
  status: 'none',
  trialEndsAt: null,
  updatedAt: null,
};

export interface PlanLimits {
  sucursales: number | null;
  usuarios: number | null;
  productos: number | null;
}

export const PLAN_LIMITS: Record<SubscriptionState['plan'], PlanLimits> = {
  light: { sucursales: 1, usuarios: 2, productos: 500 },
  essential: { sucursales: 5, usuarios: 20, productos: 5000 },
  pro: { sucursales: 10, usuarios: 50, productos: 50000 },
  enterprise: { sucursales: null, usuarios: null, productos: null },
};

export function effectivePlan(sub: SubscriptionState, now: number = Date.now()): {
  plan: SubscriptionState['plan'];
  status: SubscriptionState['status'];
  trialDaysLeft: number;
} {
  if (sub.status === 'trial' && sub.trialEndsAt) {
    const left = Math.ceil((new Date(sub.trialEndsAt).getTime() - now) / 86400000);
    if (left > 0) {
      return { plan: sub.plan === 'light' ? 'essential' : sub.plan, status: 'trial', trialDaysLeft: left };
    }
    return { plan: 'light', status: 'expired', trialDaysLeft: 0 };
  }
  if (sub.status === 'active') {
    return { plan: sub.plan, status: 'active', trialDaysLeft: 0 };
  }
  return { plan: 'light', status: sub.status === 'cancelled' ? 'cancelled' : 'none', trialDaysLeft: 0 };
}

export function mergePreferences(stored: any): WorkspacePreferences {
  const s = stored && typeof stored === 'object' ? stored : {};
  return {
    locale: { ...DEFAULT_PREFERENCES.locale, ...(s.locale || {}) },
    lowStockThreshold:
      typeof s.lowStockThreshold === 'number' && s.lowStockThreshold >= 0 ? s.lowStockThreshold : 10,
    sector: typeof s.sector === 'string' ? s.sector : null,
    productFields: { ...DEFAULT_PREFERENCES.productFields, ...(s.productFields || {}) },
    tracking: { ...DEFAULT_PREFERENCES.tracking, ...(s.tracking || {}) },
    customUnits: Array.isArray(s.customUnits) ? s.customUnits : [],
  };
}
