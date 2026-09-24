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

// Límite de dominio: cadena de suministro y finanzas. Solo se activa ante
// temas claramente ajenos y sin ninguna señal del dominio.
const OFF_DOMAIN = [
  'futbol', 'receta', 'cocina', 'clima', 'pelicula', 'serie', 'musica', 'cancion',
  'chiste', 'politica', 'religion', 'amor', 'viaje', 'turismo', 'deporte',
  'videojuego', 'poema', 'cumpleanos', ' horoscopo', 'signo zodiacal', 'partido',
];
const DOMAIN_HINTS = [
  'financi', 'desembols', 'anticipo', 'capital', 'credito', 'prestamo', 'banco',
  'stock', 'orden', 'compra', 'sku', 'proveedor', 'cliente', 'inventario',
  'quiebr', 'quebr', 'inventa', 'nexo', 'hola', 'buenas', 'gracias', 'si', 'vale',
  'resumen', 'balance', 'sincron', 'integrac', 'conect', 'recuerdas', 'historial',
  'genera', 'crea', 'aprueba', 'reabastec', 'repone', 'alerta', 'categoria',
  'ubicacion', 'sucursal', 'producto', 'plan', 'complemento', 'ayuda', 'soporte',
];

function isOffDomain(message: string): boolean {
  const t = ` ${norm(message)} `;
  const off = OFF_DOMAIN.some((k) => new RegExp(`\\b${escapeRegExp(k)}`).test(t));
  if (!off) return false;
  return !DOMAIN_HINTS.some((k) => t.includes(k)) && !hasNavVerb(message);
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
    const p = pathname || '';
    if (p.includes('/inventory') || p.includes('/stock')) {
      const { items, criticalCount } = await RestockCalculatorService.calculateRestockItems();
      const critical = items.filter((i) => i.status === 'critical').slice(0, 3);
      return {
        intent: 'critical_stock',
        reply:
          critical.length > 0
            ? `Veo ${criticalCount} SKU(s) en quiebre inminente en esta vista. Te traje los más urgentes con su cobertura real:`
            : 'El inventario está sin quiebres críticos ahora mismo. Puedo mostrarte advertencias o generar órdenes.',
        cards: critical.map((i) => ({
          id: `sku-${i.id}`,
          kind: 'sku' as const,
          title: `${i.sku} · ${i.name}`,
          subtitle: `Cobertura ${i.coverageDays} días · ROP ${i.rop} · Sugerido ${i.suggestedQty}`,
          metric: `S/ ${i.investment.toLocaleString()}`,
          action: {
            type: 'generate_oc' as const,
            label: 'Generar OC ahora',
            payload: { itemIds: [i.id] },
            requiresConfirm: false,
          },
        })),
        elapsedMs: Date.now() - started,
      };
    }
    if (p.includes('/plans') || p.includes('/addon') || p.includes('/financ')) {
      const cl = FinancingService.getCreditSummary();
      const sim = FinancingService.simulateFinancing(Math.min(20000, cl.available_amount), 30);
      return {
        intent: 'financing',
        reply: `Disponible inmediato: S/ ${cl.available_amount.toLocaleString()} con ${cl.partner_bank_name}. Una disposición de S/ ${sim.amount.toLocaleString()} a 30 días protege ~S/ ${sim.protectedSales.toLocaleString()} en ventas con costo de S/ ${sim.financialCost.toLocaleString()}.`,
        cards: [
          {
            id: 'fin-ctx',
            kind: 'financing',
            title: `Anticipo de S/ ${sim.amount.toLocaleString()} (30 días)`,
            subtitle: `Costo S/ ${sim.financialCost.toLocaleString()} · Retorno neto S/ ${sim.netReturn.toLocaleString()}`,
            metric: `S/ ${sim.amount.toLocaleString()}`,
            action: {
              type: 'request_disbursement',
              label: 'Solicitar anticipo',
              payload: { amount: sim.amount, termDays: 30 },
              requiresConfirm: true,
            },
          },
        ],
        elapsedMs: Date.now() - started,
      };
    }
    if (p.includes('/integracion') || p.includes('/integration')) {
      const { createClient } = await import('@/utils/supabase/server');
      const supabase = await createClient();
      const workspaceId = (await resolveWorkspaceId(supabase)) || 'ws-default';
      const states = await getConnectorStates(supabase, workspaceId);
      const pending = states.filter((s) => !s.configured);
      return {
        intent: 'sync_status',
        reply:
          pending.length > 0
            ? `${pending.length} conector(es) pendientes de configuración: ${pending.map((s) => s.name).join(', ')}.`
            : 'Todos los conectores con credenciales están configurados.',
        cards: pending.map((s) => ({
          id: `conn-${s.id}`,
          kind: 'connector' as const,
          title: s.name,
          subtitle: 'Pendiente de configuración',
          action: { type: 'navigate' as const, label: 'Configurar', payload: { href: '/dashboard/integraciones' }, requiresConfirm: false },
        })),
        elapsedMs: Date.now() - started,
      };
    }
    if (p.includes('/incoming') || p.includes('/outgoing') || p.includes('/reabastecimiento') || p.includes('/restock')) {
      const { items } = await RestockCalculatorService.calculateRestockItems();
      const actionable = items.filter((i) => i.suggestedQty > 0);
      const total = actionable.reduce((s, i) => s + i.investment, 0);
      return {
        intent: 'generate_oc',
        reply:
          actionable.length > 0
            ? `Veo que estás revisando movimientos. Hay ${actionable.length} SKU(s) con reposición sugerida por S/ ${total.toLocaleString()}. ¿Genero las órdenes en borrador?`
            : 'Veo que estás revisando movimientos. No hay reposiciones pendientes ahora mismo.',
        cards:
          actionable.length > 0
            ? [
                {
                  id: 'oc-mov',
                  kind: 'oc' as const,
                  title: `Generar ${actionable.length} OC(s) en borrador`,
                  subtitle: `Inversión total S/ ${total.toLocaleString()}`,
                  metric: `${actionable.length} OC(s)`,
                  action: {
                    type: 'generate_oc' as const,
                    label: 'Aprobar y generar',
                    payload: { itemIds: actionable.map((i) => i.id) },
                    requiresConfirm: false,
                  },
                },
              ]
            : [],
        elapsedMs: Date.now() - started,
      };
    }
    return {
      intent: 'help',
      reply: 'Soy Nexo. Puedo mostrarte quiebres con números reales, generar órdenes de compra en borrador y simular o solicitar anticipos. Prueba: "qué está por quebrarse", "genera la OC" o "financia 20000".',
      cards: [],
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

    // Function calling prioritario: verbo de navegación → redirección
    // automática al módulo oficial (sin clics adicionales, sin 404).
    if (hasNavVerb(text)) {
      const dest = resolveNavigation(text);
      if (dest) {
        return {
          intent: 'navigate',
          reply: `Abriendo ${dest.label}…`,
          cards: [],
          elapsedMs: Date.now() - started,
          toolCalls: [{ tool: 'navigate_to_module', args: { destination_path: dest.href, label: dest.label } }],
        };
      }
      return {
        intent: 'navigate',
        reply: 'No encontré ese módulo en la plataforma. Puedo llevarte a uno de estos:',
        cards: [
          { id: 'nav-inv', kind: 'info', title: 'Inventario actual', action: { type: 'navigate', label: 'Ir', payload: { href: '/inventory/inventory-items' }, requiresConfirm: false } },
          { id: 'nav-prov', kind: 'info', title: 'Proveedores', action: { type: 'navigate', label: 'Ir', payload: { href: '/inventory/vendors' }, requiresConfirm: false } },
          { id: 'nav-int', kind: 'info', title: 'Integraciones', action: { type: 'navigate', label: 'Ir', payload: { href: '/dashboard/integraciones' }, requiresConfirm: false } },
          { id: 'nav-plans', kind: 'info', title: 'Comparar Planes', action: { type: 'navigate', label: 'Ir', payload: { href: '/plans' }, requiresConfirm: false } },
        ],
        elapsedMs: Date.now() - started,
      };
    }

    const intent = detectIntent(text);

    if (intent === 'help') {
      const r = await this.greet(pathname, userEmail);
      return { ...r, intent: 'help', elapsedMs: Date.now() - started };
    }

    if (intent === 'critical_stock') {
      const [{ items, criticalCount, totalCapitalRequired }] = await Promise.all([
        RestockCalculatorService.calculateRestockItems(),
      ]);
      const list = items.filter((i) => i.status !== 'optimal').slice(0, 5);
      if (list.length === 0) {
        return { intent, reply: 'Sin quiebres ni advertencias: todo el inventario tiene cobertura saludable.', cards: [], elapsedMs: Date.now() - started };
      }
      return {
        intent,
        reply: `${criticalCount} crítico(s) + ${list.length - Math.min(criticalCount, list.length)} advertencia(s). Capital total para cubrir: S/ ${totalCapitalRequired.toLocaleString()}.`,
        cards: list.map((i) => ({
          id: `sku-${i.id}`,
          kind: 'sku' as const,
          title: `${i.sku} · ${i.name}`,
          subtitle: `${i.status === 'critical' ? 'Crítico' : 'Advertencia'} · Cobertura ${i.coverageDays} días · Sugerido ${i.suggestedQty}`,
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
          return { intent, reply: `${found[0].sku} no necesita reposición (cobertura ${found[0].coverageDays} días). No genero órdenes innecesarias.`, cards: [], elapsedMs: Date.now() - started };
        }
        if (found.length === 0) {
          return { intent, reply: `No encontré el SKU "${sku}" en tu catálogo real. Revisa el código e inténtalo de nuevo.`, cards: [], elapsedMs: Date.now() - started };
        }
      }
      if (targets.length === 0) {
        return { intent, reply: 'Nada por reponer: ningún SKU tiene cantidad sugerida mayor a cero.', cards: [], elapsedMs: Date.now() - started };
      }
      const top = targets.slice(0, 3);
      const total = targets.reduce((s, i) => s + i.investment, 0);
      return {
        intent,
        reply: `Listo para generar ${targets.length} OC(s) en borrador por S/ ${total.toLocaleString()}. Se crean como borrador y solo se transmiten si el conector está configurado.`,
        cards: [
          ...top.map((i) => ({
            id: `sku-${i.id}`,
            kind: 'sku' as const,
            title: `${i.sku} · ${i.name}`,
            subtitle: `Sugerido ${i.suggestedQty} · ${i.provider}`,
            metric: `S/ ${i.investment.toLocaleString()}`,
          })),
          {
            id: 'oc-all',
            kind: 'oc',
            title: `Generar ${targets.length} OC(s) en borrador`,
            subtitle: `Inversión total S/ ${total.toLocaleString()}`,
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
          reply: `S/ ${amount.toLocaleString()} excede tu disponible inmediato (S/ ${cl.available_amount.toLocaleString()}). Te propongo el máximo disponible:`,
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
      return {
        intent,
        reply: `Para S/ ${amount.toLocaleString()} a 30 días: costo S/ ${sim.financialCost.toLocaleString()}, ventas protegidas ~S/ ${sim.protectedSales.toLocaleString()}, retorno neto S/ ${sim.netReturn.toLocaleString()}.${alerts ? ` Riesgo de quiebre vigente: ${alerts.riesgoQuiebre ?? 0}.` : ''} Requiere tu confirmación final.`,
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
    return {
      intent,
      reply: `${active.length} configurado(s), ${pending.length} pendiente(s).${lastLog?.data ? ` Último evento: ${lastLog.data.integracion} → ${lastLog.data.resultado}.` : ' Sin eventos registrados.'}`,
      cards: states.map((s) => ({
        id: `conn-${s.id}`,
        kind: 'connector' as const,
        title: s.name,
        subtitle: s.configured ? 'Configurado' : 'Pendiente de configuración',
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
