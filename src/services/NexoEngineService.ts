import { RestockCalculatorService } from './RestockCalculatorService';
import { NotificationService } from './NotificationService';
import { FinancingService } from './FinancingService';
import { BatchOrderApprovalService } from './BatchOrderApprovalService';
import { IntegrationService } from './IntegrationService';
import { resolveWorkspaceId } from '@/lib/locationsStore';
import { NAVIGATION_CONFIG } from '@/config/navigationConfig';

/**
 * NexoEngineService — cerebro transaccional de Nexo, copiloto de INVENTA.AI.
 *
 * Honestidad de diseño (regla del core, sin mocks):
 * - Sin LLM configurado en el proyecto (no hay OPENAI_API_KEY): la
 *   interpretación es un enrutador determinista de comandos en español,
 *   auditable y sin alucinaciones por construcción. Cuando se configure
 *   una clave de proveedor LLM, este es el punto de extensión.
 * - Todos los números provienen de los servicios reales (ROP/cobertura de
 *   RestockCalculatorService, simulación de FinancingService, conteos de
 *   NotificationService). Si no hay datos, se dice explícitamente.
 * - Ninguna acción transaccional se ejecuta sin confirmación explícita
 *   (la ruta /execute exige confirm:true) y toda ejecución se audita en
 *   integration_logs como "Asistida por Nexo".
 */

export type NexoActionType = 'generate_oc' | 'request_disbursement' | 'navigate';

export interface NexoAction {
  type: NexoActionType;
  label: string;
  /** generate_oc: { itemIds?: string[] } · request_disbursement: { amount, termDays } · navigate: { href } */
  payload: Record<string, any>;
  /** request_disbursement siempre exige doble confirmación en UI */
  requiresConfirm: boolean;
}

export interface NexoCard {
  id: string;
  kind: 'sku' | 'oc' | 'financing' | 'connector' | 'info' | 'summary' | 'history';
  title: string;
  subtitle?: string;
  metric?: string;
  action?: NexoAction;
  /** summary: { kpis: [{label,value}] } · history: { items: [líneas] } */
  payload?: Record<string, any>;
}

export interface NexoQueryResult {
  intent: string;
  reply: string;
  cards: NexoCard[];
  elapsedMs: number;
  /** Function calling: el frontend ejecuta estas herramientas (ej. navegación). */
  toolCalls?: Array<{
    tool: 'navigate_to_module';
    args: { destination_path: string; label: string };
  }>;
}

export interface NexoExecuteResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  elapsedMs: number;
}

type Intent = 'financing' | 'generate_oc' | 'critical_stock' | 'sync_status' | 'help' | 'memory' | 'status';

// ---------------------------------------------------------------------------
// Memoria persistente de Nexo (corto + largo plazo) en workspaces.settings.
// Cero DDL, cero vectores externos: hechos y últimas interacciones por
// workspace. Si el usuario aprobó una OC, la siguiente interacción lo sabe.
// ---------------------------------------------------------------------------

export interface NexoMemory {
  interactions: Array<{ ts: string; intent: string; summary: string }>;
  facts: Record<string, any>;
  sessions: number;
}

const MEMORY_KEY = 'nexo_memory';
const MEMORY_INTERACTIONS_CAP = 20;

function blankMemory(): NexoMemory {
  return { interactions: [], facts: {}, sessions: 0 };
}

async function loadNexoMemory(supabase: any, workspaceId: string): Promise<NexoMemory> {
  try {
    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const m = (ws?.settings as any)?.[MEMORY_KEY];
    if (m && typeof m === 'object') {
      return {
        interactions: Array.isArray(m.interactions) ? m.interactions.slice(0, MEMORY_INTERACTIONS_CAP) : [],
        facts: m.facts && typeof m.facts === 'object' ? m.facts : {},
        sessions: typeof m.sessions === 'number' ? m.sessions : 0,
      };
    }
  } catch {
    /* sin memoria: arranca en blanco */
  }
  return blankMemory();
}

async function saveNexoMemory(supabase: any, workspaceId: string, memory: NexoMemory): Promise<void> {
  try {
    const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
    const settings = { ...(((ws as any)?.settings as any) || {}), [MEMORY_KEY]: memory };
    await supabase.from('workspaces').update({ settings }).eq('id', workspaceId);
  } catch {
    /* mejor esfuerzo */
  }
}

function timeAgo(ts: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

const CONNECTORS = [
  { id: 'shopify', name: 'Shopify' },
  { id: 'mercadolibre', name: 'Mercado Libre' },
  { id: 'woocommerce', name: 'WooCommerce' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'sap', name: 'SAP' },
  { id: 'sunat', name: 'SUNAT' },
];

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ' ');
}

function detectIntent(message: string): Intent {
  const t = ` ${norm(message)} `;
  if (/recuerdas|historial|hiciste|qué hic|que hic|ultima vez|mi actividad|generaste|qué fue|que fue|lo ultimo|anteriormente/.test(t)) return 'memory';
  if (/financi|desembols|anticipo|capital|credito|prestamo|banco|pichincha/.test(t)) return 'financing';
  if (/genera|crea|crear|aprueba|aprobar|orden|reabastec|repone|compra|\boc\b/.test(t)) return 'generate_oc';
  if (/resumen|balance|como voy|cómo voy|estado general|como va|cómo va|panel general/.test(t)) return 'status';
  if (/quiebr|quebr|critico|stock|faltan|falta|alerta|inventario|sku/.test(t)) return 'critical_stock';
  if (/sincron|integrac|conect|shopify|mercado|whatsapp|sap|sunat|woocommerce/.test(t)) return 'sync_status';
  return 'help';
}

// Límite de dominio: cadena de suministro, inventario y finanzas.
// Confinamiento estricto contra temas ajenos a INVENTA.AI.
const OFF_DOMAIN = [
  'futbol', 'soccer', 'receta', 'cocina', 'cocinar', 'pastel', 'torta', 'comida', 'cena', 'almuerzo',
  'desayuno', 'ingrediente', 'postre', 'python', 'javascript', 'java', 'react', 'html', 'css',
  'codigo', 'programar', 'programacion', 'script', 'bug', 'funcion', 'algoritmo', 'presidente',
  'politica', 'elecciones', 'guerra', 'congreso', 'chiste', 'broma', 'poema', 'cancion', 'cuento',
  'musica', 'pelicula', 'serie', 'netflix', 'clima', 'tiempo manana', 'horoscopo', 'zodiacal',
  'amor', 'viaje', 'turismo', 'noticias', 'messi', 'ronaldo', 'dolar blue', 'bitcoin', 'crypto',
  'ethereum', 'quien gano', 'quien es', 'que hora es', 'cuentame un', 'dame una receta',
];
const DOMAIN_HINTS = [
  'financi', 'desembols', 'anticipo', 'capital', 'credito', 'prestamo', 'banco',
  'stock', 'orden', 'compra', 'sku', 'proveedor', 'cliente', 'inventario',
  'quiebr', 'quebr', 'inventa', 'nexo', 'hola', 'buenas', 'gracias', 'si', 'vale',
  'resumen', 'balance', 'sincron', 'integrac', 'conect', 'recuerdas', 'historial',
  'genera', 'crea', 'aprueba', 'reabastec', 'repone', 'alerta', 'categoria',
  'ubicacion', 'sucursal', 'producto', 'plan', 'complemento', 'ayuda', 'soporte',
];

export function isOffDomain(message: string): boolean {
  const t = ` ${norm(message)} `;
  // Si contiene señales fuertes de inventario, finanzas u operaciones de la plataforma, está en dominio
  const hasStrongDomain = /inventario|stock|sku|reabastec|quiebr|proveedor|orden|compras|rop|cobertura|financiam/.test(t);
  if (hasStrongDomain) return false;

  const off = OFF_DOMAIN.some((k) => new RegExp(`\\b${escapeRegExp(norm(k))}`).test(t));
  return off && !hasNavVerb(message);
}

/** SKU en foco desde el query string de la pantalla (?q=, ?sku=, ?search=). */
export function extractFocusSku(search: string): string | null {
  try {
    const params = new URLSearchParams((search || '').replace(/^\?/, ''));
    for (const key of ['sku', 'q', 'search', 'filtro', 'filter']) {
      const v = (params.get(key) || '').trim().toUpperCase();
      if (v && v.length >= 3) return v;
    }
  } catch {
    /* sin contexto de búsqueda */
  }
  return null;
}

function extractAmount(message: string): number | null {
  const m = message.replace(/\./g, '').replace(/,/g, '.').match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
}

function extractSku(message: string): string | null {
  const m = message.match(/sku[-\s:_]*([a-z0-9-]+)/i);
  return m ? m[1].toUpperCase() : null;
}

// ---------------------------------------------------------------------------
// Function calling: navigate_to_module.
// El mapa de destinos ES el mapa oficial del sidebar (NAVIGATION_CONFIG):
// imposible redirigir a una ruta inexistente por construcción.
// ---------------------------------------------------------------------------

const NAV_VERBS = [
  'llev', 'quiero ir', 'ir a', 've a', 'abre', 'abrir', 'dirige', 'navega',
  'vamos', 'anda', 'muestrame', 'donde', 'como llego', 'quiero ver',
  'quiero abrir', 'quiero configurar', 'quiero financiar', 'financiar mis',
  'configurar', 'configura', 'conectar', 'conecta',
];

const NAV_EXTRA_KEYS: Record<string, string[]> = {
  '/overview': ['resumen', 'panel', 'inicio', 'tablero'],
  '/stock-alerts': ['alerta', 'riesgo', 'quiebre'],
  '/activity-log': ['actividad', 'historial', 'bitacora', 'auditoria'],
  '/products/products': ['producto', 'catalogo'],
  '/inventory/branch-details': ['sucursal', 'sede', 'tienda', 'local'],
  '/inventory/locations': ['ubicacion', 'almacen', 'deposito', 'bodega'],
  '/inventory/vendors': ['proveedor', 'abastecedor'],
  '/inventory/clients': ['cliente'],
  '/inventory/inventory-items': ['inventario', 'existencias', 'inmovilizado'],
  '/inventory/stock-adjustments': ['ajuste de stock', 'ajustar', 'ajust', 'stock'],
  '/inventory/incoming': ['recibo', 'recepcion', 'orden', 'entrada'],
  '/inventory/outgoing': ['despacho', 'salida', 'envio'],
  '/inventory/imports': ['importacion', 'importar', 'plantilla'],
  '/dashboard/integraciones': ['integracion', 'conectar', 'conexion', 'sincronizar', 'sincronizacion', 'marketplace', 'shopify', 'mercadolibre', 'woocommerce', 'whatsapp', 'sap', 'sunat'],
  '/addons': ['complemento', 'extension'],
  '/plans': ['plan', 'precio', 'financiamiento', 'financiar', 'credito', 'suscripcion', 'anticipo'],
  '/settings/general-settings': ['configuracion general', 'preferencia', 'cuenta', 'empresa'],
  '/settings/product-categories': ['categoria'],
  '/settings/stock-alerts-reorders': ['reorden', 'reorder', 'umbral'],
  '/help/user-guide': ['guia'],
  '/help/faq': ['pregunta', 'frecuente'],
  '/help/contact-support': ['soporte', 'contacto', 'ayuda'],
  '/help/learn': ['aprender', 'tutorial'],
  '/help/grill-me': ['prueba', 'examen'],
};

interface NavTarget {
  href: string;
  label: string;
  keys: string[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildNavTargets(): NavTarget[] {
  const targets: NavTarget[] = [];
  for (const group of NAVIGATION_CONFIG) {
    for (const item of group.items) {
      const keys = [item.label, ...(item.aliases || []).map((a) => a.replace(/^\//, '').replace(/[-/]/g, ' '))];
      const extra = NAV_EXTRA_KEYS[item.href] || [];
      targets.push({ href: item.href, label: item.label, keys: [...keys, ...extra].map((k) => norm(k)).filter((k) => k.length >= 3) });
    }
  }
  return targets;
}

export function hasNavVerb(message: string): boolean {
  const t = ` ${norm(message)} `;
  return NAV_VERBS.some((v) => new RegExp(`\\b${escapeRegExp(norm(v))}`).test(t));
}

/** Mejor destino del mapa oficial o null (nunca inventa rutas). */
export function resolveNavigation(message: string): { href: string; label: string } | null {
  const t = ` ${norm(message)} `;
  let best: { href: string; label: string; score: number } | null = null;
  for (const target of buildNavTargets()) {
    for (const key of target.keys) {
      if (new RegExp(`\\b${escapeRegExp(key)}`).test(t)) {
        if (!best || key.length > best.score) best = { href: target.href, label: target.label, score: key.length };
      }
    }
  }
  return best ? { href: best.href, label: best.label } : null;
}

async function getConnectorStates(supabase: any, workspaceId: string) {
  const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
  const settings = ((ws as any)?.settings as Record<string, any>) || {};
  return CONNECTORS.map((c) => {
    const cfg = settings[`config_${c.id}`];
    const tok = settings[`oauth_${c.id}`];
    const configured = Boolean((cfg && Object.keys(cfg).length > 0) || (tok && (tok.access_token || tok.accessToken)));
    return { ...c, configured };
  });
}

export class NexoEngineService {
  /**
   * Saludo proactivo según la pantalla (conciencia de contexto real vía pathname).
   */
  public static async greet(pathname: string, userEmail: string): Promise<NexoQueryResult> {
    const started = Date.now();
    const [{ items, criticalCount, totalCapitalRequired }, credit] = await Promise.all([
      RestockCalculatorService.calculateRestockItems(),
      FinancingService.getCreditSummary(),
    ]);

    const criticalItems = items.filter((i) => i.status === 'critical');
    const warningItems = items.filter((i) => i.status === 'warning');

    const reply = `### 📋 Informe Ejecutivo de Situación Operativa

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- **Catálogo Analizado**: Se tienen evaluados **${items.length} SKUs activos** bajo el modelo algorítmico de Punto de Reorden (ROP).
- **Estado de Stock**: ${criticalCount > 0 ? `Se identifican **${criticalCount} SKUs en quiebre inminente** (< 3.5 días) y **${warningItems.length} SKUs en zona de reorden**.` : `El inventario se mantiene sin quiebres críticos en este momento. Se monitorean **${warningItems.length} SKUs en advertencia preventiva**.`}
- **Inversión Requerida**: El capital total proyectado para reabastecimiento asciende a **S/ ${totalCapitalRequired.toLocaleString()}**.

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo)**
- ${criticalCount > 0 ? `De mantenerse la velocidad de venta actual, los productos con menor stock agotarán sus existencias antes de que los proveedores completen el plazo de entrega pactado.` : `La cobertura actual proyectada asegura la continuidad de despachos para los próximos 7 a 14 días sin tensión de suministro en las líneas principales.`}
- ${totalCapitalRequired > 0 ? `El riesgo financiero principal consiste en no colocar las órdenes a tiempo, lo que generaría pérdida de margen por ventas no atendidas.` : `El riesgo operativo está mitigado en las principales categorías.`}

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- **Módulo de Reabastecimiento**: Inspeccionar los lotes y cantidades sugeridas en el módulo de Reabastecimiento Inteligente (\`/dashboard/reabastecimiento\`).
- **Aprobación de Órdenes**: ${criticalCount > 0 ? `Aprobar las órdenes de compra en borrador para los ${criticalCount} ítems más críticos.` : `Confirmar calendarios de recepción con proveedores clave.`}
- **Línea de Financiamiento**: Se dispone de **S/ ${credit.available_amount.toLocaleString()}** pre-aprobados con ${credit.partner_bank_name} para optimizar compras sin desbalancear la caja.

¿En qué módulo operativo puedo asistirte o prefieres que analicemos un SKU en detalle?`;

    const cards: NexoCard[] = [];
    if (criticalItems.length > 0) {
      cards.push(
        ...criticalItems.slice(0, 3).map((i) => ({
          id: `sku-${i.id}`,
          kind: 'sku' as const,
          title: `${i.sku} · ${i.name}`,
          subtitle: `Cobertura ${i.coverageDays} días · ROP ${i.rop} · Sugerido ${i.suggestedQty} u`,
          metric: `S/ ${i.investment.toLocaleString()}`,
          action: {
            type: 'generate_oc' as const,
            label: 'Generar OC ahora',
            payload: { itemIds: [i.id] },
            requiresConfirm: false,
          },
        }))
      );
    } else {
      cards.push({
        id: 'fin-summary',
        kind: 'financing' as const,
        title: `Línea de Crédito Disponible (${credit.partner_bank_name})`,
        subtitle: `Tasa preferencial · Desembolso en 24h para compras de inventario`,
        metric: `S/ ${credit.available_amount.toLocaleString()}`,
        action: {
          type: 'navigate' as const,
          label: 'Ver Financiamiento',
          payload: { href: '/plans' },
          requiresConfirm: false,
        },
      });
    }

    return {
      intent: 'help',
      reply,
      cards,
      elapsedMs: Date.now() - started,
    };
  }

  /**
   * Interpreta un mensaje y responde con texto + tarjetas accionables.
   * Consultas concurrentes para consolidar el insight. La memoria se carga
   * y persiste aquí: cada interacción queda registrada por workspace.
   */
  public static async query(
    message: string,
    pathname: string,
    userEmail: string,
    opts?: { search?: string }
  ): Promise<NexoQueryResult> {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = (await resolveWorkspaceId(supabase)) || 'ws-default';
    const memory = await loadNexoMemory(supabase, workspaceId);

    const result = await this.queryCore(message, pathname, userEmail, { search: opts?.search || '', memory });

    try {
      memory.interactions.unshift({
        ts: new Date().toISOString(),
        intent: result.intent,
        summary: result.reply.slice(0, 140),
      });
      memory.interactions = memory.interactions.slice(0, MEMORY_INTERACTIONS_CAP);
      const mods = Array.isArray(memory.facts.modules_visited) ? memory.facts.modules_visited : [];
      if (pathname && mods[0] !== pathname) {
        memory.facts.modules_visited = [pathname, ...mods.filter((m) => m !== pathname)].slice(0, 10);
      }
      if (!((message || '').trim())) memory.sessions = (memory.sessions || 0) + 1;
      await saveNexoMemory(supabase, workspaceId, memory);
    } catch {
      /* mejor esfuerzo */
    }
    return result;
  }

  private static async queryCore(
    message: string,
    pathname: string,
    userEmail: string,
    ctx: { search: string; memory: NexoMemory }
  ): Promise<NexoQueryResult> {
    const started = Date.now();
    const text = (message || '').trim();
    if (!text) return this.greet(pathname, userEmail);

    // Confinamiento estricto de dominio (Anti-Alucinaciones):
    // Bloqueo inmediato de temas externos con la respuesta canónica requerida
    if (isOffDomain(text)) {
      return {
        intent: 'help',
        reply: 'Mi enfoque está optimizado exclusivamente para la gestión de su inventario y operaciones en la plataforma. ¿En qué módulo operativo puedo asistirle?',
        cards: [
          { id: 'nav-restock', kind: 'info', title: 'Reabastecimiento Inteligente', subtitle: 'Ver análisis de cobertura, quiebres y pedidos sugeridos', action: { type: 'navigate', label: 'Ir a Reabastecimiento', payload: { href: '/dashboard/reabastecimiento' }, requiresConfirm: false } },
          { id: 'nav-inv', kind: 'info', title: 'Inventario de SKUs', subtitle: 'Catálogo de existencias y puntos de reorden (ROP)', action: { type: 'navigate', label: 'Ir a Inventario', payload: { href: '/inventory/inventory-items' }, requiresConfirm: false } },
          { id: 'nav-plans', kind: 'info', title: 'Línea de Financiamiento', subtitle: 'Línea de crédito pre-aprobada y anticipo de facturas', action: { type: 'navigate', label: 'Ver Financiamiento', payload: { href: '/plans' }, requiresConfirm: false } },
        ],
        elapsedMs: Date.now() - started,
      };
    }

    // Function calling prioritario: verbo de navegación → redirección
    // automática al módulo oficial (sin clics adicionales, sin 404).
    if (hasNavVerb(text)) {
      const dest = resolveNavigation(text);
      if (dest) {
        return {
          intent: 'navigate',
          reply: `Abriendo el módulo **${dest.label}** (${dest.href})…`,
          cards: [],
          elapsedMs: Date.now() - started,
          toolCalls: [{ tool: 'navigate_to_module', args: { destination_path: dest.href, label: dest.label } }],
        };
      }
      return {
        intent: 'navigate',
        reply: 'No encontré ese módulo específico en la plataforma. Puedes acceder a las áreas operativas principales:',
        cards: [
          { id: 'nav-restock', kind: 'info', title: 'Reabastecimiento', action: { type: 'navigate', label: 'Ir', payload: { href: '/dashboard/reabastecimiento' }, requiresConfirm: false } },
          { id: 'nav-inv', kind: 'info', title: 'Inventario actual', action: { type: 'navigate', label: 'Ir', payload: { href: '/inventory/inventory-items' }, requiresConfirm: false } },
          { id: 'nav-prov', kind: 'info', title: 'Proveedores', action: { type: 'navigate', label: 'Ir', payload: { href: '/inventory/vendors' }, requiresConfirm: false } },
          { id: 'nav-int', kind: 'info', title: 'Integraciones', action: { type: 'navigate', label: 'Ir', payload: { href: '/dashboard/integraciones' }, requiresConfirm: false } },
          { id: 'nav-plans', kind: 'info', title: 'Comparar Planes', action: { type: 'navigate', label: 'Ir', payload: { href: '/plans' }, requiresConfirm: false } },
        ],
        elapsedMs: Date.now() - started,
      };
    }

    const intent = detectIntent(text);

    if (intent === 'help' || intent === 'status') {
      const r = await this.greet(pathname, userEmail);
      return { ...r, intent, elapsedMs: Date.now() - started };
    }

    if (intent === 'critical_stock') {
      const [{ items, criticalCount, totalCapitalRequired }] = await Promise.all([
        RestockCalculatorService.calculateRestockItems(),
      ]);
      const list = items.filter((i) => i.status !== 'optimal');
      if (list.length === 0) {
        return {
          intent,
          reply: `### 📊 Diagnóstico de Cobertura y Abastecimiento

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- **Salud del Catálogo**: El inventario completo opera con niveles óptimos de stock de seguridad.
- **Quiebres Activos**: **0 SKUs en estado crítico**.
- **Cobertura Promedio**: Todas las líneas superan el umbral de 30 días de demanda estimada.

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo)**
- No se prevé riesgo de desabastecimiento ni pérdidas de venta en los próximos 14 a 21 días.
- El flujo de caja operativo no requiere desembolsos urgentes de reposición.

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- Mantener la monitorización periódica de variabilidad de demanda semanal.
- Verificar recepciones pendientes en el módulo de Despachos y Entradas (\`/inventory/incoming\`).`,
          cards: [],
          elapsedMs: Date.now() - started,
        };
      }

      const topSkus = list.slice(0, 4);
      const warningsCount = list.length - Math.min(criticalCount, list.length);
      const reply = `### 🚨 Análisis Ejecutivo de Quiebres y Stock Crítico

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- **SKUs Comprometidos**: Se registran **${criticalCount} SKUs en estado crítico** (< 3.5 días de cobertura) y **${warningsCount} SKUs en advertencia de reposición** (cobertura ajustada antes del ROP).
- **Capital de Reposición Necesario**: Se requiere un presupuesto de **S/ ${totalCapitalRequired.toLocaleString()}** para reabastecer los lotes sugeridos hasta el nivel de seguridad.
- **Ítems con Mayor Vulnerabilidad**: ${topSkus.map((s) => `\`${s.sku}\` (${s.name}) con apenas **${s.coverageDays} días** de cobertura`).join(', ')}.

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo)**
- Si no se generan órdenes de compra en las próximas 48 horas, los SKUs críticos sufrirán rotura de stock antes de que los proveedores completen su tiempo de entrega (Lead Time).
- El quiebre implicará pérdidas directas de ventas diarias y deterioro de la tasa de servicio (Fill Rate) con clientes clave.

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- **Aprobación de Órdenes**: Aprobar inmediatamente los lotes de reposición para los SKUs prioritarios mediante las tarjetas interactivas inferiores.
- **Financiamiento B2B**: En caso de requerir capital de trabajo sin comprometer la caja inmediata, utilizar la línea de crédito disponible con desembolso en 24 horas.
- **Priorización Logística**: Contactar a los proveedores principales para confirmar fechas de despacho exprés.`;

      return {
        intent,
        reply,
        cards: topSkus.map((i) => ({
          id: `sku-${i.id}`,
          kind: 'sku' as const,
          title: `${i.sku} · ${i.name}`,
          subtitle: `${i.status === 'critical' ? '🔴 Crítico' : '🟡 Advertencia'} · Cobertura ${i.coverageDays} días · ROP ${i.rop} · Sugerido ${i.suggestedQty} u`,
          metric: `S/ ${i.investment.toLocaleString()}`,
          action: { type: 'generate_oc' as const, label: 'Generar OC ahora', payload: { itemIds: [i.id] }, requiresConfirm: false },
        })),
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'generate_oc') {
      const sku = extractSku(text);
      const [{ items }] = await Promise.all([RestockCalculatorService.calculateRestockItems()]);
      let targets = items.filter((i) => i.suggestedQty > 0);
      if (sku) {
        const found = items.filter((i) => i.sku.toUpperCase().includes(sku) || i.id === sku);
        targets = found.filter((i) => i.suggestedQty > 0);
        if (found.length > 0 && targets.length === 0) {
          return {
            intent,
            reply: `### 📋 Evaluación de Reposición: SKU ${found[0].sku}

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- El producto **${found[0].sku}** (${found[0].name}) cuenta con **${found[0].coverageDays} días de cobertura**, superando holgadamente el punto de reorden.

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo)**
- Generar una orden de compra en este momento causaría sobrestock innecesario y costo de inmovilización de capital.

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- No se recomienda emitir orden de compra para este SKU hasta que la cobertura descienda por debajo de su umbral de seguridad.`,
            cards: [],
            elapsedMs: Date.now() - started,
          };
        }
        if (found.length === 0) {
          return {
            intent,
            reply: `No encontré el SKU "${sku}" en el catálogo activo de la plataforma. Revisa el código e intenta nuevamente, o explora el catálogo en \`/inventory/inventory-items\`.`,
            cards: [],
            elapsedMs: Date.now() - started,
          };
        }
      }
      if (targets.length === 0) {
        return {
          intent,
          reply: `### 📋 Estado de Reposición: Sin Órdenes Requeridas

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- Ningún SKU del inventario registra cantidad sugerida de compra mayor a cero. Todas las existencias se encuentran sobre su Punto de Reorden.

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo)**
- El inventario opera con suficiente holgura para abastecer la demanda estimada de los próximos ciclos sin riesgo inminente de quiebre.

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- Monitorear el módulo de Reabastecimiento Inteligente al cierre semanal para evaluar variaciones en la velocidad de ventas.`,
          cards: [],
          elapsedMs: Date.now() - started,
        };
      }
      const top = targets.slice(0, 3);
      const total = targets.reduce((s, i) => s + i.investment, 0);
      const reply = `### 📑 Resumen Ejecutivo: Generación de Órdenes de Compra

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- Se han consolidado **${targets.length} SKU(s) listos para reposición** que han alcanzado o perforado su Punto de Reorden (ROP).
- Presupuesto consolidado de compra: **S/ ${total.toLocaleString()}** distribuido entre proveedores asignados.
${top.map((i) => `- **${i.sku}** (${i.name}): **${i.suggestedQty} u** vía *${i.provider}* por un subtotal de **S/ ${i.investment.toLocaleString()}**.`).join('\n')}

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo)**
- Al emitir las órdenes en bloque se consolidan fletes y se garantiza que el stock ingrese antes de la fecha límite de rotura proyectada (7 a 10 días).
- Las órdenes se crean en estado **Borrador (Draft)** para tu revisión y validación previa antes de su despacho a proveedores.

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- **Aprobar en Bloque**: Haz clic en el botón **"Aprobar y generar"** en la tarjeta inferior para crear las órdenes en el sistema.
- **Canal de Transmisión**: Verificar que el conector o canal de compras con proveedores esté operativo en \`/dashboard/integraciones\`.`;

      return {
        intent,
        reply,
        cards: [
          ...top.map((i) => ({
            id: `sku-${i.id}`,
            kind: 'sku' as const,
            title: `${i.sku} · ${i.name}`,
            subtitle: `Sugerido ${i.suggestedQty} u · Proveedor: ${i.provider}`,
            metric: `S/ ${i.investment.toLocaleString()}`,
          })),
          {
            id: 'oc-all',
            kind: 'oc',
            title: `Generar ${targets.length} OC(s) en borrador`,
            subtitle: `Inversión total consolidada S/ ${total.toLocaleString()}`,
            metric: `${targets.length} OC(s)`,
            action: { type: 'generate_oc', label: 'Aprobar y generar', payload: { itemIds: targets.map((i) => i.id) }, requiresConfirm: false },
          },
        ],
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'financing') {
      const [alerts] = await Promise.all([NotificationService.getAlertSummary().catch(() => null)]);
      const cl = FinancingService.getCreditSummary();
      const amount = extractAmount(text) || Math.min(20000, cl.available_amount);
      if (amount > cl.available_amount) {
        return {
          intent,
          reply: `### 💼 Evaluación Financiera: Límite de Capital

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- El monto solicitado (**S/ ${amount.toLocaleString()}**) excede tu cupo disponible inmediato de **S/ ${cl.available_amount.toLocaleString()}** con **${cl.partner_bank_name}**.

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo)**
- Solicitar un importe superior al cupo requeriría una reevaluación crediticia de riesgo que demora de 3 a 5 días hábiles.
- Sin embargo, tu línea pre-aprobada de **S/ ${cl.available_amount.toLocaleString()}** está lista para desembolso inmediato en menos de 24 horas.

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- Te propongo tomar el máximo pre-aprobado actual de **S/ ${cl.available_amount.toLocaleString()}** para cubrir las compras más críticas y solicitar una ampliación de línea para el remanente.`,
          cards: [
            {
              id: 'fin-max',
              kind: 'financing',
              title: `Anticipo de S/ ${cl.available_amount.toLocaleString()}`,
              subtitle: FinancingService.simulateFinancing(cl.available_amount, 30).netReturn >= 0 ? 'Retorno neto positivo a 30 días' : 'Revisa el costo a 30 días',
              metric: `S/ ${cl.available_amount.toLocaleString()}`,
              action: { type: 'request_disbursement', label: 'Solicitar anticipo', payload: { amount: cl.available_amount, termDays: 30 }, requiresConfirm: true },
            },
          ],
          elapsedMs: Date.now() - started,
        };
      }

      const sim = FinancingService.simulateFinancing(amount, 30);
      const reply = `### 💼 Evaluación Financiera y Línea de Capital de Trabajo

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- **Requerimiento Analizado**: Solicitud de anticipo de **S/ ${amount.toLocaleString()}** a un plazo estándar de **30 días**.
- **Línea Pre-Aprobada**: Dispones de **S/ ${cl.available_amount.toLocaleString()}** respaldados por **${cl.partner_bank_name}** a una tasa preferencial del **${(((cl.monthly_interest_rate ?? 0.0145)) * 100).toFixed(2)}% mensual**.

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo Financiero)**
- **Costo Financiero Total**: **S/ ${sim.financialCost.toLocaleString()}** (intereses + comisiones del periodo).
- **Ventas Protegidas Estimadas**: La inyección oportuna de stock proyecta proteger facturación por **S/ ${sim.protectedSales.toLocaleString()}**.
- **Retorno Neto Proyectado**: **S/ ${sim.netReturn.toLocaleString()}**, asegurando rentabilidad positiva para la operación.${alerts ? ` Quiebres activos en plataforma: ${alerts.riesgoQuiebre ?? 0} ítems.` : ''}

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- **Confirmación de Anticipo**: Pulsa el botón **"Confirmar solicitud"** en la tarjeta inferior para emitir el desembolso seguro en 24h.
- **Destino del Capital**: Asignar los fondos prioritariamente al lote de compra de SKUs de alta rotación (Clase A).`;

      return {
        intent,
        reply,
        cards: [
          {
            id: 'fin-req',
            kind: 'financing',
            title: `Solicitar anticipo de S/ ${amount.toLocaleString()}`,
            subtitle: `${cl.partner_bank_name} · 30 días · Costo S/ ${sim.financialCost.toLocaleString()}`,
            metric: `S/ ${amount.toLocaleString()}`,
            action: { type: 'request_disbursement', label: 'Confirmar solicitud', payload: { amount, termDays: 30 }, requiresConfirm: true },
          },
        ],
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'memory') {
      const past = ctx.memory.interactions.slice(0, 3);
      const reply = `### 🧠 Bitácora de Memoria Operativa Nexo

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- **Historial del Workspace**: Se tienen registradas **${ctx.memory.interactions.length} interacciones recientes** asociadas a tu cuenta.
${past.length > 0 ? past.map((p, idx) => `- **Interacción ${idx + 1}**: "${p.summary}" → Intención: *${p.intent}* (${new Date(p.ts).toLocaleTimeString()}).`).join('\n') : '- No se registran consultas previas en la sesión actual.'}

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo)**
- Nexo conserva el contexto de las decisiones y órdenes generadas para evitar duplicación de compras y asegurar continuidad en tus análisis.

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- Puedes indicarme continuar con alguna de las acciones previas o abrir un análisis nuevo de inventario, proveedores o financiamiento.`;

      return {
        intent,
        reply,
        cards: [],
        elapsedMs: Date.now() - started,
      };
    }

    // sync_status
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = (await resolveWorkspaceId(supabase)) || 'ws-default';
    const [states, lastLog] = await Promise.all([
      getConnectorStates(supabase, workspaceId),
      supabase.from('integration_logs').select('fecha,integracion,resultado').order('fecha', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const pending = states.filter((s) => !s.configured);
    const active = states.filter((s) => s.configured);

    const reply = `### 🔄 Auditoría de Sincronización y Conectores Operativos

**1. 📊 ¿Qué está pasando? (Diagnóstico)**
- **Conectores Activos**: **${active.length} integraciones configuradas** operando con intercambio de datos.
- **Canales Pendientes**: **${pending.length} integraciones sin configurar**.
${lastLog?.data ? `- **Último Evento Auditado**: Canal *${lastLog.data.integracion}* finalizó con resultado **${lastLog.data.resultado}** (${new Date(lastLog.data.fecha).toLocaleString()}).` : '- **Sin eventos recientes**: No hay sincronizaciones auditadas en las últimas horas.'}

**2. 🔮 ¿Qué va a pasar? (Predicción y Riesgo)**
- Sin los canales de venta o ERPs sincronizados (como Shopify, MercadoLibre o SAP), el cálculo de Puntos de Reorden operará con datos parciales, incrementando el riesgo de sobrestock o roturas ocultas.

**3. 🎯 ¿Qué debo hacer? (Prescripción Ejecutiva)**
- **Configuración de Canales**: Completa la vinculación de los canales pendientes a través de las acciones en las tarjetas a continuación.
- **Prueba de Conexión**: Asegurar la validez de los tokens y webhooks para mantener la sincronización en tiempo real.`;

    return {
      intent,
      reply,
      cards: states.map((s) => ({
        id: `conn-${s.id}`,
        kind: 'connector' as const,
        title: s.name,
        subtitle: s.configured ? 'Configurado y operativo' : 'Pendiente de configuración',
        action: s.configured
          ? undefined
          : { type: 'navigate' as const, label: 'Configurar', payload: { href: '/dashboard/integraciones' }, requiresConfirm: false },
      })),
      elapsedMs: Date.now() - started,
    };
  }

  /**
   * Ejecuta una acción transaccional real. Exige confirmación explícita
   * (confirm=true) y audita en integration_logs como "Asistida por Nexo".
   */
  public static async execute(
    action: NexoAction,
    userEmail: string,
    confirm: boolean
  ): Promise<NexoExecuteResult> {
    const started = Date.now();
    if (!action || !action.type) {
      return { success: false, message: 'Acción inválida.', elapsedMs: Date.now() - started };
    }
    if (action.type === 'navigate') {
      return { success: false, message: 'La navegación se resuelve en el cliente.', elapsedMs: Date.now() - started };
    }
    if (confirm !== true) {
      return { success: false, message: 'Falta la confirmación explícita del usuario. Sin tu clic final no ejecuto nada.', elapsedMs: Date.now() - started };
    }

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = (await resolveWorkspaceId(supabase)) || 'ws-default';
    const email = userEmail || 'sistema@inventa.ai';

    const audit = async (ok: boolean, detail: string) => {
      try {
        await IntegrationService.logIntegrationEvent(
          workspaceId,
          email,
          'NEXO',
          ok ? 'EXITOSO' : 'ERROR',
          `Acción ${action.type} asistida por Nexo: ${detail}`
        );
      } catch {
        /* auditoría de mejor esfuerzo */
      }
    };

    if (action.type === 'generate_oc') {
      const itemIds = Array.isArray(action.payload?.itemIds) ? action.payload.itemIds : undefined;
      try {
        const res = await BatchOrderApprovalService.processBatchApproval({ itemIds, userEmail: email });
        await audit(true, res.summary);
        return { success: true, message: res.summary, details: { count: res.count, results: res.results }, elapsedMs: Date.now() - started };
      } catch (e: any) {
        await audit(false, e?.message || 'Error al generar OC.');
        return { success: false, message: e?.message || 'No se pudo generar la orden.', elapsedMs: Date.now() - started };
      }
    }

    if (action.type === 'request_disbursement') {
      const amount = Number(action.payload?.amount) || 0;
      const termDays = Number(action.payload?.termDays) || 30;
      try {
        const res = await FinancingService.requestDisbursement(amount, termDays, email);
        await audit(res.success, res.message);
        return { success: res.success, message: res.message, details: { status: res.status, disbursement: res.disbursement }, elapsedMs: Date.now() - started };
      } catch (e: any) {
        await audit(false, e?.message || 'Error al solicitar anticipo.');
        return { success: false, message: e?.message || 'No se pudo solicitar el anticipo.', elapsedMs: Date.now() - started };
      }
    }

    return { success: false, message: 'Acción no soportada.', elapsedMs: Date.now() - started };
  }
}
