import { ComponentType } from 'react';
import {
  LayoutDashboard,
  BrainCircuit,
  PackagePlus,
  ReceiptText,
  Wallet,
  Boxes,
  BarChart3,
  Blocks,
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
}

export interface NavGroupConfig {
  id: string;
  title: string;
  items: NavItemConfig[];
}

export const NAVIGATION_CONFIG: NavGroupConfig[] = [
  {
    id: 'estrategia',
    title: 'ESTRATEGIA & IA',
    items: [
      {
        id: 'resumen-ejecutivo',
        label: 'Resumen Ejecutivo',
        sublabel: 'KPIs & Control General',
        href: '/dashboard',
        aliases: ['/'],
        icon: LayoutDashboard,
      },
      {
        id: 'forecast',
        label: 'IA Predictiva & Forecast',
        sublabel: 'Predicción 90d y Riesgo Quiebre',
        href: '/forecast',
        aliases: ['/dashboard/predictiva', '/predictiva'],
        icon: BrainCircuit,
      },
      {
        id: 'reabastecimiento',
        label: 'Reabastecimiento Inteligente',
        sublabel: 'Compras Sugeridas (ROP)',
        href: '/reabastecimiento',
        aliases: ['/restock', '/dashboard/reabastecimiento'],
        icon: PackagePlus,
        badgeKey: 'reabastecimiento',
      },
      {
        id: 'ordenes',
        label: 'Órdenes de Compra',
        sublabel: 'Aprobaciones & Trazabilidad',
        href: '/ordenes',
        aliases: ['/orders', '/dashboard/ordenes'],
        icon: ReceiptText,
        badgeKey: 'ordenes',
      },
      {
        id: 'financiamiento',
        label: 'Financiamiento',
        sublabel: 'Capital Requerido & Factoring',
        href: '/financiamiento',
        aliases: ['/financing', '/dashboard/financiamiento'],
        icon: Wallet,
      },
    ],
  },
  {
    id: 'operacion',
    title: 'OPERACIÓN & DATOS',
    items: [
      {
        id: 'inventario',
        label: 'Maestro de Inventario',
        sublabel: 'Valorización & GMROI',
        href: '/inventario',
        aliases: ['/inventory', '/dashboard/inventario'],
        icon: Boxes,
        badgeKey: 'inventario',
      },
      {
        id: 'analytics',
        label: 'Analytics Operacional',
        sublabel: 'Rentabilidad por SKU',
        href: '/analytics',
        aliases: ['/dashboard/analytics'],
        icon: BarChart3,
      },
      {
        id: 'integraciones',
        label: 'Integraciones',
        sublabel: 'Shopify, Mercado Libre, SAP',
        href: '/integraciones',
        aliases: ['/integrations', '/dashboard/integraciones'],
        icon: Blocks,
        badgeKey: 'integraciones',
      },
    ],
  },
  {
    id: 'sistema',
    title: 'SISTEMA',
    items: [
      {
        id: 'ajustes',
        label: 'Ajustes',
        sublabel: 'Parámetros del Algoritmo',
        href: '/ajustes',
        aliases: ['/settings', '/dashboard/ajustes'],
        icon: Settings,
      },
      {
        id: 'soporte',
        label: 'Centro de Ayuda',
        sublabel: 'Mesa de Ayuda Enterprise',
        href: '/soporte',
        aliases: ['/support', '/dashboard/soporte'],
        icon: LifeBuoy,
      },
    ],
  },
];

