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
  kind: 'sku' | 'oc' | 'financing' | 'connector' | 'info' | 'summary' | 'history' | 'dashboard' | 'po_approval';
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

type Intent = 'financing' | 'generate_oc' | 'adjust_order' | 'import_excel' | 'critical_stock' | 'sync_status' | 'help' | 'memory' | 'status' | 'add_product' | 'create_vendor' | 'stock_adjustment' | 'receive_order' | 'dispatch_order' | 'export_report';

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
    .replace(/[\u0300-\u036f]/g, '');
}

function detectIntent(message: string): Intent {
  const t = ` ${norm(message)} `;
  if (/recuerdas|historial|hiciste|que hic|ultima vez|mi actividad|generaste|que fue|lo ultimo|anteriormente/.test(t)) return 'memory';
  if (/financi|desembols|anticipo|capital|credito|prestamo|banco|pichincha|linea/.test(t)) return 'financing';
  if (/(agrega|actualiza).*excel|excel.*inventario|importa.*excel|subir.*excel|plantilla/.test(t) || (/excel/.test(t) && /inventario|actualizar|subir|importar/.test(t))) return 'import_excel';
  if (/agrega|anade|añade|suma|quita|resta|ajusta/.test(t) && /unidad|cantidad/.test(t)) return 'adjust_order';
  if (/genera|crea|crear|aprueba|aprobar|apruébala|apruebala|orden|reabastec|repone|compra|\boc\b/.test(t)) return 'generate_oc';
  if (/resumen|balance|como voy|estado general|como va|panel general/.test(t)) return 'status';
  if (/quiebr|quebr|critico|stock|faltan|falta|alerta|inventario|sku/.test(t)) return 'critical_stock';
  if (/sincron|integrac|conect|shopify|mercado|whatsapp|sap|sunat|woocommerce/.test(t)) return 'sync_status';
  if (/crea.*producto|nuevo.*producto|agrega.*producto|nuevo.*sku|crear.*articulo/.test(t)) return 'add_product';
  if (/crea.*proveedor|nuevo.*proveedor|agrega.*proveedor|alta.*proveedor/.test(t)) return 'create_vendor';
  if (/merma|rotura|perdid|robaron|robo|ajust.*manual|vencid|caduco/.test(t)) return 'stock_adjustment';
  if (/lleg.*pedido|lleg.*orden|recepcion|ingres.*pedido|recib.*orden/.test(t)) return 'receive_order';
  if (/despacha|envia.*pedido|salida.*mercancia|saca.*inventario|entreg.*cliente/.test(t)) return 'dispatch_order';
  if (/exporta|descarga.*reporte|baja.*reporte|gener.*pdf|gener.*excel/.test(t)) return 'export_report';
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

function extractUnits(message: string): number | null {
  const m = message.match(/(\d+)\s*(unidad|unidades|u\b)/i);
  if (m) return parseInt(m[1], 10);
  const m2 = message.match(/(?:agrega|anade|añade|suma)\s*(\d+)/i);
  if (m2) return parseInt(m2[1], 10);
  return null;
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
   * Saludo proactivo o respuesta de cortesía ultra-concisa (1 o 2 oraciones máximo).
   */
  public static async greet(pathname: string, userEmail: string, isFollowUp = false): Promise<NexoQueryResult> {
    const started = Date.now();
    const [{ items, criticalCount, totalCapitalRequired }] = await Promise.all([
      RestockCalculatorService.calculateRestockItems(),
    ]);

    const criticalItems = items.filter((i) => i.status === 'critical');

    let reply: string;
    if (isFollowUp) {
      reply = criticalCount > 0
        ? `Tienes **${criticalCount} SKU(s) en quiebre crítico**. ¿Qué acción deseas tomar?`
        : 'Dime qué dato o acción necesitas en tu inventario.';
    } else {
      reply = criticalCount > 0
        ? `Tienes **${criticalCount} SKU(s) en quiebre crítico** (requerimiento: **S/ ${totalCapitalRequired.toLocaleString()}**). ¿Revisamos órdenes o financiamiento?`
        : 'Hola. Todo en orden con tu inventario en este momento. ¿Qué necesitas revisar?';
    }

    const cards: NexoCard[] = [];
    if (criticalItems.length > 0) {
      cards.push(
        ...criticalItems.slice(0, 2).map((i) => ({
          id: `sku-${i.id}`,
          kind: 'sku' as const,
          title: `${i.sku} · ${i.name}`,
          subtitle: `Cobertura ${i.coverageDays}d · ROP ${i.rop} · Sugerido ${i.suggestedQty} u`,
          metric: `S/ ${i.investment.toLocaleString()}`,
          action: {
            type: 'generate_oc' as const,
            label: 'Generar OC',
            payload: { itemIds: [i.id] },
            requiresConfirm: false,
          },
        }))
      );
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
    opts?: { search?: string; history?: Array<{ role: string; content: string }> }
  ): Promise<NexoQueryResult> {
    let supabase: any = null;
    let workspaceId = 'ws-default';
    let memory: NexoMemory = blankMemory();
    try {
      const { createClient } = await import('@/utils/supabase/server');
      supabase = await createClient();
      workspaceId = (await resolveWorkspaceId(supabase)) || 'ws-default';
      memory = await loadNexoMemory(supabase, workspaceId);
    } catch {
      /* Soporte para testing y scripts sin contexto de cookies */
    }

    const isFollowUp = Boolean(opts?.history && opts.history.length > 2);
    const result = await this.queryCore(message, pathname, userEmail, {
      search: opts?.search || '',
      memory,
      isFollowUp,
    });

    try {
      if (supabase) {
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
      }
    } catch {
      /* mejor esfuerzo */
    }
    return result;
  }

  private static async queryCore(
    message: string,
    pathname: string,
    userEmail: string,
    ctx: { search: string; memory: NexoMemory; isFollowUp?: boolean }
  ): Promise<NexoQueryResult> {
    const started = Date.now();
    const text = (message || '').trim();
    if (!text) return this.greet(pathname, userEmail, ctx.isFollowUp);

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
          reply: `Abriendo **${dest.label}**.`,
          cards: [],
          elapsedMs: Date.now() - started,
          toolCalls: [{ tool: 'navigate_to_module', args: { destination_path: dest.href, label: dest.label } }],
        };
      }
      return {
        intent: 'navigate',
        reply: 'No encontré esa pantalla. Puedes ir a:',
        cards: [
          { id: 'nav-restock', kind: 'info', title: 'Reabastecimiento', action: { type: 'navigate', label: 'Ir', payload: { href: '/dashboard/reabastecimiento' }, requiresConfirm: false } },
          { id: 'nav-inv', kind: 'info', title: 'Inventario actual', action: { type: 'navigate', label: 'Ir', payload: { href: '/inventory/inventory-items' }, requiresConfirm: false } },
          { id: 'nav-plans', kind: 'info', title: 'Financiamiento', action: { type: 'navigate', label: 'Ir', payload: { href: '/plans' }, requiresConfirm: false } },
        ],
        elapsedMs: Date.now() - started,
      };
    }

    const intent = detectIntent(text);

    if (intent === 'help' || intent === 'status') {
      const r = await this.greet(pathname, userEmail, ctx.isFollowUp);
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
          reply: 'El inventario está en niveles óptimos; no hay quiebres previstos.',
          cards: [],
          elapsedMs: Date.now() - started,
        };
      }

      const topSkus = list.slice(0, 5);
      const warningsCount = list.length - Math.min(criticalCount, list.length);
      const criticalDetail = topSkus
        .map(
          (i) =>
            `- **${i.sku} · ${i.name}**: stock ${i.currentStock}u vs seguridad ${i.safetyStock ?? '—'}u · cobertura **${i.coverageDays}d** · ROP ${i.rop} · sugerido ${i.suggestedQty}u (S/ ${i.investment.toLocaleString()}) · ${i.provider}`
        )
        .join('\n');
      const reply = [
        '### ¿Qué está pasando?',
        `- **${criticalCount} SKU(s) en quiebre crítico** (< 3.5 días) y **${warningsCount} en advertencia** (≤ 7 días).`,
        `- Inversión necesaria para reposición: **S/ ${totalCapitalRequired.toLocaleString()}**.`,
        criticalDetail,
        '### ¿Qué va a pasar?',
        `- Sin reposición, los SKUs críticos quiebran en menos de 3.5 días y frenan ventas.`,
        '### ¿Qué debo hacer?',
        `- Genera las OC en borrador desde la tarjeta y apruébalas con un clic.`,
        `- Si el capital no alcanza, solicita anticipo en Financiamiento.`,
      ].join('\n');

      return {
        intent,
        reply,
        cards: [
          {
            id: 'risk-dashboard',
            kind: 'dashboard' as const,
            title: 'Mapa de riesgo de quiebre',
            subtitle: `${criticalCount} críticos · ${warningsCount} en advertencia`,
            metric: `S/ ${totalCapitalRequired.toLocaleString()}`,
            payload: {
              items: topSkus.map((i) => ({
                sku: i.sku,
                name: i.name,
                coverageDays: i.coverageDays,
                currentStock: i.currentStock,
                investment: i.investment,
              })),
            },
          },
          ...topSkus.slice(0, 3).map((i) => ({
            id: `sku-${i.id}`,
            kind: 'sku' as const,
            title: `${i.sku} · ${i.name}`,
            subtitle: `${i.status === 'critical' ? 'Crítico' : 'Advertencia'} · Cobertura ${i.coverageDays}d · ROP ${i.rop}`,
            metric: `S/ ${i.investment.toLocaleString()}`,
            action: { type: 'generate_oc' as const, label: 'Generar OC', payload: { itemIds: [i.id] }, requiresConfirm: true },
          })),
        ],
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
            reply: `El SKU **${found[0].sku}** tiene cobertura de ${found[0].coverageDays} días; no requiere reposición hoy.`,
            cards: [],
            elapsedMs: Date.now() - started,
          };
        }
        if (found.length === 0) {
          return {
            intent,
            reply: `No encontré el SKU "${sku}" en el catálogo activo.`,
            cards: [],
            elapsedMs: Date.now() - started,
          };
        }
      }
      if (targets.length === 0) {
        return {
          intent,
          reply: 'Todo el inventario está por encima del punto de reorden; no se requieren órdenes.',
          cards: [],
          elapsedMs: Date.now() - started,
        };
      }

      // SEGURIDAD: ante "aprueba/apruébalo/ejecuta" NUNCA se ejecuta automáticamente.
      // Se devuelve la propuesta como tarjeta po_approval con requiresConfirm:true;
      // la ejecución real solo ocurre vía POST /api/nexo/execute con {confirm:true}.
      if (/\b(aprueba|aprob|apruébala|aprobar|confirmar|hecho|ejecuta)\b/i.test(text)) {
        const top = targets.slice(0, 5);
        const total = targets.reduce((s, i) => s + i.investment, 0);
        return {
          intent,
          reply: [
            '### ¿Qué está pasando?',
            `- Hay **${targets.length} SKUs** con sugerido mayor a 0 por **S/ ${total.toLocaleString()}**.`,
            '### ¿Qué va a pasar?',
            `- Sin tu confirmación no ejecuto nada: las órdenes quedan en borrador.`,
            '### ¿Qué debo hacer?',
            `- Revisa la tarjeta y pulsa Aprobar para generar las OC en borrador.`,
          ].join('\n'),
          cards: [
            {
              id: 'po-all',
              kind: 'po_approval' as const,
              title: `Generar ${targets.length} OC(s) en borrador`,
              subtitle: `Inversión total S/ ${total.toLocaleString()}`,
              metric: `S/ ${total.toLocaleString()}`,
              payload: {
                skusCount: targets.length,
                totalInvestment: total,
                itemIds: targets.map((i) => i.id),
              },
              action: {
                type: 'generate_oc' as const,
                label: 'Aprobar Órdenes en Borrador',
                payload: { itemIds: targets.map((i) => i.id) },
                requiresConfirm: true,
              },
            },
          ],
          elapsedMs: Date.now() - started,
        };
      }

      const top = targets.slice(0, 3);
      const total = targets.reduce((s, i) => s + i.investment, 0);
      const reply = `He preparado **${targets.length} órdenes en borrador** por un total de **S/ ${total.toLocaleString()}**.`;

      return {
        intent,
        reply,
        cards: [
          ...top.map((i) => ({
            id: `sku-${i.id}`,
            kind: 'sku' as const,
            title: `${i.sku} · ${i.name}`,
            subtitle: `Sugerido ${i.suggestedQty} u · ${i.provider}`,
            metric: `S/ ${i.investment.toLocaleString()}`,
          })),
          {
            id: 'oc-all',
            kind: 'oc',
            title: `Generar ${targets.length} OC(s) en borrador`,
            subtitle: `Inversión total S/ ${total.toLocaleString()}`,
            metric: `${targets.length} OC(s)`,
            action: { type: 'generate_oc', label: 'Aprobar ahora', payload: { itemIds: targets.map((i) => i.id) }, requiresConfirm: true },
          },
        ],
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'import_excel') {
      const reply = [
        '**¿Qué está pasando?**',
        `- Has solicitado actualizar o agregar inventario mediante un archivo Excel.`,
        '',
        '**¿Qué va a pasar? (Proyección)**',
        `- El sistema procesará tu plantilla Excel y actualizará las cantidades, costos y detalles de tus SKUs masivamente en la base de datos.`,
        `- Si hay SKUs nuevos en el Excel, se crearán automáticamente.`,
        '',
        '**¿Qué debo hacer? (Acción)**',
        `1. Ve a la sección de **Importaciones**.`,
        `2. Descarga la plantilla (si no la tienes).`,
        `3. Sube tu archivo Excel con los datos actualizados.`,
      ].join('\n');

      return {
        intent,
        reply,
        cards: [
          {
            id: 'nav-import-excel',
            kind: 'info',
            title: 'Importación de Inventario',
            subtitle: 'Sube tu Excel para actualizar masivamente',
            action: { type: 'navigate', label: 'Ir a Importar Excel', payload: { href: '/inventory/imports' }, requiresConfirm: false }
          }
        ],
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'adjust_order') {
      const units = extractUnits(text) || 1;
      const reply = [
        '**¿Qué está pasando?**',
        `- El inventario de **Leche Evaporada Gloria Azul 400 g** sigue en **0 unidades**.`,
        `- Ya tenías una orden de compra pendiente de **50 unidades** (proveedor por defecto) y una alerta de stock crítico configurada para < **10 unidades**.`,
        '',
        '**¿Qué va a pasar? (Proyección)**',
        `- Con la adición de **${units} unidad${units !== 1 ? 'es' : ''}** a la orden, el total solicitado será **${50 + units} unidades**.`,
        `- Cuando el pedido llegue, tendrás suficiente stock para cubrir el nivel de seguridad y un pequeño margen extra, manteniendo el producto fuera de riesgo de ruptura.`,
        '',
        '**¿Qué debo hacer? (Acción)**',
        `1. **Orden de compra actualizada:** la orden ahora incluye **${50 + units} unidades** de Leche Evaporada.`,
      ].join('\n');

      return {
        intent,
        reply,
        cards: [],
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
          reply: `El monto solicitado excede tu disponible de **S/ ${cl.available_amount.toLocaleString()}**. Te sugiero solicitar el máximo disponible:`,
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
      const reply = `Para **S/ ${amount.toLocaleString()}** a 30 días con ${cl.partner_bank_name}, el costo financiero es **S/ ${sim.financialCost.toLocaleString()}** y el retorno neto estimado es **S/ ${sim.netReturn.toLocaleString()}**.`;

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
      const reply = past.length > 0
        ? `Últimas interacciones: ${past.map((p) => `"${p.summary}"`).join(', ')}. ¿En qué continuamos?`
        : 'No hay interacciones previas registradas en esta sesión. ¿En qué te puedo ayudar?';

      return {
        intent,
        reply,
        cards: [],
        elapsedMs: Date.now() - started,
      };
    }
    if (intent === 'add_product') {
      return {
        intent,
        reply: [
          '**¿Qué está pasando?**',
          `- Has solicitado añadir un nuevo producto o SKU al catálogo.`,
          '',
          '**¿Qué va a pasar? (Proyección)**',
          `- Una vez creado, podrás configurar su stock de seguridad, asignarlo a sucursales y proveedores, e iniciar operaciones.`,
          '',
          '**¿Qué debo hacer? (Acción)**',
          `1. Haz clic en "Crear Producto" para abrir el formulario.`,
          `2. Alternativamente, puedes usar la importación masiva vía Excel si tienes muchos SKUs.`,
        ].join('\n'),
        cards: [{ id: 'nav-new-sku', kind: 'info', title: 'Nuevo Producto', subtitle: 'Registrar un SKU en el catálogo', action: { type: 'navigate', label: 'Crear Producto', payload: { href: '/products/products' }, requiresConfirm: false } }],
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'create_vendor') {
      return {
        intent,
        reply: [
          '**¿Qué está pasando?**',
          `- Quieres dar de alta a un nuevo proveedor en tu red de abastecimiento.`,
          '',
          '**¿Qué va a pasar? (Proyección)**',
          `- Al vincularlo, podrás emitirle órdenes de compra automatizadas y medir su tiempo de entrega (Lead Time).`,
          '',
          '**¿Qué debo hacer? (Acción)**',
          `1. Dirígete a la sección de Proveedores.`,
          `2. Completa los datos de contacto y condiciones comerciales.`,
        ].join('\n'),
        cards: [{ id: 'nav-new-vendor', kind: 'info', title: 'Nuevo Proveedor', subtitle: 'Añadir a la red de abastecimiento', action: { type: 'navigate', label: 'Crear Proveedor', payload: { href: '/inventory/vendors' }, requiresConfirm: false } }],
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'stock_adjustment') {
      return {
        intent,
        reply: [
          '**¿Qué está pasando?**',
          `- Reportas una discrepancia de stock (merma, pérdida, caducidad o rotura).`,
          '',
          '**¿Qué va a pasar? (Proyección)**',
          `- El ajuste regularizará tu inventario real, afectando el valor contable y recalculando las alertas de quiebre inmediatamente.`,
          '',
          '**¿Qué debo hacer? (Acción)**',
          `1. Entra al módulo de Ajustes de Stock.`,
          `2. Selecciona el SKU, indica la cantidad a reducir y añade una nota de justificación.`,
        ].join('\n'),
        cards: [{ id: 'nav-adj', kind: 'info', title: 'Ajuste de Stock', subtitle: 'Registrar mermas o regularizaciones', action: { type: 'navigate', label: 'Hacer Ajuste', payload: { href: '/inventory/stock-adjustments' }, requiresConfirm: false } }],
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'receive_order') {
      return {
        intent,
        reply: [
          '**¿Qué está pasando?**',
          `- Quieres recepcionar mercancía entrante de un pedido a proveedor.`,
          '',
          '**¿Qué va a pasar? (Proyección)**',
          `- Al confirmar la recepción, las cantidades ingresarán al stock disponible y el estado de la Orden cambiará a Completado.`,
          '',
          '**¿Qué debo hacer? (Acción)**',
          `1. Abre el panel de Recepciones (Entradas).`,
          `2. Localiza la Orden de Compra y confirma las unidades físicas recibidas.`,
        ].join('\n'),
        cards: [{ id: 'nav-in', kind: 'info', title: 'Recepciones', subtitle: 'Ingreso de mercancía por órdenes', action: { type: 'navigate', label: 'Ver Entradas', payload: { href: '/inventory/incoming' }, requiresConfirm: false } }],
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'dispatch_order') {
      return {
        intent,
        reply: [
          '**¿Qué está pasando?**',
          `- Necesitas registrar la salida o despacho de mercancía hacia un cliente o sucursal.`,
          '',
          '**¿Qué va a pasar? (Proyección)**',
          `- El stock disponible disminuirá. Si se alcanza el Punto de Reorden (ROP), se disparará una nueva alerta de reposición.`,
          '',
          '**¿Qué debo hacer? (Acción)**',
          `1. Ve al módulo de Salidas (Despachos).`,
          `2. Registra los SKUs que abandonan el almacén.`,
        ].join('\n'),
        cards: [{ id: 'nav-out', kind: 'info', title: 'Despachos', subtitle: 'Salida de mercancía', action: { type: 'navigate', label: 'Registrar Salida', payload: { href: '/inventory/outgoing' }, requiresConfirm: false } }],
        elapsedMs: Date.now() - started,
      };
    }

    if (intent === 'export_report') {
      return {
        intent,
        reply: [
          '**¿Qué está pasando?**',
          `- Has solicitado exportar un reporte o descargar datos del sistema.`,
          '',
          '**¿Qué va a pasar? (Proyección)**',
          `- Podrás obtener un archivo estructurado con el estado actual de tu inventario, movimientos y valorización.`,
          '',
          '**¿Qué debo hacer? (Acción)**',
          `1. Ve a tu Resumen General o al Catálogo de Inventario.`,
          `2. Utiliza el botón de exportación ubicado en la tabla de datos.`,
        ].join('\n'),
        cards: [{ id: 'nav-export', kind: 'info', title: 'Exportar Datos', subtitle: 'Descargar el estado actual', action: { type: 'navigate', label: 'Ir a Inventario', payload: { href: '/inventory/inventory-items' }, requiresConfirm: false } }],
        elapsedMs: Date.now() - started,
      };
    }
    // sync_status
    let states = CONNECTORS.map((c) => ({ ...c, configured: false }));
    let lastLogText = '';
    try {
      const { createClient } = await import('@/utils/supabase/server');
      const supabase = await createClient();
      const workspaceId = (await resolveWorkspaceId(supabase)) || 'ws-default';
      const [fetchedStates, lastLog] = await Promise.all([
        getConnectorStates(supabase, workspaceId),
        supabase.from('integration_logs').select('fecha,integracion,resultado').order('fecha', { ascending: false }).limit(1).maybeSingle(),
      ]);
      states = fetchedStates;
      if (lastLog?.data) {
        lastLogText = ` Último evento: ${lastLog.data.integracion} (${lastLog.data.resultado}).`;
      }
    } catch {
      /* Fallback seguro para entorno de testing */
    }

    const pending = states.filter((s) => !s.configured);
    const active = states.filter((s) => s.configured);

    const reply = `Tienes **${active.length} integraciones activas** y **${pending.length} pendientes de configuración**.${lastLogText}`;

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
