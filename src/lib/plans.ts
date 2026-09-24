/**
 * Planes y matriz de comparación (contenido comercial curado).
 * Precio base real del plan Essential; el mensual se deriva del descuento
 * anual declarado (−20 %): 79 / 0.8 = 98.75.
 */

export type PlanId = 'light' | 'essential' | 'pro' | 'enterprise';

export interface PlanTier {
  id: PlanId;
  name: string;
  badge?: string;
  monthlyPrice: number | null;
  annualMonthlyPrice: number | null;
  priceNote?: string;
  tagline: string;
  cta: { label: string; kind: 'current' | 'update' | 'contact' };
  highlighted?: boolean;
}

export const ESSENTIAL_ANNUAL_MONTHLY = 79;
export const ANNUAL_DISCOUNT_PCT = 20;

export const PLANS: PlanTier[] = [
  {
    id: 'light',
    name: 'Light',
    badge: 'PLAN ACTUAL',
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    tagline: 'Perfect for small businesses just getting started',
    cta: { label: 'Plan actual', kind: 'current' },
  },
  {
    id: 'essential',
    name: 'Essential',
    monthlyPrice: Number((ESSENTIAL_ANNUAL_MONTHLY / (1 - ANNUAL_DISCOUNT_PCT / 100)).toFixed(2)),
    annualMonthlyPrice: ESSENTIAL_ANNUAL_MONTHLY,
    priceNote: '/mes, facturado anualmente',
    tagline: 'For growing businesses with multiple locations',
    cta: { label: 'Actualizar', kind: 'update' },
  },
  {
    id: 'pro',
    name: 'Pro',
    badge: 'MOST POPULAR',
    monthlyPrice: null,
    annualMonthlyPrice: null,
    tagline: 'Advanced features for scaling operations',
    cta: { label: 'Contacto Ventas', kind: 'contact' },
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    badge: 'BEST VALUE',
    monthlyPrice: null,
    annualMonthlyPrice: null,
    tagline: 'Full platform access with premium support',
    cta: { label: 'Contactar Ventas', kind: 'contact' },
  },
];

export type CellValue = 'check' | 'cross' | 'addon' | 'sales' | string;

export interface MatrixSection {
  title: string | null;
  rows: Array<{ label: string; values: [CellValue, CellValue, CellValue, CellValue] }>;
}

export const MATRIX: MatrixSection[] = [
  {
    title: 'USAGE LIMITS',
    rows: [
      { label: 'Sucursales', values: ['1', '5', '10', 'Unlimited'] },
      { label: 'Usuarios', values: ['2', '20', '50', 'Unlimited'] },
    ],
  },
  {
    title: null,
    rows: [
      { label: 'Multi-location inventory and relocation', values: ['cross', 'check', 'check', 'check'] },
      { label: 'Analítica básica', values: ['cross', 'check', 'check', 'check'] },
      { label: 'Roles básicos', values: ['cross', 'check', 'check', 'check'] },
    ],
  },
  {
    title: 'ORDERS, RETURNS & FINANCE',
    rows: [
      { label: 'Órdenes de compra', values: ['cross', 'check', 'check', 'check'] },
      { label: 'Órdenes de venta', values: ['cross', 'check', 'check', 'check'] },
      { label: 'Órdenes de reubicación', values: ['cross', 'check', 'check', 'check'] },
      { label: 'Solicitudes de pedido, RFQ y cotizaciones', values: ['cross', 'addon', 'check', 'check'] },
      { label: 'Devoluciones, envíos y facturas', values: ['cross', 'check', 'check', 'check'] },
      { label: 'Reports hub and user management', values: ['cross', 'check', 'check', 'check'] },
      { label: 'Basic pricing', values: ['cross', 'check', 'check', 'check'] },
      { label: 'Advanced workflows, approvals, and pick & pack', values: ['cross', 'cross', 'check', 'check'] },
      { label: 'Devoluciones, envíos y precios avanzados', values: ['cross', 'cross', 'check', 'check'] },
      { label: 'Multi-currency', values: ['cross', 'cross', 'check', 'check'] },
      { label: 'Full Orders', values: ['cross', 'sales', 'check', 'check'] },
      { label: 'Finanzas ligeras', values: ['cross', 'sales', 'check', 'check'] },
      { label: 'Finance Full', values: ['cross', 'cross', 'sales', 'check'] },
    ],
  },
  {
    title: 'ADVANCED MODULES',
    rows: [
      { label: 'Advanced permissions', values: ['cross', 'cross', 'check', 'check'] },
      { label: 'Punto de venta', values: ['sales', 'sales', 'check', 'check'] },
      { label: 'Consignment Core', values: ['cross', 'sales', 'check', 'check'] },
      { label: 'Consignment Full', values: ['cross', 'cross', 'cross', 'sales'] },
      { label: 'Mobile Health Core', values: ['cross', 'sales', 'sales', 'sales'] },
      { label: 'Mobile Health Full', values: ['cross', 'cross', 'cross', 'sales'] },
      { label: 'Analítica Avanzada', values: ['cross', 'sales', 'check', 'check'] },
      { label: 'Previsión con IA', values: ['cross', 'sales', 'check', 'check'] },
      { label: 'Pack de Integraciones', values: ['cross', 'sales', 'check', 'check'] },
      { label: 'Portal de clientes y precios específicos por cliente incl.', values: ['cross', 'cross', 'check', 'check'] },
      { label: 'Implementación personalizada del portal definida con nuestro equipo', values: ['cross', 'cross', 'cross', 'sales'] },
      { label: 'Agente de IA', values: ['cross', 'cross', 'cross', 'sales'] },
    ],
  },
];

export function formatPlanPrice(n: number): string {
  return `PEN ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
