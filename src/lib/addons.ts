/**
 * Catálogo de complementos (Add-ons). Contenido comercial curado del producto
 * (igual que CLIENTS o el directorio): títulos, descripciones y features.
 * Lo DINÁMICO (precios Stripe, estado de autoservicio) lo resuelve el backend
 * en /api/billing/addons según configuración real (STRIPE_SECRET_KEY).
 */

export type PlanTier = 'ESSENTIAL' | 'PRO' | 'ENTERPRISE';

export interface AddonFeature {
  text: string;
}

export interface Addon {
  id: string;
  name: string;
  icon: string;
  plan: PlanTier;
  /** Precio mensual PEN (solo si hay Price ID de Stripe configurado). */
  monthlyPrice?: number;
  /** Price ID de Stripe para compra directa (ausente = sales-led). */
  stripePriceId?: string;
  stripeAnnualPriceId?: string;
  annualPrice?: number;
  description: string;
  features: string[];
}

export const ADDONS: Addon[] = [
  {
    id: 'pos',
    name: 'Punto de venta',
    icon: 'ShoppingBag',
    plan: 'ESSENTIAL',
    description:
      'Abre el terminal POS dedicado de Panthor para cobros en efectivo y con tarjeta, inicio de sesión de cajero con PIN, sesiones de caja, recibos e historial de ventas.',
    features: [
      'Interfaz del terminal POS',
      'Cobro en efectivo y con tarjeta',
      'Pagos conectados con Stripe',
      'Inicio de sesión de cajero con PIN',
      'Sesiones de caja y gestión de efectivo',
      'Registro de transacciones y pista de auditoría',
      'Historial de ventas',
      'Impresión de recibos',
    ],
  },
  {
    id: 'full-orders',
    name: 'Full Orders',
    icon: 'Package',
    plan: 'ESSENTIAL',
    description:
      'Desbloquee Solicitudes de Pedido, Solicitudes de Cotización (RFQ) y Cotizaciones en el plan Essential, sin pasar a Pro. También incluye el Portal de Cuenta: enlaces seguros de solo lectura que permiten a sus clientes ver sus pedidos, envíos, facturas y estados de cuenta, y a sus proveedores ver sus órdenes de compra, recibos y las RFQ que han respondido, sin necesidad de iniciar sesión. El flujo de aprobación de pedidos sigue controlado por su propia configuración de aprobación.',
    features: [
      'Solicitudes de pedido',
      'Solicitud de cotización (RFQ)',
      'Cotizaciones',
      'El flujo de aprobación sigue siendo opcional (según tu configuración)',
      'Portal de Cuenta: enlaces seguros de solo lectura para clientes y proveedores (sin inicio de sesión, PIN opcional)',
      'Portal del cliente: pedidos, envíos, facturas y estados de cuenta (antigüedad/vencidos)',
      'Portal del proveedor: órdenes de compra, recepciones de mercancía y revisión de RFQ',
      'Envíe enlaces de cuenta por correo a clientes y proveedores, o cópielos y compártalos',
    ],
  },
  {
    id: 'consignment-core',
    name: 'Consignment Core',
    icon: 'ArrowLeftRight',
    plan: 'ESSENTIAL',
    description:
      'Gestiona el espacio de trabajo principal de consignación: acuerdos, pedidos, pipeline, libro mayor, inventario, envíos, recepciones, liquidaciones, facturas y fichas de clientes.',
    features: [
      'Acuerdos de consignación',
      'Pedidos y pipeline',
      'Actividad del libro mayor',
      'Inventario en consignación',
      'Envíos y recepciones',
      'Informes de consumo',
      'Solicitudes de reposición',
      'Liquidaciones, facturas y clientes',
    ],
  },
  {
    id: 'mobile-health-core',
    name: 'Mobile Health Core',
    icon: 'HeartPulse',
    plan: 'ESSENTIAL',
    description:
      'Run mobile health programs: transfers to mobile units, the stock ledger, field stock, deliveries, restock requests and the phone app for outreach workers.',
    features: [
      'Programas',
      'Transfers to mobile units',
      'Stock ledger',
      'Field stock',
      'Entregas',
      'Restock requests',
      'Phone app for outreach workers',
    ],
  },
  {
    id: 'pack-integraciones',
    name: 'Pack de integraciones',
    icon: 'Blocks',
    plan: 'ESSENTIAL',
    description:
      'Gestiona las integraciones disponibles de Square y Shopify, incluida la gestión de la conexión con el proveedor, los mapeos, el historial de sincronización y la sincronización manual.',
    features: [
      'Centro de integraciones',
      'Estado de conexión de los proveedores compatibles',
      'Gestión de la conexión con Square',
      'Mapeo de ubicaciones y artículos de Square',
      'Gestión de la conexión con Shopify',
      'Mapeo de sucursales y productos de Shopify',
      'Historial de sincronización y sincronización manual',
    ],
  },
  {
    id: 'analitica-avanzada',
    name: 'Analítica Avanzada',
    icon: 'BarChart3',
    plan: 'ESSENTIAL',
    description:
      'Utiliza el centro de informes para informes guardados, programaciones, anclajes al panel, exportaciones y flujos de trabajo de informes avanzados.',
    features: [
      'Plantillas de informes',
      'Informes guardados',
      'Informes programados',
      'Historial de ejecuciones',
      'Anclaje al panel',
      'Exportaciones a CSV y Excel',
      'Análisis de tendencias',
      'Vistas de informes avanzadas',
    ],
  },
  {
    id: 'finanzas-ligeras',
    name: 'Finanzas ligeras',
    icon: 'Wallet',
    plan: 'ESSENTIAL',
    description:
      'Cuentas por cobrar, estados de cuenta de clientes, antigüedad de CxC, cobros, notas de crédito, exportaciones fiscales e informes financieros, con un interruptor operativo independiente a nivel de tenant.',
    features: [
      'Resumen de cuentas por cobrar, facturas abiertas y antigüedad de CxC (por cliente)',
      'Estados de cuenta de clientes',
      'Historial de cobros y exportación a CSV',
      'Notas de crédito (correcciones) con cuentas por cobrar correctas a efectos de IVA',
      'Historial de exportaciones fiscales, generación y descarga en CSV',
      'Informes de excepciones financieras',
      'Interruptor operativo de activación/desactivación por tenant',
    ],
  },
  {
    id: 'prevision-ia',
    name: 'Previsión con IA',
    icon: 'BrainCircuit',
    plan: 'ESSENTIAL',
    description:
      'Utiliza la previsión de inventario, las recomendaciones de reabastecimiento y el seguimiento del rendimiento de los modelos para mejorar las decisiones de compra.',
    features: [
      'Pronósticos de inventario',
      'Recomendaciones de IA',
      'Rendimiento del modelo',
      'Recomendaciones de reabastecimiento',
      'Orientación sobre stock de seguridad',
      'Prellenado de órdenes de compra',
      'Herramientas de exportación y reentrenamiento',
    ],
  },
  {
    id: 'portal-clientes-pro',
    name: 'Portal de clientes y precios específicos por cliente incluidos (Pro)',
    icon: 'Store',
    plan: 'PRO',
    description:
      'Pro incluye el portal de clientes estándar, el catálogo compartido, la visibilidad del stock, las solicitudes de pedido y los precios específicos por cliente, sin una tarifa adicional por el portal. Pro admite hasta 500 clientes activos del portal, contados por separado de los usuarios del equipo. Las implementaciones personalizadas Enterprise se definen con nuestro equipo.',
    features: [
      'Base del portal orientado al cliente',
      'Visibilidad del catálogo compartido',
      'Visibilidad del stock en las vistas del portal',
      'Flujos de captura de pedidos',
      'Flujos de captura de solicitudes',
      'Precios específicos por cliente (Pro, Enterprise)',
    ],
  },
  {
    id: 'finance-full',
    name: 'Finance Full',
    icon: 'Landmark',
    plan: 'PRO',
    description:
      'Suite contable completa construida sobre los datos operativos que Panthor ya posee: un libro mayor de partida doble nativo que se asienta solo, cuentas por pagar, costeo de inventario y COGS, estados financieros en tiempo real, cierre de período, conciliación bancaria y consolidación multipaís. Incluye todo lo de Finance Lite.',
    features: [
      'Todo lo de Finance Lite (CxC, estados de cuenta, cobros, notas de crédito, exportaciones fiscales)',
      'Libro mayor de partida doble nativo con configuración guiada del plan de cuentas',
      'Libros contables que se asientan solos a partir de ventas, pagos, POS, consignación e inventario',
      'Cuentas por pagar: facturas de proveedores, pagos, antigüedad de CxP, conciliación con órdenes de compra',
      'Costeo de inventario y COGS automático (promedio ponderado o FIFO)',
      'Cuenta de resultados, balance y flujo de caja en tiempo real con desglose hasta los documentos de origen',
      'Períodos fiscales, cierre de período guiado y cierre anual',
      'Conciliación bancaria y consolidación multipaís',
      'Interruptor operativo de activación/desactivación por tenant',
    ],
  },
  {
    id: 'consignment-full',
    name: 'Consignment Full',
    icon: 'ArrowLeftRight',
    plan: 'ENTERPRISE',
    description:
      'Añade operaciones de trunk, controles de políticas de stock, supervisión de cumplimiento, devoluciones de almacén y superficies de portal a Consignment Core.',
    features: [
      'Todo lo de Consignment Core',
      'Espacio de trabajo de trunks',
      'Políticas de trunk',
      'Políticas de stock',
      'Espacio de trabajo de cumplimiento',
      'Devoluciones de almacén',
      'Portal de consignación',
    ],
  },
  {
    id: 'mobile-health-full',
    name: 'Mobile Health Full',
    icon: 'HeartPulse',
    plan: 'ENTERPRISE',
    description:
      'Add mobile units, unit policies, returns to the central store, the compliance workspace and stock policies to Mobile Health Core.',
    features: [
      'Everything in Mobile Health Core',
      'Unidades móviles',
      'Unit policies',
      'Returns to central store',
      'Espacio de trabajo de cumplimiento',
      'Políticas de stock',
      'Dispensing on the phone',
    ],
  },
  {
    id: 'portal-custom',
    name: 'Implementación personalizada del portal definida con nuestro equipo',
    icon: 'Wrench',
    plan: 'ENTERPRISE',
    description:
      'El portal de clientes estándar y los precios específicos por cliente están incluidos en Pro, sin una tarifa adicional por el portal. Los proyectos Enterprise cubren implementaciones personalizadas, integraciones avanzadas, requisitos de marca blanca o infraestructura dedicada.',
    features: [
      'Portal de clientes y precios específicos por cliente incluidos (Pro)',
      'Implementación personalizada del portal definida con nuestro equipo',
      'Advanced integration requirements',
      'White-label and dedicated infrastructure options',
    ],
  },
  {
    id: 'agente-ia',
    name: 'Agente de IA',
    icon: 'Bot',
    plan: 'ENTERPRISE',
    description:
      'Utiliza las superficies de IA disponibles actualmente para resúmenes de la vista general y creación de informes en lenguaje natural en los flujos de trabajo compatibles.',
    features: [
      'Resumen general con IA',
      'Preguntas de seguimiento a la IA desde la vista general',
      'Instrucciones de informes en lenguaje natural',
      'Sugerencias de informes con puntuación de confianza',
      'Apertura directa de las vistas de informe sugeridas',
    ],
  },
];

export interface BillingStatus {
  stripeConfigured: boolean;
  billingCycle: 'mensual' | 'anual';
  annualDiscountPct: number;
}

export function resolveAddonStatus(
  addon: Addon,
  billing: BillingStatus
): { mode: 'self-service' | 'sales-led'; monthlyPrice: number | null; annualPrice: number | null } {
  const hasPrice = Boolean(addon.stripePriceId) && billing.stripeConfigured;
  if (!hasPrice) {
    return { mode: 'sales-led', monthlyPrice: null, annualPrice: null };
  }
  const monthly = addon.monthlyPrice ?? null;
  const annual =
    addon.annualPrice ?? (monthly !== null ? Number((monthly * 12 * (1 - billing.annualDiscountPct / 100)).toFixed(2)) : null);
  return { mode: 'self-service', monthlyPrice: monthly, annualPrice: annual };
}
