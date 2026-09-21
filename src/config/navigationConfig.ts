import { ComponentType } from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  AlertTriangle,
  PackagePlus,
  Boxes,
  BarChart3,
  Coins,
  Wallet,
  Truck,
  Settings,
  LifeBuoy,
  LucideProps,
} from 'lucide-react';
import { NotificationSummary } from '@/services/NotificationService';

export interface NavItemConfig {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  aliases?: string[];
  icon: ComponentType<LucideProps>;
  badgeKey?: keyof NotificationSummary;
  badgeType?: 'alert' | 'warning' | 'info' | 'purple';
}

export interface NavGroupConfig {
  id: string;
  title: string;
  items: NavItemConfig[];
}

export const NAVIGATION_CONFIG: NavGroupConfig[] = [
  {
    id: 'panel',
    title: 'PANEL',
    items: [
      {
        id: 'resumen-ejecutivo',
        label: 'Resumen Ejecutivo',
        sublabel: 'KPIs & Control General',
        href: '/panel/resumen',
        aliases: ['/dashboard', '/'],
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: 'estrategia',
    title: 'ESTRATEGIA & IA',
    items: [
      {
        id: 'forecast',
        label: 'Forecast de 90 días',
        sublabel: 'Predicción de Demanda IA',
        href: '/estrategia/forecast',
        aliases: ['/forecast', '/dashboard/predictiva', '/predictiva'],
        icon: BrainCircuit,
      },
      {
        id: 'riesgo-quiebre',
        label: 'Riesgo de Quiebre',
        sublabel: 'SKUs en Alerta Crítica',
        href: '/estrategia/riesgo-quiebre',
        aliases: ['/panel/alertas', '/quiebre'],
        icon: AlertTriangle,
        badgeKey: 'riesgoQuiebre',
        badgeType: 'alert',
      },
      {
        id: 'compras-recomendadas',
        label: 'Compras Recomendadas',
        sublabel: 'Sugerencias ROP & Lotes',
        href: '/estrategia/compras-recomendadas',
        aliases: ['/reabastecimiento', '/dashboard/reabastecimiento', '/restock'],
        icon: PackagePlus,
        badgeKey: 'reabastecimiento',
        badgeType: 'warning',
      },
    ],
  },
  {
    id: 'finanzas',
    title: 'INVENTARIO & FINANZAS',
    items: [
      {
        id: 'inventario-inmovilizado',
        label: 'Inventario Inmovilizado',
        sublabel: 'Exceso & Stock Dormido',
        href: '/finanzas/inventario-inmovilizado',
        aliases: ['/inventario/inmovilizado', '/inventario'],
        icon: Boxes,
        badgeKey: 'inventarioInmovilizado',
        badgeType: 'warning',
      },
      {
        id: 'rentabilidad-sku',
        label: 'Rentabilidad por SKU',
        sublabel: 'Margen Bruto & GMROI',
        href: '/finanzas/rentabilidad-sku',
        aliases: ['/analytics', '/dashboard/analytics'],
        icon: BarChart3,
      },
      {
        id: 'capital-requerido',
        label: 'Capital Requerido',
        sublabel: 'Presupuesto de Compras',
        href: '/finanzas/capital-requerido',
        aliases: ['/finanzas/capital', '/capital-requerido'],
        icon: Coins,
      },
      {
        id: 'financiamiento-disponible',
        label: 'Financiamiento Disponible',
        sublabel: 'Líneas de Crédito & Factoring',
        href: '/finanzas/financiamiento-disponible',
        aliases: ['/financiamiento', '/dashboard/financiamiento', '/financing'],
        icon: Wallet,
      },
    ],
  },
  {
    id: 'abastecimiento',
    title: 'RED DE ABASTECIMIENTO',
    items: [
      {
        id: 'proveedores-criticos',
        label: 'Proveedores Críticos',
        sublabel: 'Riesgo de Lead Time & SLA',
        href: '/abastecimiento/proveedores-criticos',
        aliases: ['/entidades/proveedores'],
        icon: Truck,
        badgeKey: 'proveedoresCriticos',
        badgeType: 'alert',
      },
    ],
  },
  {
    id: 'sistema',
    title: 'SISTEMA',
    items: [
      {
        id: 'configuracion',
        label: 'Configuración',
        sublabel: 'Parámetros del Algoritmo',
        href: '/configuracion/general',
        aliases: ['/ajustes', '/dashboard/ajustes', '/settings'],
        icon: Settings,
      },
      {
        id: 'soporte',
        label: 'Centro de Soporte',
        sublabel: 'Mesa de Ayuda Enterprise',
        href: '/ayuda/soporte',
        aliases: ['/soporte', '/support'],
        icon: LifeBuoy,
      },
    ],
  },
];
