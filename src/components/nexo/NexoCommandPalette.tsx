'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, X, Loader2, Command, CornerDownLeft, ArrowUp, ArrowDown,
  Sparkles, MapPin, ExternalLink, ChevronRight, Zap, Package, TrendingUp,
  DollarSign, AlertTriangle, Settings, HelpCircle, LayoutDashboard,
  Blocks, ShoppingBag, ArrowLeftRight, Tag, Building2, Store, User,
  Bell, History, Download, ArrowDownLeft, ArrowUpRight, Boxes,
  GraduationCap, FileQuestion, Headset, MessageCircleQuestion, BookOpen,
  BellPlus, Shapes, Repeat,
} from 'lucide-react';
import { NAVIGATION_CONFIG } from '@/config/navigationConfig';

// ─── Types ─────────────────────────────────────────────────────────────
interface NavSuggestion {
  href: string;
  label: string;
  group: string;
  score?: number;
}

interface NexoCard {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  metric?: string;
  action?: { type: string; label: string; payload: Record<string, any>; requiresConfirm: boolean };
}

interface OrchestrateResponse {
  type: 'navigate' | 'suggestions' | 'data';
  reply: string | null;
  toolCalls?: Array<{ tool: string; args: { destination_path: string; label: string } }>;
  suggestions?: NavSuggestion[];
  cards?: NexoCard[];
  intent?: string;
  error?: string;
}

// ─── Icon Map ──────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  'resumen': LayoutDashboard,
  'alertas-stock': Bell,
  'actividad-reciente': History,
  'productos': Tag,
  'sucursal': Building2,
  'ubicaciones': MapPin,
  'proveedores': Store,
  'clientes': User,
  'inventario-actual': Boxes,
  'ajustes-stock': ArrowLeftRight,
  'recibos': ArrowDownLeft,
  'despachos': ArrowUpRight,
  'importaciones': Download,
  'centro-integraciones': Blocks,
  'complementos-disponibles': ShoppingBag,
  'comparar-planes': Repeat,
  'config-general': Settings,
  'categorias': Shapes,
  'alertas-reorders': BellPlus,
  'guia-usuario': BookOpen,
  'faq': MessageCircleQuestion,
  'contactar-soporte': Headset,
  'aprender': GraduationCap,
  'ponme-a-prueba': FileQuestion,
};

function getIconForHref(href: string): React.ElementType {
  for (const group of NAVIGATION_CONFIG) {
    for (const item of group.items) {
      if (item.href === href) return ICON_MAP[item.id] || ChevronRight;
    }
  }
  return ChevronRight;
}

function getGroupForHref(href: string): string {
  for (const group of NAVIGATION_CONFIG) {
    for (const item of group.items) {
      if (item.href === href) return group.title;
    }
  }
  return '';
}

// ─── Local Fuzzy Search (instant, before API) ──────────────────────────
interface FlatItem {
  href: string;
  label: string;
  group: string;
  id: string;
  keywords: string[];
}

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function buildLocalNav(): FlatItem[] {
  const items: FlatItem[] = [];
  const SEMANTIC: Record<string, string[]> = {
    '/overview': ['inicio', 'home', 'resumen', 'panel', 'tablero', 'dashboard'],
    '/stock-alerts': ['alerta', 'alertas', 'riesgo', 'quiebre', 'critico'],
    '/activity-log': ['actividad', 'historial', 'log', 'bitacora', 'registro'],
    '/products/products': ['producto', 'productos', 'catalogo', 'articulo', 'items', 'produc'],
    '/inventory/branch-details': ['sucursal', 'sede', 'tienda', 'local'],
    '/inventory/locations': ['ubicacion', 'ubicaciones', 'almacen', 'bodega'],
    '/inventory/vendors': ['proveedor', 'proveedores', 'vendor'],
    '/inventory/clients': ['cliente', 'clientes'],
    '/inventory/inventory-items': ['inventario', 'existencias', 'inmovilizado', 'stock'],
    '/inventory/stock-adjustments': ['ajuste', 'ajustes', 'ajustar'],
    '/inventory/incoming': ['recibo', 'recibos', 'recepcion', 'entrada', 'orden', 'ordenes'],
    '/inventory/outgoing': ['despacho', 'despachos', 'salida', 'envio'],
    '/inventory/imports': ['importacion', 'importar', 'plantilla', 'excel', 'csv'],
    '/dashboard/integraciones': ['integracion', 'integraciones', 'conectar', 'shopify', 'mercadolibre', 'woocommerce', 'whatsapp', 'sap'],
    '/addons': ['complemento', 'complementos', 'addon', 'plugin'],
    '/plans': ['plan', 'planes', 'precio', 'suscripcion', 'financiamiento'],
    '/settings/general-settings': ['configuracion', 'config', 'cuenta', 'empresa', 'settings'],
    '/settings/product-categories': ['categoria', 'categorias'],
    '/settings/stock-alerts-reorders': ['reorden', 'umbral'],
    '/help/user-guide': ['guia', 'manual'],
    '/help/faq': ['faq', 'pregunta frecuente'],
    '/help/contact-support': ['soporte', 'contacto', 'ayuda', 'help'],
    '/help/learn': ['aprender', 'tutorial'],
    '/help/grill-me': ['prueba', 'examen', 'quiz'],
  };

  for (const group of NAVIGATION_CONFIG) {
    for (const item of group.items) {
      const kws = [
        norm(item.label),
        norm(item.id.replace(/-/g, ' ')),
        ...(item.aliases || []).map((a) => norm(a.replace(/^\//,'').replace(/[-/]/g, ' '))),
        ...(SEMANTIC[item.href] || []).map(norm),
      ];
      items.push({
        href: item.href,
        label: item.label,
        group: group.title,
        id: item.id,
        keywords: [...new Set(kws.filter(k => k.length >= 2))],
      });
    }
  }
  return items;
}

function localSearch(query: string, items: FlatItem[]): FlatItem[] {
  const q = norm(query);
  if (!q) return [];

  return items
    .map((item) => {
      let score = 0;
      for (const kw of item.keywords) {
        if (q === kw) { score = Math.max(score, 1000); break; }
        if (kw.startsWith(q)) score = Math.max(score, 600 + q.length);
        else if (q.startsWith(kw)) score = Math.max(score, 500 + kw.length);
        else if (kw.includes(q)) score = Math.max(score, 400 + q.length);
        else if (q.includes(kw)) score = Math.max(score, 200 + kw.length);
      }
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

// ─── Domain intent detection (for deep queries) ───────────────────────
const DOMAIN_INTENTS = [
  { keywords: ['stock', 'quiebre', 'critico', 'alerta', 'falta', 'faltan', 'inventario bajo'], label: 'stock' },
  { keywords: ['financi', 'desembols', 'anticipo', 'capital', 'credito', 'prestamo'], label: 'financing' },
  { keywords: ['genera oc', 'generar', 'crear orden', 'orden de compra', 'reabastec', 'reponer'], label: 'oc' },
  { keywords: ['sincroniz', 'integrac', 'conectar', 'shopify', 'mercadolibre'], label: 'sync' },
];

function isDomainQuery(query: string): boolean {
  const q = norm(query);
  return DOMAIN_INTENTS.some(intent => intent.keywords.some(kw => q.includes(kw)));
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function NexoCommandPalette() {
  const pathname = usePathname() || '';
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Results state
  const [localResults, setLocalResults] = useState<FlatItem[]>([]);
  const [apiResponse, setApiResponse] = useState<OrchestrateResponse | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flatNav = useMemo(() => buildLocalNav(), []);

  // ─── Keyboard shortcut (Cmd+K / Ctrl+K) ───────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = navigator.platform.toUpperCase().includes('MAC') ? e.metaKey : e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            setInput('');
            setLocalResults([]);
            setApiResponse(null);
            setSelectedIndex(0);
          }
          return !prev;
        });
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Auto-focus on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 30);
  }, [isOpen]);

  // ─── Input handling with instant local search + debounced API ──────
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    setSelectedIndex(0);
    setApiResponse(null);

    // Instant local fuzzy search
    const results = localSearch(value, flatNav);
    setLocalResults(results);

    // Debounced API call for domain queries or when local results are weak
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length >= 2) {
      const needsApi = isDomainQuery(value) || results.length === 0 || value.trim().split(/\s+/).length >= 3;
      if (needsApi) {
        debounceRef.current = setTimeout(() => {
          fetchOrchestrate(value.trim());
        }, 250);
      }
    }
  }, [flatNav]);

  const fetchOrchestrate = async (message: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/nexo/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, currentPath: pathname }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiResponse(data);

        // Auto-navigate if the API returns a strong navigate command
        if (data.type === 'navigate' && data.toolCalls?.length > 0) {
          const dest = data.toolCalls[0].args.destination_path;
          executeNavigation(dest);
        }
      }
    } catch (err) {
      console.error('Nexo orchestrate error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Navigation execution ──────────────────────────────────────────
  const executeNavigation = useCallback((href: string) => {
    if (typeof href === 'string' && href.startsWith('/')) {
      setIsOpen(false);
      setInput('');
      setLocalResults([]);
      setApiResponse(null);
      router.push(href);
    }
  }, [router]);

  // ─── Build display items ──────────────────────────────────────────
  const displayItems = useMemo(() => {
    const items: Array<{ type: 'nav'; href: string; label: string; group: string; id: string }
      | { type: 'card'; card: NexoCard }> = [];

    // Local nav results
    for (const r of localResults) {
      items.push({ type: 'nav', href: r.href, label: r.label, group: r.group, id: r.id });
    }

    // API suggestion results (that aren't already shown)
    if (apiResponse?.suggestions) {
      for (const s of apiResponse.suggestions) {
        if (!items.some((i) => i.type === 'nav' && i.href === s.href)) {
          const navItem = NAVIGATION_CONFIG.flatMap(g => g.items).find(i => i.href === s.href);
          items.push({ type: 'nav', href: s.href, label: s.label, group: s.group, id: navItem?.id || '' });
        }
      }
    }

    // API data cards
    if (apiResponse?.cards) {
      for (const card of apiResponse.cards) {
        items.push({ type: 'card', card });
      }
    }

    return items;
  }, [localResults, apiResponse]);

  // ─── Keyboard navigation ──────────────────────────────────────────
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const total = displayItems.length;
    if (!total) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = displayItems[selectedIndex];
      if (selected?.type === 'nav') {
        executeNavigation(selected.href);
      } else if (selected?.type === 'card' && selected.card.action) {
        if (selected.card.action.type === 'navigate') {
          executeNavigation(selected.card.action.payload.href);
        }
      }
    }
  }, [displayItems, selectedIndex, executeNavigation]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // ─── Default items (when input is empty) ───────────────────────────
  const defaultItems = useMemo(() => {
    // Show recent/contextual suggestions based on current path
    const quick: FlatItem[] = [];
    const currentGroup = NAVIGATION_CONFIG.find(g =>
      g.items.some(i => i.href === pathname || i.aliases?.includes(pathname))
    );

    // Add items from current group first
    if (currentGroup) {
      for (const item of currentGroup.items) {
        if (item.href !== pathname) {
          quick.push({
            href: item.href, label: item.label, group: currentGroup.title,
            id: item.id, keywords: [],
          });
        }
      }
    }

    // Fill with top-level items
    const topItems = ['/overview', '/products/products', '/inventory/inventory-items', '/stock-alerts', '/dashboard/integraciones', '/settings/general-settings'];
    for (const href of topItems) {
      if (!quick.some(q => q.href === href) && href !== pathname) {
        const navItem = NAVIGATION_CONFIG.flatMap(g => g.items).find(i => i.href === href);
        if (navItem) {
          const group = NAVIGATION_CONFIG.find(g => g.items.includes(navItem))!;
          quick.push({ href: navItem.href, label: navItem.label, group: group.title, id: navItem.id, keywords: [] });
        }
      }
    }

    return quick.slice(0, 6);
  }, [pathname]);

  const showDefaults = !input.trim();
  const itemsToShow = showDefaults
    ? defaultItems.map(d => ({ type: 'nav' as const, href: d.href, label: d.label, group: d.group, id: d.id }))
    : displayItems;

  // ─── Render ────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setInput(''); setLocalResults([]); setApiResponse(null); }}
        title="Nexo · Cmd+K"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 90,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'transparent', border: 'none', padding: 0,
          cursor: 'pointer', transition: 'all 0.2s ease',
          filter: 'drop-shadow(0 4px 20px rgba(99,102,241,0.45))',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.filter = 'drop-shadow(0 6px 28px rgba(99,102,241,0.6))'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'drop-shadow(0 4px 20px rgba(99,102,241,0.45))'; }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nexo-orb.jpg"
          alt="Nexo"
          width={56}
          height={56}
          style={{
            borderRadius: '50%', objectFit: 'cover',
            animation: 'nexo-float 3s ease-in-out infinite',
          }}
        />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'nexo-overlay-in 0.15s ease-out',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '580px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'nexo-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Search Input ─────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', padding: '0 16px',
          borderBottom: '1px solid #e5e7eb',
        }}>
          <Search size={18} color="#9ca3af" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar módulos, ejecutar acciones..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              width: '100%', padding: '16px 12px', border: 'none', outline: 'none',
              fontSize: '15px', color: '#111827', background: 'transparent',
              fontFamily: 'inherit',
            }}
          />
          {isLoading ? (
            <Loader2 size={16} color="#6366f1" style={{ animation: 'nexo-spin 0.8s linear infinite', flexShrink: 0 }} />
          ) : (
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
              <kbd style={kbdStyle}>⌘</kbd><kbd style={kbdStyle}>K</kbd>
            </div>
          )}
        </div>

        {/* ── Results List ──────────────────────────────────────────── */}
        <div ref={listRef} style={{
          maxHeight: '380px', overflowY: 'auto', overflowX: 'hidden',
          padding: '6px',
        }}>
          {/* Section label */}
          {showDefaults && (
            <div style={sectionLabelStyle}>
              <Zap size={11} style={{ opacity: 0.6 }} />
              <span>Acceso rápido</span>
            </div>
          )}
          {!showDefaults && itemsToShow.length > 0 && (
            <div style={sectionLabelStyle}>
              <Search size={11} style={{ opacity: 0.6 }} />
              <span>Resultados</span>
            </div>
          )}

          {/* Items */}
          {itemsToShow.map((item, idx) => {
            if (item.type === 'nav') {
              const Icon = getIconForHref(item.href);
              const isSelected = idx === selectedIndex;
              const isCurrentPage = item.href === pathname;

              return (
                <div
                  key={`nav-${item.href}`}
                  data-index={idx}
                  onClick={() => executeNavigation(item.href)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                    background: isSelected ? '#f3f4f6' : 'transparent',
                    transition: 'background 0.08s ease',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: isSelected ? '#eef2ff' : '#f9fafb',
                    border: `1px solid ${isSelected ? '#c7d2fe' : '#e5e7eb'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.08s ease',
                  }}>
                    <Icon size={15} color={isSelected ? '#4f46e5' : '#6b7280'} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: 500, color: '#111827',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: '12px', color: '#9ca3af', marginTop: '1px',
                    }}>
                      {item.group}
                      {isCurrentPage && <span style={{ color: '#6366f1', marginLeft: '6px', fontWeight: 500 }}>• Página actual</span>}
                    </div>
                  </div>

                  {isSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <kbd style={{ ...kbdStyle, fontSize: '10px', padding: '1px 5px' }}>↵</kbd>
                    </div>
                  )}
                </div>
              );
            }

            // Card items (from API domain queries)
            if (item.type === 'card') {
              const { card } = item;
              const isSelected = idx === selectedIndex;
              const kindIcon = card.kind === 'sku' ? Package
                : card.kind === 'financing' ? DollarSign
                : card.kind === 'oc' ? ShoppingBag
                : card.kind === 'connector' ? Blocks
                : AlertTriangle;

              return (
                <div
                  key={`card-${card.id}`}
                  data-index={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    if (card.action?.type === 'navigate') {
                      executeNavigation(card.action.payload.href);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                    background: isSelected ? '#f3f4f6' : 'transparent',
                    transition: 'background 0.08s ease',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: card.kind === 'sku' ? '#fef3c7' : card.kind === 'financing' ? '#d1fae5' : '#eef2ff',
                    border: `1px solid ${card.kind === 'sku' ? '#fde68a' : card.kind === 'financing' ? '#a7f3d0' : '#c7d2fe'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {React.createElement(kindIcon, { size: 15, color: card.kind === 'sku' ? '#d97706' : card.kind === 'financing' ? '#059669' : '#4f46e5' })}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.title}
                    </div>
                    {card.subtitle && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '1px' }}>{card.subtitle}</div>
                    )}
                  </div>
                  {card.metric && (
                    <div style={{
                      fontSize: '13px', fontWeight: 600, color: '#4f46e5',
                      flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                    }}>
                      {card.metric}
                    </div>
                  )}
                </div>
              );
            }

            return null;
          })}

          {/* API reply text (only for data queries, never for nav) */}
          {apiResponse?.reply && apiResponse.type === 'data' && (
            <div style={{
              padding: '12px 14px', margin: '4px 6px',
              background: '#f8fafc', borderRadius: '10px',
              border: '1px solid #e5e7eb',
              fontSize: '13px', lineHeight: '1.6', color: '#374151',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nexo-orb.jpg" alt="" width={16} height={16} style={{ borderRadius: '50%', objectFit: 'cover' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nexo</span>
              </div>
              {apiResponse.reply}
            </div>
          )}

          {/* Empty state */}
          {!showDefaults && input.trim().length > 0 && itemsToShow.length === 0 && !isLoading && !apiResponse?.reply && (
            <div style={{
              padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px',
            }}>
              <Search size={20} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <div>Sin resultados para &quot;{input}&quot;</div>
              <div style={{ marginTop: '4px', fontSize: '12px' }}>Prueba con: productos, inventario, proveedores...</div>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────── */}
        <div style={{
          padding: '8px 16px', background: '#fafafa', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '11px', color: '#9ca3af',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ArrowUp size={10} /><ArrowDown size={10} /> Navegar
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <CornerDownLeft size={10} /> Abrir
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '10px' }}>esc</span> Cerrar
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nexo-orb.jpg" alt="" width={16} height={16} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            <span style={{ fontWeight: 500, color: '#6366f1' }}>Nexo</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes nexo-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes nexo-modal-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes nexo-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes nexo-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Shared Styles ─────────────────────────────────────────────────────

const kbdStyle: React.CSSProperties = {
  background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '4px',
  padding: '2px 5px', fontSize: '11px', fontWeight: 600, color: '#6b7280',
  boxShadow: '0 1px 0 rgba(0,0,0,0.06)', lineHeight: '1',
  fontFamily: 'system-ui, sans-serif',
};

const sectionLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '5px',
  padding: '8px 14px 4px', fontSize: '11px', fontWeight: 600,
  color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px',
};

export default NexoCommandPalette;
