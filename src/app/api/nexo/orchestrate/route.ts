import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { NexoEngineService, resolveNavigation, hasNavVerb } from '@/services/NexoEngineService';
import { NAVIGATION_CONFIG } from '@/config/navigationConfig';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nexo/orchestrate — Orquestador principal de Nexo.
 *
 * Diferencias con /api/nexo/query:
 * - Prioridad absoluta a Function Calling (navegación automática).
 * - Si el input coincide con cualquier módulo (fuzzy), ejecuta navigate_to_module
 *   SIN respuesta conversacional de relleno.
 * - Solo cae a texto si la intención es genuinamente transaccional o de consulta
 *   de datos (stock, financiamiento, OC).
 *
 * Body: { message: string, currentPath?: string }
 */

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

interface FlatNavItem {
  href: string;
  label: string;
  group: string;
  keywords: string[];
}

/** Flatten all navigation items with their keywords for fuzzy matching */
function buildFlatNav(): FlatNavItem[] {
  const items: FlatNavItem[] = [];
  for (const group of NAVIGATION_CONFIG) {
    for (const item of group.items) {
      const keywords: string[] = [
        norm(item.label),
        norm(item.id),
        ...((item.aliases || []).map((a) => norm(a.replace(/^\//,'').replace(/[-/]/g, ' ')))),
      ];

      // Add extra semantic keywords
      const SEMANTIC: Record<string, string[]> = {
        '/overview': ['inicio', 'home', 'resumen', 'panel', 'tablero', 'dashboard'],
        '/stock-alerts': ['alerta', 'alertas', 'riesgo', 'quiebre', 'critico'],
        '/activity-log': ['actividad', 'historial', 'log', 'bitacora', 'auditoria', 'registro'],
        '/products/products': ['producto', 'productos', 'catalogo', 'articulo', 'articulos', 'item', 'items', 'produc'],
        '/inventory/branch-details': ['sucursal', 'sede', 'tienda', 'local', 'branch'],
        '/inventory/locations': ['ubicacion', 'ubicaciones', 'almacen', 'deposito', 'bodega', 'warehouse'],
        '/inventory/vendors': ['proveedor', 'proveedores', 'abastecedor', 'vendor', 'suppliers'],
        '/inventory/clients': ['cliente', 'clientes', 'client', 'comprador'],
        '/inventory/inventory-items': ['inventario', 'existencias', 'inmovilizado', 'stock actual', 'inventory'],
        '/inventory/stock-adjustments': ['ajuste', 'ajustes', 'ajustar', 'stock adjustment'],
        '/inventory/incoming': ['recibo', 'recibos', 'recepcion', 'entrada', 'orden', 'ordenes', 'incoming'],
        '/inventory/outgoing': ['despacho', 'despachos', 'salida', 'envio', 'outgoing'],
        '/inventory/imports': ['importacion', 'importaciones', 'importar', 'plantilla', 'excel', 'csv'],
        '/dashboard/integraciones': ['integracion', 'integraciones', 'conectar', 'conexion', 'marketplace', 'shopify', 'mercadolibre', 'woocommerce', 'whatsapp', 'sap', 'sunat'],
        '/addons': ['complemento', 'complementos', 'extension', 'addon', 'plugin'],
        '/plans': ['plan', 'planes', 'precio', 'suscripcion', 'pricing', 'financiamiento', 'financiar'],
        '/settings/general-settings': ['configuracion', 'config', 'preferencia', 'cuenta', 'empresa', 'settings', 'ajustes generales'],
        '/settings/product-categories': ['categoria', 'categorias', 'etiqueta'],
        '/settings/stock-alerts-reorders': ['reorden', 'reorder', 'umbral', 'minimo'],
        '/help/user-guide': ['guia', 'manual', 'documentacion'],
        '/help/faq': ['pregunta', 'faq', 'frecuente'],
        '/help/contact-support': ['soporte', 'contacto', 'ayuda', 'support', 'help', 'ticket'],
        '/help/learn': ['aprender', 'tutorial', 'curso'],
        '/help/grill-me': ['prueba', 'examen', 'quiz', 'test'],
      };

      const extra = SEMANTIC[item.href] || [];
      keywords.push(...extra.map(norm));

      items.push({
        href: item.href,
        label: item.label,
        group: group.title,
        keywords: [...new Set(keywords.filter((k) => k.length >= 2))],
      });
    }
  }
  return items;
}

/** Score a query against a nav item. Higher = better match. 0 = no match. */
function scoreMatch(query: string, item: FlatNavItem): number {
  const q = norm(query);
  let best = 0;

  for (const kw of item.keywords) {
    // Exact match
    if (q === kw) return 1000 + kw.length;
    // Query starts with keyword or keyword starts with query (prefix)
    if (kw.startsWith(q) || q.startsWith(kw)) {
      const score = 500 + Math.min(q.length, kw.length);
      if (score > best) best = score;
    }
    // Query is contained in keyword
    if (kw.includes(q)) {
      const score = 300 + q.length;
      if (score > best) best = score;
    }
    // Keyword is contained in query
    if (q.includes(kw)) {
      const score = 200 + kw.length;
      if (score > best) best = score;
    }
  }
  return best;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message.slice(0, 500).trim() : '';
    const currentPath = typeof body?.currentPath === 'string' ? body.currentPath : '';

    if (!message) {
      return NextResponse.json({ error: 'Mensaje vacío.' }, { status: 400 });
    }

    const flatNav = buildFlatNav();
    const q = norm(message);

    // ──────────────────────────────────────────────────────────────────────
    // STEP 1: Fuzzy match against ALL navigation items.
    // If the user types anything that resembles a module name, NAVIGATE
    // immediately. No chat. No confirmation. No "Hola, ¿a dónde quieres ir?"
    // ──────────────────────────────────────────────────────────────────────
    const scored = flatNav
      .map((item) => ({ ...item, score: scoreMatch(message, item) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    // Top match is strong enough → auto-navigate
    if (scored.length > 0 && scored[0].score >= 300) {
      const top = scored[0];
      return NextResponse.json({
        type: 'navigate',
        reply: null, // NO text reply — just navigate
        toolCalls: [{ tool: 'navigate_to_module', args: { destination_path: top.href, label: top.label } }],
        suggestions: scored.slice(1, 4).map((s) => ({
          href: s.href,
          label: s.label,
          group: s.group,
        })),
      });
    }

    // Partial matches → show suggestions list (Generative UI)
    if (scored.length > 0 && scored[0].score >= 100) {
      return NextResponse.json({
        type: 'suggestions',
        reply: null,
        suggestions: scored.slice(0, 6).map((s) => ({
          href: s.href,
          label: s.label,
          group: s.group,
          score: s.score,
        })),
        toolCalls: [],
      });
    }

    // ──────────────────────────────────────────────────────────────────────
    // STEP 2: Check if it's a navigation verb ("llévame a...", "abre...")
    // Use the existing NexoEngineService resolution.
    // ──────────────────────────────────────────────────────────────────────
    if (hasNavVerb(message)) {
      const dest = resolveNavigation(message);
      if (dest) {
        return NextResponse.json({
          type: 'navigate',
          reply: null,
          toolCalls: [{ tool: 'navigate_to_module', args: { destination_path: dest.href, label: dest.label } }],
          suggestions: [],
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────
    // STEP 3: Domain queries (stock, financing, OC, sync).
    // Delegate to the full NexoEngineService for rich card responses.
    // ──────────────────────────────────────────────────────────────────────
    const session = await SessionManager.getSession().catch(() => null);
    const email = session?.email || 'sistema@inventa.ai';
    const result = await NexoEngineService.query(message, currentPath, email);

    return NextResponse.json({
      type: result.toolCalls && result.toolCalls.length > 0 ? 'navigate' : 'data',
      reply: result.reply,
      cards: result.cards || [],
      toolCalls: result.toolCalls || [],
      suggestions: [],
      intent: result.intent,
      elapsedMs: result.elapsedMs,
    });
  } catch (error: any) {
    console.error('Error en POST /api/nexo/orchestrate:', error);
    return NextResponse.json({ error: 'Nexo no pudo procesar tu solicitud.' }, { status: 500 });
  }
}
