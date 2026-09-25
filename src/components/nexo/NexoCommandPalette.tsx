'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search, X, Loader2, CornerDownLeft, ArrowUp, ArrowDown,
  Sparkles, MapPin, ExternalLink, ChevronRight, Zap, Package,
  DollarSign, AlertTriangle, Settings, LayoutDashboard,
  Blocks, ShoppingBag, ArrowLeftRight, Tag, Building2, Store, User,
  Bell, History, Download, ArrowDownLeft, ArrowUpRight, Boxes,
  GraduationCap, FileQuestion, Headset, MessageCircleQuestion, BookOpen,
  BellPlus, Shapes, Repeat, RotateCcw, Send, CheckCircle2, ArrowLeft,
} from 'lucide-react';
import { NAVIGATION_CONFIG } from '@/config/navigationConfig';

// ─── Interfaces ───────────────────────────────────────────────────────
interface NavSuggestion {
  href: string;
  label: string;
  group: string;
  score?: number;
}

interface NexoAction {
  type: string;
  label: string;
  payload: Record<string, any>;
  requiresConfirm?: boolean;
}

interface NexoCard {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  metric?: string;
  action?: NexoAction;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'nexo';
  content: string;
  timestamp: string;
  cards?: NexoCard[];
  toolCall?: {
    name: string;
    route?: string;
    label?: string;
  };
}

interface FlatItem {
  href: string;
  label: string;
  group: string;
  id: string;
  keywords: string[];
}

// ─── Icon Map for Navigation ──────────────────────────────────────────
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
        ...(item.aliases || []).map((a) => norm(a.replace(/^\//, '').replace(/[-/]/g, ' '))),
        ...(SEMANTIC[item.href] || []).map(norm),
      ];
      items.push({
        href: item.href,
        label: item.label,
        group: group.title,
        id: item.id,
        keywords: [...new Set(kws.filter((k) => k.length >= 2))],
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

const QUESTION_REGEX = /^(¿|\?|que |qué |cual |cuál |como |cómo |cuanto |cuánto |muestrame |muéstrame |dime |explica |analiza |financia |genera |recomienda )/i;

// Formatea texto con soporte básico de markdown seguro sin dependencias
function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} style={{ height: '4px' }} />;
        // Bullet list
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ') || line.trim().startsWith('* ')) {
          const content = line.trim().replace(/^[-•*]\s*/, '');
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', paddingLeft: '4px' }}>
              <span style={{ color: '#6366f1', fontWeight: 700 }}>•</span>
              <span>{renderFormattedInline(content)}</span>
            </div>
          );
        }
        return <p key={idx} style={{ margin: 0, lineHeight: 1.55 }}>{renderFormattedInline(line)}</p>;
      })}
    </div>
  );
}

function renderFormattedInline(str: string): React.ReactNode {
  // Parsing simple de **bold** e inline `code`
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#0f172a', fontWeight: 650 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{ background: 'rgba(99, 102, 241, 0.08)', color: '#4f46e5', padding: '1px 5px', borderRadius: '4px', fontSize: '0.9em' }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function NexoCommandPalette() {
  const pathname = usePathname() || '';
  const router = useRouter();

  // Modal Visibility
  const [isOpen, setIsOpen] = useState(false);

  // Mode: Navigation vs Conversational Chat
  const [isChatMode, setIsChatMode] = useState(false);

  // Inputs & Selection
  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Navigation Items
  const [localResults, setLocalResults] = useState<FlatItem[]>([]);
  const flatNav = useMemo(() => buildLocalNav(), []);

  // Conversational Session Memory
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionSuccessId, setActionSuccessId] = useState<string | null>(null);

  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // ─── Default 6 Items as shown in the screenshot ──────────────────────
  const defaultItems: FlatItem[] = useMemo(() => [
    { href: '/stock-alerts', label: 'Alertas de stock', group: 'PANEL', id: 'alertas-stock', keywords: [] },
    { href: '/activity-log', label: 'Actividad reciente', group: 'PANEL', id: 'actividad-reciente', keywords: [] },
    { href: '/products/products', label: 'Productos', group: 'ENTIDADES', id: 'productos', keywords: [] },
    { href: '/inventory/inventory-items', label: 'Inventario actual', group: 'INVENTARIO', id: 'inventario-actual', keywords: [] },
    { href: '/dashboard/integraciones', label: 'Integraciones', group: 'INTEGRACIONES', id: 'centro-integraciones', keywords: [] },
    { href: '/settings/general-settings', label: 'Configuración general', group: 'CONFIGURACIÓN', id: 'config-general', keywords: [] },
  ], []);

  // ─── Global Keyboard Shortcuts (Cmd+K / Ctrl+K / Esc) ────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = navigator.platform.toUpperCase().includes('MAC') ? e.metaKey : e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            setInput('');
            setSelectedIndex(0);
          }
          return !prev;
        });
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        if (isChatMode && input.trim()) {
          setInput('');
        } else if (isChatMode) {
          setIsChatMode(false);
        } else {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isChatMode, input]);

  // Auto-focus on input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen, isChatMode]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (isChatMode && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatMode, isLoading]);

  // ─── Execute Navigation and close ────────────────────────────────────
  const executeNavigation = useCallback((href: string) => {
    setIsOpen(false);
    setInput('');
    setIsChatMode(false);
    router.push(href);
  }, [router]);

  // ─── Input changes (Filter or AI Prompt detection) ───────────────────
  const handleInputChange = useCallback((val: string) => {
    setInput(val);
    setSelectedIndex(0);

    if (!isChatMode) {
      if (val.trim()) {
        const results = localSearch(val, flatNav);
        setLocalResults(results);
      } else {
        setLocalResults([]);
      }
    }
  }, [flatNav, isChatMode]);

  // ─── Send Message to Chat Stream (Real AI / Backend Routing) ─────────
  const sendChatMessage = useCallback(async (promptText: string) => {
    const text = promptText.trim();
    if (!text || isLoading) return;

    // Switch to chat mode if not already
    setIsChatMode(true);
    setInput('');
    setIsLoading(true);

    const userMsgId = `user-${Date.now()}`;
    const nexoMsgId = `nexo-${Date.now()}`;

    const newHistory: ChatMessage[] = [
      ...chatMessages,
      {
        id: userMsgId,
        role: 'user',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      {
        id: nexoMsgId,
        role: 'nexo',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setChatMessages(newHistory);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory.filter(m => m.id !== nexoMsgId).map(m => ({ role: m.role === 'nexo' ? 'assistant' : 'user', content: m.content })),
          pathname,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Error al conectar con Nexo');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedReply = '';
      let generativeCards: NexoCard[] | undefined = undefined;
      let navToolCall: { name: string; route?: string; label?: string } | undefined = undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        const lines = raw.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          // AI SDK / Custom protocol parsing
          if (line.startsWith('0:')) {
            try {
              const textChunk = JSON.parse(line.slice(2));
              accumulatedReply += textChunk;
              setChatMessages((prev) =>
                prev.map((msg) =>
                  msg.id === nexoMsgId ? { ...msg, content: accumulatedReply } : msg
                )
              );
            } catch {
              // fallback
            }
          } else if (line.startsWith('a:')) {
            try {
              const data = JSON.parse(line.slice(2));
              if (data?.result?.cards) {
                generativeCards = data.result.cards;
              }
              if (data?.result?.route) {
                navToolCall = {
                  name: 'navigate_platform',
                  route: data.result.route,
                  label: data.result.label || data.result.route,
                };
              }
            } catch {
              // fallback
            }
          }
        }
      }

      // Final update with any collected cards or navigation tools
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === nexoMsgId
            ? { ...msg, content: accumulatedReply || 'Análisis completado.', cards: generativeCards, toolCall: navToolCall }
            : msg
        )
      );

      // Si el backend disparó una navegación directa
      if (navToolCall?.route) {
        setTimeout(() => {
          if (navToolCall?.route) executeNavigation(navToolCall.route);
        }, 1200);
      }
    } catch {
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === nexoMsgId
            ? { ...msg, content: 'Hubo un inconveniente temporal conectando con el orbe. Consulta nuevamente en segundos.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [chatMessages, isLoading, pathname, executeNavigation]);

  // ─── Execute Transactional Actions (Real Supabase execution) ─────────
  const handleExecuteCardAction = async (card: NexoCard, action: NexoAction) => {
    if (action.type === 'navigate' && action.payload?.href) {
      executeNavigation(action.payload.href);
      return;
    }

    setExecutingActionId(card.id);
    try {
      const res = await fetch('/api/nexo/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, confirm: true }),
      });
      const data = await res.json();
      if (data.success) {
        setActionSuccessId(card.id);
        setChatMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: 'nexo',
            content: `✅ Acción ejecutada con éxito: **${action.label}**. ${data.message || ''}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err) {
      console.error('Error al ejecutar acción:', err);
    } finally {
      setExecutingActionId(null);
    }
  };

  // ─── List of items displayed in Navigation Mode ──────────────────────
  const isQueryingQuestion = useMemo(() => {
    const trimmed = input.trim();
    return trimmed.length > 0 && (QUESTION_REGEX.test(trimmed) || trimmed.split(/\s+/).length >= 4);
  }, [input]);

  const navItemsToShow = useMemo(() => {
    if (!input.trim()) return defaultItems;
    return localResults;
  }, [input, defaultItems, localResults]);

  // Total selectable items count in navigation mode
  // (Items in list + the "Preguntar a Nexo" prompt option)
  const hasAIPromptOption = input.trim().length > 0;
  const totalNavigationItems = navItemsToShow.length + (hasAIPromptOption ? 1 : 0);

  // ─── Keyboard Navigation in List ─────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    // In Chat Mode
    if (isChatMode) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(input);
      }
      return;
    }

    // In Navigation Mode
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalNavigationItems));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalNavigationItems) % Math.max(1, totalNavigationItems));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // If AI prompt option is selected OR query has no nav matches OR is a question
      if (isQueryingQuestion || navItemsToShow.length === 0 || selectedIndex === navItemsToShow.length) {
        sendChatMessage(input);
      } else {
        const item = navItemsToShow[selectedIndex];
        if (item) {
          executeNavigation(item.href);
        } else if (input.trim()) {
          sendChatMessage(input);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setIsChatMode((prev) => !prev);
    }
  };

  // Scroll selected into view
  useEffect(() => {
    if (!isChatMode) {
      const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, isChatMode]);

  // ─── Floating Trigger Button (when closed) ───────────────────────────
  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setInput('');
          setSelectedIndex(0);
        }}
        title="Nexo · Cmd+K"
        aria-label="Abrir Asistente Nexo"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 90,
          width: '58px',
          height: '58px',
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: 'drop-shadow(0 6px 22px rgba(79, 70, 229, 0.45)) drop-shadow(0 0 10px rgba(56, 189, 248, 0.3))',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.filter = 'drop-shadow(0 8px 30px rgba(79, 70, 229, 0.65)) drop-shadow(0 0 16px rgba(56, 189, 248, 0.5))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.filter = 'drop-shadow(0 6px 22px rgba(79, 70, 229, 0.45)) drop-shadow(0 0 10px rgba(56, 189, 248, 0.3))';
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nexo-orb.png"
          alt="Nexo AI"
          width={58}
          height={58}
          style={{
            borderRadius: '50%',
            objectFit: 'contain',
            animation: 'nexo-float 3s ease-in-out infinite',
          }}
        />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '13vh',
        backgroundColor: 'rgba(15, 23, 42, 0.42)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'nexo-overlay-in 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '580px',
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'nexo-modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          minHeight: '430px',
          maxHeight: '82vh',
        }}
      >
        {/* ── Chat Mode Context Bar (when in Chat Mode) ──────────────── */}
        {isChatMode && (
          <div
            style={{
              padding: '8px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#475569',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsChatMode(false);
                setInput('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'transparent',
                border: 'none',
                color: '#6366f1',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#eef2ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <ArrowLeft size={13} />
              <span>Volver a accesos rápidos</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Nexo Activo
              </span>
              {chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setChatMessages([])}
                  title="Limpiar conversación"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                >
                  <RotateCcw size={11} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Top Search / Query Input Bar (Exact match to image) ────── */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid #eef2f6',
            background: '#ffffff',
          }}
        >
          <Search size={18} color="#9ca3af" style={{ flexShrink: 0, marginRight: '10px' }} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isChatMode ? 'Pregunta a Nexo o escribe una acción...' : 'Buscar módulos, ejecutar acciones...'}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            style={{
              width: '100%',
              padding: '16px 0',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: '#111827',
              background: 'transparent',
              fontFamily: 'inherit',
            }}
          />
          {isLoading ? (
            <Loader2 size={16} color="#6366f1" style={{ animation: 'nexo-spin 0.8s linear infinite', flexShrink: 0 }} />
          ) : isChatMode ? (
            <button
              type="button"
              onClick={() => sendChatMessage(input)}
              disabled={!input.trim()}
              style={{
                background: input.trim() ? '#4f46e5' : '#e2e8f0',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
              }}
            >
              <Send size={13} />
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center', flexShrink: 0 }}>
              <kbd style={kbdStyle}>⌘</kbd>
              <kbd style={kbdStyle}>K</kbd>
            </div>
          )}
        </div>

        {/* ── BODY 1: Navigation / Command Mode ──────────────────────── */}
        {!isChatMode && (
          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            {/* Section label exactly as shown in screenshot */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px 6px',
                fontSize: '11px',
                fontWeight: 650,
                color: '#94a3b8',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
              }}
            >
              <Zap size={11} color="#94a3b8" />
              <span>{input.trim() ? 'Resultados' : 'ACCESO RÁPIDO'}</span>
            </div>

            {/* Navigation rows matching image */}
            {navItemsToShow.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = getIconForHref(item.href);

              return (
                <div
                  key={`nav-${item.href}-${idx}`}
                  data-index={idx}
                  onClick={() => executeNavigation(item.href)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    transition: 'all 0.1s ease',
                  }}
                >
                  {/* Left Icon Squircle */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isSelected ? '#e0e7ff' : '#f8fafc',
                      border: `1px solid ${isSelected ? '#c7d2fe' : '#e2e8f0'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.1s ease',
                    }}
                  >
                    <Icon size={16} color={isSelected ? '#4f46e5' : '#64748b'} strokeWidth={1.8} />
                  </div>

                  {/* Label & Group Subtitle */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? '#1e1b4b' : '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: isSelected ? '#6366f1' : '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        marginTop: '1px',
                      }}
                    >
                      {item.group}
                    </div>
                  </div>

                  {/* Enter Badge (only on selected item) */}
                  {isSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <kbd
                        style={{
                          ...kbdStyle,
                          background: '#ffffff',
                          border: '1px solid #c7d2fe',
                          color: '#4f46e5',
                          fontSize: '11px',
                          padding: '2px 6px',
                        }}
                      >
                        ↵
                      </kbd>
                    </div>
                  )}
                </div>
              );
            })}

            {/* AI Prompt suggestion item when typing */}
            {hasAIPromptOption && (
              <div
                data-index={navItemsToShow.length}
                onClick={() => sendChatMessage(input)}
                onMouseEnter={() => setSelectedIndex(navItemsToShow.length)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 12px',
                  marginTop: '4px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: selectedIndex === navItemsToShow.length ? '#f5f3ff' : '#faf5ff',
                  border: `1px dashed ${selectedIndex === navItemsToShow.length ? '#8b5cf6' : '#ddd6fe'}`,
                  transition: 'all 0.1s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#ede9fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={16} color="#7c3aed" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#4c1d95' }}>
                    Preguntar a Nexo: &quot;{input.slice(0, 42)}{input.length > 42 ? '...' : ''}&quot;
                  </div>
                  <div style={{ fontSize: '11px', color: '#7c3aed' }}>
                    Análisis en tiempo real de inventario, finanzas y órdenes
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ fontSize: '10px', color: '#7c3aed', fontWeight: 600 }}>Consultar</span>
                  <kbd style={{ ...kbdStyle, background: '#ffffff', color: '#7c3aed', borderColor: '#c4b5fd' }}>↵</kbd>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BODY 2: Conversational Chat Mode & Generative UI ────────── */}
        {isChatMode && (
          <div
            ref={chatScrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* Initial Welcome if no messages */}
            {chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/nexo-orb.png"
                  alt="Nexo"
                  width={48}
                  height={48}
                  style={{
                    borderRadius: '50%',
                    margin: '0 auto 12px',
                    display: 'block',
                    animation: 'nexo-float 3s ease-in-out infinite',
                  }}
                />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>
                  ¿En qué puedo ayudarte hoy?
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                  Analizo métricas en vivo, quiebres inminentes de stock y ejecuto acciones transaccionales auditadas.
                </p>

                {/* Prompt suggestions pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '400px', margin: '0 auto' }}>
                  {[
                    '¿Qué productos están por quebrar?',
                    '¿Cuánto capital de trabajo necesito financiar?',
                    'Generar orden de compra para stock crítico',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => sendChatMessage(chip)}
                      style={{
                        padding: '8px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#334151',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eef2ff';
                        e.currentTarget.style.borderColor = '#c7d2fe';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                      }}
                    >
                      <span>{chip}</span>
                      <ChevronRight size={13} color="#94a3b8" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Thread */}
            {chatMessages.map((msg) => {
              if (msg.role === 'user') {
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: 'flex-end',
                      maxWidth: '82%',
                      background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                      color: '#ffffff',
                      padding: '10px 14px',
                      borderRadius: '14px 14px 2px 14px',
                      fontSize: '13px',
                      lineHeight: 1.5,
                      boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
                    }}
                  >
                    {msg.content}
                  </div>
                );
              }

              // Nexo Assistant Bubble
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: 'flex-start',
                    maxWidth: '92%',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px 14px 14px 2px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    color: '#1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Nexo Header in Bubble */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/nexo-orb.png"
                      alt=""
                      width={18}
                      height={18}
                      style={{ borderRadius: '50%', objectFit: 'contain' }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Nexo
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: 'auto' }}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Rendered Markdown Content */}
                  <div>{renderMarkdown(msg.content)}</div>

                  {/* Generative UI Navigation Tool Call */}
                  {msg.toolCall?.route && (
                    <div
                      style={{
                        padding: '10px 12px',
                        background: '#eef2ff',
                        border: '1px solid #c7d2fe',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ExternalLink size={15} color="#4f46e5" />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e1b4b' }}>
                            Redirección sugerida
                          </div>
                          <div style={{ fontSize: '11px', color: '#4f46e5' }}>{msg.toolCall.route}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => executeNavigation(msg.toolCall!.route!)}
                        style={{
                          background: '#4f46e5',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Ir ahora →
                      </button>
                    </div>
                  )}

                  {/* Generative UI Cards (SKUs, Financing, OCs) */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                      {msg.cards.map((card) => {
                        const isActionRunning = executingActionId === card.id;
                        const isActionDone = actionSuccessId === card.id;

                        return (
                          <div
                            key={card.id}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 650, color: '#0f172a' }}>
                                  {card.title}
                                </div>
                                {card.subtitle && (
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {card.subtitle}
                                  </div>
                                )}
                              </div>
                              {card.metric && (
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#4f46e5', fontVariantNumeric: 'tabular-nums' }}>
                                  {card.metric}
                                </div>
                              )}
                            </div>

                            {/* Generative Card Action Button */}
                            {card.action && (
                              <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  disabled={isActionRunning || isActionDone}
                                  onClick={() => handleExecuteCardAction(card, card.action!)}
                                  style={{
                                    background: isActionDone ? '#10b981' : '#4f46e5',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    fontWeight: 650,
                                    cursor: isActionRunning || isActionDone ? 'default' : 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  {isActionRunning && <Loader2 size={11} style={{ animation: 'nexo-spin 0.8s linear infinite' }} />}
                                  {isActionDone && <CheckCircle2 size={12} />}
                                  <span>{isActionDone ? 'Completado' : card.action.label}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Streaming Dots Indicator */}
            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#6366f1',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nexo-orb.png" alt="" width={15} height={15} style={{ borderRadius: '50%', objectFit: 'contain' }} />
                <span>Nexo está analizando métricas...</span>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER: Exact structure matching image & context ───────── */}
        <div
          style={{
            padding: '9px 16px',
            background: '#fafafa',
            borderTop: '1px solid #eef2f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: '#94a3b8',
            borderRadius: '0 0 18px 18px',
          }}
        >
          {/* Shortcuts Info */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            {!isChatMode ? (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowUp size={11} /><ArrowDown size={11} /> Navegar
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CornerDownLeft size={11} /> Abrir
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px' }}>esc</span> Cerrar
                </span>
              </>
            ) : (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CornerDownLeft size={11} /> Enviar
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '10px' }}>esc</span> Volver
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <kbd style={{ fontSize: '9px' }}>Tab</kbd> Modo Navegación
                </span>
              </>
            )}
          </div>

          {/* Right Brand Badge: Orb + Nexo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nexo-orb.png"
              alt="Nexo"
              width={17}
              height={17}
              style={{
                borderRadius: '50%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.5))',
              }}
            />
            <span style={{ fontWeight: 650, color: '#4f46e5' }}>
              {isChatMode ? 'Nexo Copilot' : 'Nexo'}
            </span>
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

const kbdStyle: React.CSSProperties = {
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  padding: '2px 5px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#6b7280',
  boxShadow: '0 1px 0 rgba(0, 0, 0, 0.05)',
  lineHeight: '1',
  fontFamily: 'system-ui, sans-serif',
};

export default NexoCommandPalette;
