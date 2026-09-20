import { ComponentType } from 'react';
import {
  LayoutGrid,
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
  ArrowRightLeft,
  Settings,
  Shapes,
  BellRing,
  BookOpen,
  CircleHelp,
  Headphones,
  GraduationCap,
  FileQuestion,
  LucideProps,
} from 'lucide-react';

export interface SidebarItemConfig {
  id: string;
  label: string;
  href: string;
  aliases?: string[];
  icon: ComponentType<LucideProps>;
}

export interface SidebarGroupConfig {
  id: string;
  title: string;
  items: SidebarItemConfig[];
}

export const SIDEBAR_CONFIG: SidebarGroupConfig[] = [
  {
    id: 'panel',
    title: 'PANEL',
    items: [
      { id: 'resumen', label: 'Resumen', href: '/panel/resumen', aliases: ['/dashboard', '/'], icon: LayoutGrid },
      { id: 'alertas', label: 'Alertas de stock', href: '/panel/alertas', aliases: ['/reabastecimiento', '/dashboard/reabastecimiento', '/restock'], icon: Bell },
      { id: 'actividad', label: 'Actividad reciente', href: '/panel/actividad', aliases: ['/ordenes', '/dashboard/ordenes', '/orders'], icon: History },
    ],
  },
  {
    id: 'entidades',
    title: 'ENTIDADES',
    items: [
      { id: 'productos', label: 'Productos', href: '/entidades/productos', aliases: ['/inventario', '/dashboard/inventario', '/inventory'], icon: Tag },
      { id: 'sucursal', label: 'Detalles de la sucursal', href: '/entidades/sucursal', aliases: ['/ajustes', '/dashboard/ajustes', '/settings'], icon: Building2 },
      { id: 'ubicaciones', label: 'Ubicaciones', href: '/entidades/ubicaciones', icon: MapPin },
      { id: 'proveedores', label: 'Proveedores', href: '/entidades/proveedores', icon: Store },
      { id: 'clientes', label: 'Clientes', href: '/entidades/clientes', aliases: ['/analytics', '/dashboard/analytics'], icon: User },
    ],
  },
  {
    id: 'inventario',
    title: 'INVENTARIO',
    items: [
      { id: 'actual', label: 'Inventario actual', href: '/inventario/actual', aliases: ['/inventario', '/dashboard/inventario'], icon: Boxes },
      { id: 'ajustes', label: 'Ajustes de stock', href: '/inventario/ajustes', icon: ArrowLeftRight },
      { id: 'recibos', label: 'Recibos', href: '/inventario/recibos', icon: ArrowDownLeft },
      { id: 'despachos', label: 'Despachos', href: '/inventario/despachos', icon: ArrowUpRight },
      { id: 'importaciones', label: 'Importaciones', href: '/inventario/importaciones', icon: Download },
    ],
  },
  {
    id: 'complementos',
    title: 'COMPLEMENTOS',
    items: [
      { id: 'disponibles', label: 'Complementos Disponibles', href: '/complementos/disponibles', aliases: ['/integraciones', '/dashboard/integraciones', '/integrations'], icon: ShoppingBag },
      { id: 'planes', label: 'Comparar Planes', href: '/complementos/planes', aliases: ['/financiamiento', '/dashboard/financiamiento', '/financing'], icon: ArrowRightLeft },
    ],
  },
  {
    id: 'configuracion',
    title: 'CONFIGURACIÓN',
    items: [
      { id: 'general', label: 'Configuración general', href: '/configuracion/general', aliases: ['/ajustes', '/dashboard/ajustes'], icon: Settings },
      { id: 'categorias', label: 'Categorías', href: '/configuracion/categorias', icon: Shapes },
      { id: 'alertas-reorden', label: 'Ajustes de Alerta y Reorden', href: '/configuracion/alertas', icon: BellRing },
    ],
  },
  {
    id: 'ayuda',
    title: 'AYUDA',
    items: [
      { id: 'guia', label: 'Guía del usuario', href: '/ayuda/guia', icon: BookOpen },
      { id: 'faq', label: 'Preguntas frecuentes', href: '/ayuda/faq', icon: CircleHelp },
      { id: 'soporte', label: 'Contactar soporte', href: '/ayuda/soporte', aliases: ['/soporte', '/support'], icon: Headphones },
      { id: 'aprender', label: 'Aprender', href: '/ayuda/aprender', icon: GraduationCap },
      { id: 'prueba', label: 'Ponme a prueba', href: '/ayuda/prueba', aliases: ['/forecast', '/dashboard/predictiva'], icon: FileQuestion },
    ],
  },
];
