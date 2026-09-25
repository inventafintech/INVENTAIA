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
  Trash2, MessageSquare
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

const QUESTION_REGEX = /^(¿|\?|que |qué |cual |cuál |como |cómo |cuanto |cuánto |muestrame |muéstrame |dime |explica |analiza |financia |genera |recomienda |hola|buenos|saludos)/i;

// Formatea texto con soporte completo de markdown (encabezados, listas, negritas, código)
function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-1.5 text-[13px] leading-relaxed break-words text-slate-800">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Encabezados H1, H2, H3
        if (trimmed.startsWith('### ')) {
          return (
            <div key={idx} className="font-bold text-slate-950 text-[13.5px] mt-2 pb-0.5 border-b border-slate-200/70 flex items-center gap-1.5">
              <span>{renderFormattedInline(trimmed.replace(/^###\s*/, ''))}</span>
            </div>
          );
        }
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          return (
            <div key={idx} className="font-extrabold text-slate-950 text-[14px] mt-2.5 mb-0.5">
              {renderFormattedInline(trimmed.replace(/^#+\s*/, ''))}
            </div>
          );
        }

        // Listas numeradas (ej. 1. 2. 3.)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-0.5 mt-1">
              <span className="text-blue-600 font-bold text-xs leading-5 min-w-[16px]">{numMatch[1]}.</span>
              <span className="flex-1 leading-normal">{renderFormattedInline(numMatch[2])}</span>
            </div>
          );
        }

        // Listas con viñetas (- o • o *)
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-•*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-blue-600 font-bold leading-5">•</span>
              <span className="flex-1 leading-normal">{renderFormattedInline(content)}</span>
            </div>
          );
        }

        return <p key={idx} className="m-0 leading-normal">{renderFormattedInline(line)}</p>;
      })}
    </div>
  );
}

function renderFormattedInline(str: string): React.ReactNode {
  // Soporta **negrita**, `codigo`, *cursiva*
  const parts = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i} className="text-slate-950 font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono font-medium">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={i} className="italic text-slate-700">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════

export function NexoCommandPalette() {
  const pathname = usePathname() || '';
  const router = useRouter();

  // Modal Visibility
  const [isOpen, setIsOpen] = useState(false);

  // Mode: Navigation (Acceso Rápido) vs Conversational Chat
  const [isChatMode, setIsChatMode] = useState(false);

  // Inputs & Selection
  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Navigation Items
  const [localResults, setLocalResults] = useState<FlatItem[]>([]);
  const flatNav = useMemo(() => buildLocalNav(), []);

  // Conversational Session Memory (persists during open modal)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionSuccessId, setActionSuccessId] = useState<string | null>(null);

  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // ─── Default 6 Items as shown in image_d2d0dc.png ─────────────────────
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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, isChatMode]);

  // Scroll chat to bottom on new message or token
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
          messages: newHistory.filter(m => m.id !== nexoMsgId).map(m => ({
            role: m.role === 'nexo' ? 'assistant' : 'user',
            content: m.content
          })),
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

          // AI SDK streaming format: 0:"token"
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
              // fallback ignore malformed chunk
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
              // fallback ignore
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
            ? { ...msg, content: 'Hubo un inconveniente temporal conectando con el motor de Nexo. Por favor, reintenta en unos instantes.' }
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
        body: JSON.stringify({
          action: action.type,
          params: action.payload,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccessId(card.id);
        // Agregar confirmación de auditoría en el chat
        const auditMsg: ChatMessage = {
          id: `audit-${Date.now()}`,
          role: 'nexo',
          content: `✅ **Acción ejecutada exitosamente**: ${data.message || action.label}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setChatMessages((prev) => [...prev, auditMsg]);
      } else {
        alert(data.error || 'Error al ejecutar la acción');
      }
    } catch (err: any) {
      alert('Error de red al ejecutar acción: ' + err.message);
    } finally {
      setExecutingActionId(null);
    }
  };

  // ─── Filtered Items & Keyboard Logic ─────────────────────────────────
  const navItemsToShow: FlatItem[] = useMemo(() => {
    if (!input.trim()) return defaultItems;
    return localResults;
  }, [input, defaultItems, localResults]);

  const isQueryingQuestion = useMemo(() => {
    return QUESTION_REGEX.test(input.trim()) || input.trim().length > 25;
  }, [input]);

  const hasAIPromptOption = useMemo(() => {
    return input.trim().length > 0;
  }, [input]);

  const totalNavigationItems = navItemsToShow.length + (hasAIPromptOption ? 1 : 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      // Si la consulta es una pregunta o seleccionó el chip de IA
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

  // Scroll selected into view in Navigation mode
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
        title="Nexo AI · Cmd+K"
        aria-label="Abrir Asistente Nexo"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full p-0 border-0 bg-transparent cursor-pointer transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 50,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          padding: 0,
          background: 'transparent',
          cursor: 'pointer',
          filter: 'drop-shadow(0 8px 24px rgba(37, 99, 235, 0.4)) drop-shadow(0 0 10px rgba(56, 189, 248, 0.3))',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/nexo-orb.png"
          alt="Nexo AI"
          width={56}
          height={56}
          className="rounded-full object-contain pointer-events-none"
          style={{ animation: 'nexo-float 3s ease-in-out infinite' }}
        />
      </button>
    );
  }

  return (
    <div
      className="nexo-overlay fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-start justify-center p-0 sm:pt-[12vh] sm:px-4"
      onClick={() => setIsOpen(false)}
    >
      {/* 
        CONTAINER DUAL:
        - Mobile: Drawer anclado al fondo (items-end, w-full, h-[85vh], rounded-t-3xl)
        - Desktop: Modal centrado (sm:max-w-[620px], sm:h-auto sm:max-h-[82vh], sm:rounded-2xl)
      */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="nexo-container w-full sm:max-w-[620px] bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200/90 overflow-hidden flex flex-col h-[85vh] sm:h-auto sm:max-h-[82vh] transition-all"
        style={{
          boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Barra superior de arrastre (Handle Bar) solo visible en móviles */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0" />

        {/* ── Subheader de Modo Chat (cuando está en Chat) ───────────── */}
        {isChatMode && (
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsChatMode(false);
                setInput('');
              }}
              className="inline-flex items-center gap-1.5 bg-transparent border-0 text-blue-600 font-semibold cursor-pointer px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Volver a accesos rápidos</span>
            </button>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                Nexo Activo
              </span>
              {chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setChatMessages([])}
                  title="Limpiar conversación"
                  className="flex items-center gap-1 bg-transparent border-0 text-slate-400 hover:text-red-500 cursor-pointer text-[11px] px-1.5 py-0.5 rounded transition-colors"
                >
                  <RotateCcw size={11} />
                  <span>Limpiar</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Input Bar (Búsqueda o Prompt Conversacional) ───────────── */}
        <div className="relative flex items-center px-4 border-b border-slate-100 bg-white flex-shrink-0">
          <Search size={18} className="text-slate-400 flex-shrink-0 mr-2.5" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isChatMode ? 'Pregunta a Nexo o escribe una acción...' : 'Buscar módulos, ejecutar acciones...'}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full py-4 text-[15px] text-slate-900 bg-transparent border-0 outline-none placeholder:text-slate-400 font-sans"
          />
          {isLoading ? (
            <Loader2 size={16} className="text-blue-600 animate-spin flex-shrink-0" />
          ) : isChatMode ? (
            <button
              type="button"
              onClick={() => sendChatMessage(input)}
              disabled={!input.trim()}
              className={`rounded-lg px-2.5 py-1.5 flex items-center justify-center transition-all ${
                input.trim()
                  ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-400 cursor-default'
              }`}
            >
              <Send size={13} />
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
              <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                ⌘
              </kbd>
              <kbd className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                K
              </kbd>
            </div>
          )}
        </div>

        {/* ── MODO 1: Acceso Rápido / Navegación (Coincidencia con Imagen) ─ */}
        {!isChatMode && (
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-2 flex flex-col gap-0.5"
          >
            {/* Header de sección idéntico a la imagen */}
            <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-slate-400 tracking-wider uppercase">
              <Zap size={12} className="text-slate-400" />
              <span>{input.trim() ? 'Resultados' : 'ACCESO RÁPIDO'}</span>
            </div>

            {/* Filas de navegación */}
            {navItemsToShow.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = getIconForHref(item.href);

              return (
                <div
                  key={`nav-${item.href}-${idx}`}
                  data-index={idx}
                  onClick={() => executeNavigation(item.href)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/80 text-blue-950' : 'bg-transparent hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  {/* Icono en squircle suave */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors ${
                      isSelected
                        ? 'bg-blue-100 border-blue-200 text-blue-600'
                        : 'bg-slate-50 border-slate-200/70 text-slate-500'
                    }`}
                  >
                    <Icon size={16} strokeWidth={1.8} />
                  </div>

                  {/* Etiqueta y Subtítulo de Grupo */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${isSelected ? 'font-semibold text-slate-950' : 'font-medium text-slate-800'}`}>
                      {item.label}
                    </div>
                    <div className={`text-[11px] font-semibold uppercase tracking-wider mt-0.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                      {item.group}
                    </div>
                  </div>

                  {/* Enter Badge */}
                  {isSelected && (
                    <div className="hidden sm:flex items-center flex-shrink-0">
                      <kbd className="bg-white border border-blue-200 text-blue-600 text-[11px] px-1.5 py-0.5 rounded shadow-sm font-sans">
                        ↵
                      </kbd>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Tarjeta de Sugerencia AI al escribir */}
            {hasAIPromptOption && (
              <div
                data-index={navItemsToShow.length}
                onClick={() => sendChatMessage(input)}
                onMouseEnter={() => setSelectedIndex(navItemsToShow.length)}
                className={`flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl cursor-pointer border border-dashed transition-all ${
                  selectedIndex === navItemsToShow.length
                    ? 'bg-blue-50/90 border-blue-400 text-blue-950'
                    : 'bg-slate-50 border-slate-300 text-slate-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-600">
                  <Sparkles size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-blue-900 truncate">
                    Preguntar a Nexo: &quot;{input.slice(0, 42)}{input.length > 42 ? '...' : ''}&quot;
                  </div>
                  <div className="text-[11px] text-blue-600/80 truncate">
                    Análisis en tiempo real de inventario, finanzas y órdenes
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-blue-600 font-semibold hidden sm:inline">Consultar</span>
                  <kbd className="bg-white text-blue-600 border border-blue-200 text-[10px] px-1.5 py-0.5 rounded">↵</kbd>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MODO 2: Historial de Chat Conversacional (Map del Array) ─── */}
        {isChatMode && (
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4"
          >
            {/* Estado inicial de bienvenida si no hay mensajes */}
            {chatMessages.length === 0 && (
              <div className="text-center py-6 px-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/nexo-orb.png"
                  alt="Nexo"
                  width={44}
                  height={44}
                  className="rounded-full mx-auto mb-3 block"
                  style={{ animation: 'nexo-float 3s ease-in-out infinite' }}
                />
                <h3 className="text-[15px] font-bold text-slate-900 mb-1">
                  ¿En qué puedo ayudarte hoy?
                </h3>
                <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto leading-relaxed">
                  Analizo métricas en vivo, quiebres inminentes de stock y ejecuto acciones auditadas.
                </p>

                {/* Chips de sugerencias interactivas */}
                <div className="flex flex-col gap-2 max-w-sm mx-auto">
                  {[
                    '¿Qué productos están por quebrar?',
                    '¿Cuánto capital de trabajo necesito financiar?',
                    'Generar orden de compra para stock crítico',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => sendChatMessage(chip)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 text-left cursor-pointer hover:bg-blue-50/80 hover:border-blue-200 transition-colors flex items-center justify-between"
                    >
                      <span className="truncate">{chip}</span>
                      <ChevronRight size={13} className="text-slate-400 flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Historial de Mensajes: Mapeo del array con burbujas minimalistas */}
            {chatMessages.map((msg) => {
              // 1. Mensaje del Usuario (Alineado a la derecha, sin gradientes, tono gris neutro corporativo)
              if (msg.role === 'user') {
                return (
                  <div
                    key={msg.id}
                    className="self-end max-w-[85%] bg-slate-100 text-slate-900 border border-slate-200/80 rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13px] leading-relaxed break-words shadow-sm ml-auto"
                  >
                    {msg.content}
                  </div>
                );
              }

              // 2. Mensaje del Asistente Nexo (Alineado a la izquierda con Avatar azul corporativo)
              return (
                <div
                  key={msg.id}
                  className="self-start max-w-[92%] sm:max-w-[90%] bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm p-4 text-[13px] text-slate-800 space-y-2.5 mr-auto shadow-sm"
                >
                  {/* Header de la burbuja Nexo */}
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/nexo-orb.png"
                      alt=""
                      width={18}
                      height={18}
                      className="rounded-full object-contain flex-shrink-0"
                    />
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                      Nexo
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Contenido Markdown Renderizado */}
                  <div className="pt-0.5">
                    {renderMarkdown(msg.content)}
                  </div>

                  {/* Redirección automática sugerida */}
                  {msg.toolCall?.route && (
                    <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ExternalLink size={14} className="text-blue-600 flex-shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            Módulo sugerido
                          </div>
                          <div className="text-[11px] text-blue-600 truncate">{msg.toolCall.route}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => executeNavigation(msg.toolCall!.route!)}
                        className="bg-blue-600 text-white border-0 rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer hover:bg-blue-700 flex-shrink-0 transition-colors"
                      >
                        Ir ahora →
                      </button>
                    </div>
                  )}

                  {/* Generative UI Cards (Stock Crítico, Financiamiento, Órdenes Reales) */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {msg.cards.map((card) => {
                        const isActionRunning = executingActionId === card.id;
                        const isActionDone = actionSuccessId === card.id;

                        return (
                          <div
                            key={card.id}
                            className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <div className="text-[13px] font-semibold text-slate-900 truncate">
                                  {card.title}
                                </div>
                                {card.subtitle && (
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {card.subtitle}
                                  </div>
                                )}
                              </div>
                              {card.metric && (
                                <div className="text-sm font-bold text-blue-600 font-mono flex-shrink-0">
                                  {card.metric}
                                </div>
                              )}
                            </div>

                            {/* Botón de Acción Transaccional */}
                            {card.action && (
                              <div className="mt-2 flex gap-2">
                                <button
                                  type="button"
                                  disabled={isActionRunning || isActionDone}
                                  onClick={() => handleExecuteCardAction(card, card.action!)}
                                  className={`border-0 rounded-md px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                                    isActionDone
                                      ? 'bg-emerald-600 text-white cursor-default'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                                  }`}
                                >
                                  {isActionRunning && <Loader2 size={12} className="animate-spin" />}
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

            {/* Indicador de Análisis Progresivo (Streaming activo) */}
            {isLoading && (
              <div className="self-start flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-blue-600 mr-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/nexo-orb.png" alt="" width={15} height={15} className="rounded-full object-contain" />
                <span>Nexo está procesando métricas en vivo...</span>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER: Barra de estado y atajos ────────────────────────── */}
        <div className="px-4 py-2.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 rounded-b-none sm:rounded-b-2xl flex-shrink-0 pb-[max(0.6rem,env(safe-area-inset-bottom))]">
          {/* Shortcuts Info */}
          <div className="hidden sm:flex gap-3.5 items-center">
            {!isChatMode ? (
              <>
                <span className="flex items-center gap-1">
                  <ArrowUp size={11} /><ArrowDown size={11} /> Navegar
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft size={11} /> Abrir
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-mono">esc</span> Cerrar
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <CornerDownLeft size={11} /> Enviar
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[10px] font-mono">esc</span> Volver
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="text-[9px] bg-slate-200/80 px-1 py-0.5 rounded">Tab</kbd> Modo Navegación
                </span>
              </>
            )}
          </div>

          {/* Versión móvil de atajos */}
          <div className="sm:hidden flex items-center gap-2 text-[10px] text-slate-400">
            {isChatMode ? (
              <span>Presiona <strong>Enviar</strong> para consultar</span>
            ) : (
              <span>Toca cualquier opción para ingresar</span>
            )}
          </div>

          {/* Right Brand Badge: Orb + Nexo */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nexo-orb.png"
              alt="Nexo"
              width={16}
              height={16}
              className="rounded-full object-contain"
            />
            <span className="font-semibold text-blue-600">
              {isChatMode ? 'Nexo Copilot' : 'Nexo'}
            </span>
          </div>
        </div>
      </div>

      {/* 
        Estilos Scoped para animaciones y compatibilidad garantizada en Next.js
        Garantiza Drawer en < 640px / < 768px y Modal centrado en Desktop
      */}
      <style>{`
        @keyframes nexo-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes nexo-drawer-up {
          from { transform: translateY(100%); opacity: 0.8; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes nexo-modal-in {
          from { transform: translateY(-12px) scale(0.97); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @media (max-width: 639px) {
          .nexo-container {
            animation: nexo-drawer-up 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
        }
        @media (min-width: 640px) {
          .nexo-container {
            animation: nexo-modal-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
        }
      `}</style>
    </div>
  );
}

export { NexoChatInterface } from './NexoChatInterface';
export default NexoCommandPalette;
