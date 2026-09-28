import { ComponentType } from 'react';
import {
  LayoutDashboard,
  Bell,
  History,
  Tag,
  Building2,
  MapPin,
  Store,
  User,
  Boxes,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  ShoppingBag,
  Repeat,
  Settings,
  Shapes,
  BellPlus,
  BookOpen,
  MessageCircleQuestion,
  Headset,
  GraduationCap,
  FileQuestion,
  Blocks,
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

/* Orden estándar de mercado (Stripe / Linear / Ramp): primero el pulso
   diario (panel), luego la operación (inventario), las relaciones
   (entidades por frecuencia de uso), conexiones, planes, y al fondo
   configuración y ayuda. Los ids/hrefs/aliases no cambian: el sidebar, la
   paleta de comandos y Nexo consumen este arreglo dinámicamente. */
export const NAVIGATION_CONFIG: NavGroupConfig[] = [
  {
    id: 'panel',
    title: 'PANEL',
    items: [
      {
        id: 'resumen',
        label: 'Resumen',
        href: '/overview',
        aliases: ['/panel/resumen', '/dashboard', '/'],
        icon: LayoutDashboard,
      },
      {
        id: 'alertas-stock',
        label: 'Alertas de stock',
        href: '/stock-alerts',
        aliases: ['/panel/alertas', '/estrategia/riesgo-quiebre', '/quiebre'],
        icon: Bell,
        badgeKey: 'riesgoQuiebre',
        badgeType: 'alert',
      },
      {
        id: 'actividad-reciente',
        label: 'Actividad reciente',
        href: '/activity-log',
        aliases: ['/panel/actividad', '/dashboard/ordenes'],
        icon: History,
      },
    ],
  },
  {
    id: 'inventario',
    title: 'INVENTARIO',
    items: [
      {
        id: 'inventario-actual',
        label: 'Inventario actual',
        href: '/inventory/inventory-items',
        aliases: ['/inventario/actual', '/inventario', '/dashboard/inventario', '/inventory'],
        icon: Boxes,
        badgeKey: 'inventarioInmovilizado',
        badgeType: 'warning',
      },
      {
        id: 'ajustes-stock',
        label: 'Ajustes de stock',
        href: '/inventory/stock-adjustments',
        aliases: ['/inventario/ajustes'],
        icon: ArrowLeftRight,
      },
      {
        id: 'recibos',
        label: 'Recibos',
        href: '/inventory/incoming',
        aliases: ['/inventario/recibos', '/ordenes'],
        icon: ArrowDownLeft,
      },
      {
        id: 'despachos',
        label: 'Despachos',
        href: '/inventory/outgoing',
        aliases: ['/inventario/despachos'],
        icon: ArrowUpRight,
      },
      {
        id: 'importaciones',
        label: 'Importaciones',
        href: '/inventory/imports',
        aliases: ['/inventario/importaciones'],
        icon: Download,
      },
    ],
  },
  {
    id: 'entidades',
    title: 'ENTIDADES',
    items: [
      {
        id: 'productos',
        label: 'Productos',
        href: '/products/products',
        aliases: ['/entidades/productos'],
        icon: Tag,
      },
      {
        id: 'proveedores',
        label: 'Proveedores',
        href: '/inventory/vendors',
        aliases: ['/entidades/proveedores', '/abastecimiento/proveedores-criticos'],
        icon: Store,
        badgeKey: 'proveedoresCriticos',
        badgeType: 'alert',
      },
      {
        id: 'clientes',
        label: 'Clientes',
        href: '/inventory/clients',
        aliases: ['/entidades/clientes'],
        icon: User,
      },
      {
        id: 'ubicaciones',
        label: 'Ubicaciones',
        href: '/inventory/locations',
        aliases: ['/entidades/ubicaciones'],
        icon: MapPin,
      },
      {
        id: 'sucursal',
        label: 'Detalles de la sucursal',
        href: '/inventory/branch-details',
        aliases: ['/entidades/sucursal'],
        icon: Building2,
      },
    ],
  },
  {
    id: 'integraciones',
    title: 'INTEGRACIONES',
    items: [
      {
        id: 'centro-integraciones',
        label: 'Integraciones',
        sublabel: 'Marketplaces, e-commerce y ERP',
        href: '/dashboard/integraciones',
        aliases: ['/integraciones', '/integrations'],
        icon: Blocks,
      },
    ],
  },
  {
    id: 'complementos',
    title: 'COMPLEMENTOS',
    items: [
      {
        id: 'comparar-planes',
        label: 'Comparar Planes',
        href: '/plans',
        aliases: ['/complementos/planes', '/financiamiento', '/dashboard/financiamiento', '/financing'],
        icon: Repeat,
      },
      {
        id: 'complementos-disponibles',
        label: 'Complementos Disponibles',
        href: '/addons',
        aliases: ['/complementos/disponibles'],
        icon: ShoppingBag,
      },
    ],
  },
  {
    id: 'configuracion',
    title: 'CONFIGURACIÓN',
    items: [
      {
        id: 'config-general',
        label: 'Configuración general',
        href: '/settings/general-settings',
        aliases: ['/configuracion/general', '/ajustes', '/dashboard/ajustes', '/settings'],
        icon: Settings,
      },
      {
        id: 'categorias',
        label: 'Categorías',
        href: '/settings/product-categories',
        aliases: ['/configuracion/categorias'],
        icon: Shapes,
      },
      {
        id: 'alertas-reorders',
        label: 'Ajustes de Alerta y Reorders',
        href: '/settings/stock-alerts-reorders',
        aliases: ['/configuracion/alertas'],
        icon: BellPlus,
      },
    ],
  },
  {
    id: 'ayuda',
    title: 'AYUDA',
    items: [
      {
        id: 'guia-usuario',
        label: 'Guía del usuario',
        href: '/help/user-guide',
        aliases: ['/ayuda/guia'],
        icon: BookOpen,
      },
      {
        id: 'faq',
        label: 'Preguntas frecuentes',
        href: '/help/faq',
        aliases: ['/ayuda/faq'],
        icon: MessageCircleQuestion,
      },
      {
        id: 'contactar-soporte',
        label: 'Contactar soporte',
        href: '/help/contact-support',
        aliases: ['/ayuda/soporte', '/soporte', '/support'],
        icon: Headset,
      },
      {
        id: 'aprender',
        label: 'Aprender',
        href: '/help/learn',
        aliases: ['/ayuda/aprender'],
        icon: GraduationCap,
      },
      {
        id: 'ponme-a-prueba',
        label: 'Ponme a prueba',
        href: '/help/grill-me',
        aliases: ['/ayuda/prueba'],
        icon: FileQuestion,
      },
    ],
  },
];
