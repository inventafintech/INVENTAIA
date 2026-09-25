'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Send,
  X,
  RotateCcw,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Package,
  ShoppingCart,
  Wallet,
  Info,
  Link as LinkIcon,
  BarChart,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiskDashboard } from './cards/RiskDashboard';
import { POApprovalCard } from './cards/POApprovalCard';

// ─── Interfaces ────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'nexo';
  content: string;
  timestamp: string;
  thinkingSteps?: Array<{
    id: string;
    text: string;
    status: 'pending' | 'success';
  }>;
  cards?: Array<{
    id: string;
    kind: 'sku' | 'oc' | 'financing' | 'connector' | 'info' | 'summary' | 'history' | 'dashboard' | 'po_approval';
    title: string;
    subtitle?: string;
    metric?: string;
    payload?: any;
    action?: {
      type: 'generate_oc' | 'request_disbursement' | 'navigate';
      label: string;
      payload: Record<string, any>;
      requiresConfirm: boolean;
    };
  }>;
  toolCall?: {
    route?: string;
    reason?: string;
    destination_intent?: string;
  };
}

// ─── Helpers Visuales ──────────────────────────────────────────────────
function getCardIcon(kind: string) {
  switch (kind) {
    case 'sku': return <Package size={14} className="text-blue-600" />;
    case 'oc': return <ShoppingCart size={14} className="text-emerald-600" />;
    case 'financing': return <Wallet size={14} className="text-indigo-600" />;
    case 'connector': return <LinkIcon size={14} className="text-orange-600" />;
    case 'summary': return <BarChart size={14} className="text-purple-600" />;
    case 'history': return <Clock size={14} className="text-slate-500" />;
    case 'info':
    default:
      return <Info size={14} className="text-slate-400" />;
  }
}

// ─── Sugerencias Iniciales Rápidas ─────────────────────────────────────
const INITIAL_PROMPTS = [
  '¿Qué productos están por quebrar?',
  '¿Cuánto capital de trabajo necesito?',
  'Generar orden de compra para stock crítico',
];

// ─── Markdown Inline Parser Ligero ────────────────────────────────────
function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="flex flex-col gap-1 text-[13px] leading-relaxed break-words text-slate-800 dark:text-slate-200 font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-0.5" />;

        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          return (
            <div key={idx} className="font-bold text-slate-900 dark:text-slate-100 text-[13.5px] mt-1 mb-0.5">
              {renderFormattedInline(trimmed.replace(/^#+\s*/, ''))}
            </div>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-•*]\s*/, '');
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5">
              <span className="text-blue-600 font-bold leading-5">•</span>
              <span className="flex-1">{renderFormattedInline(content)}</span>
            </div>
          );
        }

        return <p key={idx} className="m-0">{renderFormattedInline(line)}</p>;
      })}
    </div>
  );
}

function renderFormattedInline(str: string): React.ReactNode {
  const parts = str.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return <strong key={i} className="text-slate-950 dark:text-white font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className="bg-slate-100 dark:bg-slate-800 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded text-xs font-mono font-medium">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return <em key={i} className="italic text-slate-700 dark:text-slate-300">{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// ─── Tabla Generativa: arrays JSON de productos → <table> visual ────────
function ProductTable({ items }: { items: Array<Record<string, any>> }) {
  const rows = items.slice(0, 8);
  const covOf = (p: Record<string, any>): number =>
    Number(p.coverageDays ?? p.cobertura ?? 0);
  return (
    <div className="w-full max-w-full overflow-x-auto rounded-lg border border-slate-200/80 dark:border-slate-700">
      <table className="w-full min-w-[320px] border-collapse text-xs">
        <caption className="text-left font-bold text-slate-900 dark:text-slate-100 px-2.5 py-2 border-b border-slate-200/80 dark:border-slate-700">
          Detalle por producto
        </caption>
        <thead>
          <tr>
            <th scope="col" className="text-left px-2.5 py-2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 whitespace-nowrap">SKU</th>
            <th scope="col" className="text-left px-2.5 py-2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 whitespace-nowrap">Producto</th>
            <th scope="col" className="text-left px-2.5 py-2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 whitespace-nowrap">Stock</th>
            <th scope="col" className="text-left px-2.5 py-2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 whitespace-nowrap">Cobertura</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const cov = covOf(p);
            return (
              <tr key={String(p.sku ?? p.id ?? i)} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td className="px-2.5 py-2 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{String(p.sku ?? '—')}</td>
                <td className="px-2.5 py-2 text-slate-800 dark:text-slate-200 break-words">{String(p.name ?? p.producto ?? '—')}</td>
                <td className="px-2.5 py-2 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">{p.stock ?? p.currentStock ?? '—'} u</td>
                <td className={`px-2.5 py-2 font-mono font-bold whitespace-nowrap ${cov < 3.5 ? 'text-red-700 dark:text-red-300' : cov <= 7 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  {cov}d
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function cardHasTable(card: NonNullable<ChatMessage['cards']>[number]): Array<Record<string, any>> | null {
  const items = card.payload?.items ?? card.payload?.products ?? card.payload?.skus ?? card.payload?.lines;
  return Array.isArray(items) && items.length > 0 ? items : null;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: NexoChat
// ═══════════════════════════════════════════════════════════════════════

export function NexoChat() {
  const router = useRouter();
  const pathname = usePathname() || '';

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [actionSuccessId, setActionSuccessId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll suave anclado al fondo
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('auto');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen, scrollToBottom]);

  // Atajo global Cmd+K / Ctrl+K y Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = navigator.platform.toUpperCase().includes('MAC') ? e.metaKey : e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Limpiar historial de chat
  const handleClearChat = useCallback(() => {
    setMessages([]);
    setInput('');
  }, []);

  // Enviar mensaje e interactuar con la API
  const sendMessage = useCallback(async (textToSend?: string) => {
    const text = (textToSend ?? input).trim();
    if (!text || isLoading) return;

    setInput('');
    setIsLoading(true);

    const userMessageId = `user-${Date.now()}`;
    const nexoMessageId = `nexo-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newHistory: ChatMessage[] = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        content: text,
        timestamp,
      },
      {
        id: nexoMessageId,
        role: 'nexo',
        content: '',
        timestamp,
      },
    ];

    setMessages(newHistory);

    try {
      // Inyectar el historial completo de mensajes anteriores para memoria de sesión fluida
      const apiMessages = newHistory.slice(0, -1).map((m) => ({
        role: m.role === 'nexo' ? 'assistant' : 'user',
        content: m.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          pathname,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No readable stream');

      const decoder = new TextDecoder();
      let streamedContent = '';
      let detectedToolRoute: string | undefined;
      let detectedCards: any[] = [];
      let currentThinkingSteps: NonNullable<ChatMessage['thinkingSteps']> = [];

      const getThinkingText = (toolName: string) => {
        const dictionary: Record<string, string> = {
          analyze_stock_risk: 'Analizando riesgo logístico e inventario...',
          calculate_financing: 'Consultando proyecciones de capital y tasas...',
          navigate_platform: 'Enrutando hacia módulo estratégico...',
          approve_purchase_orders: 'Orquestando generación de órdenes...',
          generative_cards: 'Compilando micro-aplicaciones en UI...',
        };
        return dictionary[toolName] || `Ejecutando proceso: ${toolName}...`;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          // Protocolo Vercel AI SDK DataStream: 0: texto chunk
          if (line.startsWith('0:')) {
            try {
              const textPiece = JSON.parse(line.slice(2));
              streamedContent += textPiece;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === nexoMessageId ? { ...msg, content: streamedContent } : msg
                )
              );
            } catch {
              /* ignore */
            }
          }

          // 9: Invocación de tool (Inicio del Razonamiento Visible)
          if (line.startsWith('9:')) {
            try {
              const toolData = JSON.parse(line.slice(2));
              
              currentThinkingSteps = [
                ...currentThinkingSteps,
                { id: toolData.toolCallId, text: getThinkingText(toolData.toolName), status: 'pending' }
              ];
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === nexoMessageId ? { ...msg, thinkingSteps: currentThinkingSteps } : msg
                )
              );

              if (toolData.toolName === 'navigate_platform' && toolData.args?.route) {
                detectedToolRoute = toolData.args.route;
              }
            } catch {
              /* ignore */
            }
          }

          // a: Resultado de tool (Fin del Razonamiento Visible)
          if (line.startsWith('a:')) {
            try {
              const toolResult = JSON.parse(line.slice(2));
              
              currentThinkingSteps = currentThinkingSteps.map(step => 
                step.id === toolResult.toolCallId ? { ...step, status: 'success' } : step
              );
              
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === nexoMessageId ? { ...msg, thinkingSteps: currentThinkingSteps } : msg
                )
              );

              if (Array.isArray(toolResult.result?.cards)) {
                detectedCards = toolResult.result.cards;
              }
              if (toolResult.result?.route) {
                detectedToolRoute = toolResult.result.route;
              }
            } catch {
              /* ignore */
            }
          }
        }
      }

      // Actualizar mensaje con el contenido y tarjetas finales
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === nexoMessageId) {
            return {
              ...msg,
              content: streamedContent || 'He procesado tu solicitud sobre las métricas actuales.',
              cards: detectedCards.length > 0 ? detectedCards : msg.cards,
              toolCall: detectedToolRoute ? { route: detectedToolRoute } : undefined,
            };
          }
          return msg;
        })
      );

      // Redirección si el usuario solicitó navegar expresamente
      if (detectedToolRoute && /^(ir|vamos|lleva|abre|ve a)/i.test(text)) {
        setTimeout(() => {
          setIsOpen(false);
          router.push(detectedToolRoute!);
        }, 350);
      }
    } catch (err) {
      console.error('Error enviando mensaje a Nexo:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === nexoMessageId
            ? { ...msg, content: 'Lo siento, ocurrió un error al consultar las métricas.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, pathname, router]);

  // Ejecución silenciosa de acciones interactivas de las tarjetas
  const handleExecuteCardAction = async (cardId: string, action?: NonNullable<ChatMessage['cards']>[number]['action']) => {
    if (!action) return;

    if (action.type === 'navigate' && action.payload?.href) {
      setIsOpen(false);
      router.push(action.payload.href);
      return;
    }

    setExecutingActionId(cardId);
    try {
      if (action.type === 'generate_oc') {
        const res = await fetch('/api/reorder-alerts/approve-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds: action.payload?.itemIds || [] }),
        });
        if (!res.ok) throw new Error('Error al aprobar orden');

        setActionSuccessId(cardId);
        // Mensaje silencioso de confirmación en el chat
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [
          ...prev,
          {
            id: `nexo-confirm-${Date.now()}`,
            role: 'nexo',
            content: 'Hecho. Orden generada en borrador.',
            timestamp,
          },
        ]);
      } else if (action.type === 'request_disbursement') {
        const res = await fetch('/api/financing/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: action.payload?.amount || 15000,
            termDays: action.payload?.termDays || 30,
          }),
        });
        if (!res.ok) throw new Error('Error al solicitar anticipo');

        setActionSuccessId(cardId);
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages((prev) => [
          ...prev,
          {
            id: `nexo-confirm-${Date.now()}`,
            role: 'nexo',
            content: 'Hecho. Solicitud de anticipo enviada a evaluación.',
            timestamp,
          },
        ]);
      }
    } catch (e: any) {
      console.error('Error al ejecutar acción:', e);
    } finally {
      setExecutingActionId(null);
    }
  };

  return (
    <>
      {/* ── BOTÓN FLOTANTE (LAUNCHER EN ESQUINA INFERIOR DERECHA) ─────── */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Abrir asistente Nexo"
        aria-expanded={isOpen}
        title="Abrir Nexo Copilot (Ctrl+K)"
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full p-0 border-0 bg-transparent cursor-pointer transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none ${
          isOpen ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100 shadow-xl'
        }`}
      >
        <div className="relative w-full h-full rounded-full flex items-center justify-center bg-white shadow-lg border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nexo-orb.png"
            alt="Nexo"
            width={52}
            height={52}
            className="rounded-full object-contain pointer-events-none"
            style={{ animation: 'nexo-float 3s ease-in-out infinite' }}
          />
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
        </div>
      </button>

      {/* ── VENTANA DE CHAT CONVERSACIONAL ───────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 flex flex-col justify-end pointer-events-auto">
            {/* Backdrop en móviles para cerrar al tocar afuera */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="sm:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setIsOpen(false)}
            />

            {/* Contenedor del Chat: Drawer en mobile y tarjeta flotante en desktop */}
            <motion.div 
              layout
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ 
                type: 'spring', 
                damping: 25, 
                stiffness: 300, 
                mass: 0.8 
              }}
              className="relative w-full sm:w-[440px] md:w-[460px] h-[85dvh] sm:h-[580px] max-h-[85dvh] sm:max-h-[min(580px,calc(100dvh-3.5rem))] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-700 flex flex-col overflow-hidden font-sans z-10"
            >
              
              {/* ── HEADER DEL CHAT ────────────────────────────────────── */}
              <motion.div layout="position" className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between flex-shrink-0 z-20 relative">
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-full flex items-center justify-center bg-white border border-slate-200 shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/nexo-orb.png"
                    alt="Nexo"
                    width={26}
                    height={26}
                    className="rounded-full object-contain"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div>
                  <div className="text-[13.5px] font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                    <span>Nexo</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-full font-semibold border border-blue-200/60">
                      Copilot
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                    <span>En línea · INVENTA.AI</span>
                  </div>
                </div>
              </div>

              {/* Acciones de la cabecera */}
              <div className="flex items-center gap-1 text-slate-400">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    title="Limpiar conversación"
                    aria-label="Limpiar conversación"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Cerrar (Esc)"
                  aria-label="Cerrar chat"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
                >
                  <X size={17} />
                </button>
              </div>
              </motion.div>

            {/* ── ÁREA DE MENSAJES (HISTORIAL SCROLLABLE CON MIN-H-0) ──── */}
            <div
              ref={chatScrollRef}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-3 bg-slate-50/40"
            >
              {/* Estado de bienvenida cuando no hay mensajes */}
              {messages.length === 0 && (
                <div className="text-center py-6 px-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/nexo-orb.png"
                      alt="Nexo"
                      width={34}
                      height={34}
                      className="rounded-full object-contain"
                      style={{ animation: 'nexo-float 3s ease-in-out infinite' }}
                    />
                  </div>
                  <h3 className="text-[14.5px] font-bold text-slate-900 mb-1">
                    ¡Hola! Soy Nexo, tu copiloto operativo.
                  </h3>
                  <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto leading-relaxed">
                    Pregúntame sobre quiebres de stock, reposición o escribe una acción directa.
                  </p>

                  {/* Chips interactivos de sugerencias */}
                  <div className="flex flex-col gap-2 max-w-xs mx-auto">
                    {INITIAL_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        className="px-3 py-2 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-200 rounded-xl text-xs text-slate-700 hover:text-blue-950 text-left transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
                      >
                        <span className="truncate">{prompt}</span>
                        <ChevronRight
                          size={13}
                          className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-1.5"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensajes del Historial */}
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  // 1. Mensaje del Usuario (Alineado a la derecha, tono corporativo)
                  if (msg.role === 'user') {
                    return (
                      <motion.div 
                        layout="position"
                        initial={{ opacity: 0, y: 15, scale: 0.95, originX: 1, originY: 1 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        key={msg.id} 
                        className="flex justify-end"
                      >
                        <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-[13px] leading-relaxed shadow-xs break-words">
                          {msg.content}
                        </div>
                      </motion.div>
                    );
                  }

                  // 2. Mensaje de Nexo (Alineado a la izquierda con Avatar)
                  return (
                    <motion.div 
                      layout="position"
                      initial={{ opacity: 0, y: 15, scale: 0.95, originX: 0, originY: 1 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      key={msg.id} 
                      className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[90%]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/nexo-orb.png"
                        alt=""
                        width={22}
                        height={22}
                        className="rounded-full object-contain flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <motion.div layout="position" aria-live="polite" className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-2xl rounded-tl-xs p-3 text-[13px] text-slate-800 dark:text-slate-200 shadow-2xs space-y-2">
                          
                          {/* ── INTERFAZ DE RAZONAMIENTO VISIBLE (THINKING STEPS) ── */}
                          {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
                            <motion.div 
                              layout="position"
                              className="mb-3 space-y-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-2.5"
                              role="status"
                            >
                              <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 pl-1 flex items-center gap-1.5">
                                <Sparkles size={10} className="text-blue-500" />
                                Cadena de Razonamiento
                              </div>
                              <AnimatePresence>
                                {msg.thinkingSteps.map((step) => (
                                  <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, height: 0, x: -5 }}
                                    animate={{ opacity: 1, height: 'auto', x: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-center gap-2 text-[11.5px] font-medium"
                                  >
                                    {step.status === 'pending' ? (
                                      <Loader2 size={13} className="text-blue-600 animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={13} className="text-emerald-500" />
                                    )}
                                    <span className={step.status === 'pending' ? 'text-blue-800' : 'text-slate-600'}>
                                      {step.text}
                                    </span>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </motion.div>
                          )}

                          {/* Contenido Markdown Renderizado */}
                          <motion.div layout="position">
                            {renderMarkdown(msg.content)}
                          </motion.div>

                          {/* Redirección automática sugerida */}
                          {msg.toolCall?.route && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }} 
                              animate={{ opacity: 1, height: 'auto' }} 
                              className="p-2.5 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between gap-2 mt-1"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <ExternalLink size={13} className="text-blue-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {msg.toolCall.route}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsOpen(false);
                                  router.push(msg.toolCall!.route!);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-2.5 py-1 text-[11px] font-semibold cursor-pointer transition-colors flex-shrink-0"
                              >
                                Ir →
                              </button>
                            </motion.div>
                          )}

                          {/* Micro-tarjetas Generativas */}
                          {msg.cards && msg.cards.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0 }} 
                              animate={{ opacity: 1 }}
                              className="space-y-2 mt-2 pt-2 border-t border-slate-200/60"
                            >
                              {msg.cards.map((card) => {
                                const isRunning = executingActionId === card.id;
                                const isDone = actionSuccessId === card.id;

                                // --- Renderizado de Componentes UI Complejos ---
                                if (card.kind === 'dashboard') {
                                  return (
                                    <div key={card.id}>
                                      <RiskDashboard data={card.payload?.items || []} title={card.title} />
                                    </div>
                                  );
                                }

                                if (card.kind === 'po_approval') {
                                  return (
                                    <div key={card.id}>
                                      <POApprovalCard 
                                        cardId={card.id}
                                        title={card.title}
                                        skusCount={card.payload?.skusCount || 0}
                                        totalInvestment={card.payload?.totalInvestment || 0}
                                        onApprove={async (id) => {
                                          if (card.action) {
                                            await handleExecuteCardAction(id, card.action);
                                          }
                                        }}
                                        status={isRunning ? 'loading' : isDone ? 'success' : 'idle'}
                                      />
                                    </div>
                                  );
                                }

                                // --- Fallback a Tarjeta Estándar (con tabla si hay array) ---
                                const tableItems = cardHasTable(card);
                                return (
                                  <motion.div
                                    layout
                                    key={card.id}
                                    className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 shadow-xs hover:shadow-sm transition-all duration-200 text-xs flex flex-col gap-2 relative overflow-hidden"
                                  >
                                    {/* Efecto de carga en fondo */}
                                    {isRunning && (
                                      <div className="absolute inset-0 bg-blue-50/50 backdrop-blur-[1px] z-0 animate-pulse" />
                                    )}
                                    
                                    <div className="flex justify-between items-start gap-2 relative z-10">
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <div className="mt-0.5 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex-shrink-0">
                                          {getCardIcon(card.kind)}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate text-[12.5px]">
                                            {card.title}
                                          </div>
                                          {card.subtitle && (
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                              {card.subtitle}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      {card.metric && (
                                        <div className="font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700 font-mono text-[11px] flex-shrink-0">
                                          {card.metric}
                                        </div>
                                      )}
                                    </div>

                                    {tableItems && <ProductTable items={tableItems} />}

                                    {card.action && (
                                      <div className="mt-1 relative z-10 border-t border-slate-100 pt-2 flex justify-end">
                                        <button
                                          type="button"
                                          disabled={isRunning || isDone}
                                          onClick={() => handleExecuteCardAction(card.id, card.action)}
                                          className={`rounded-lg px-3.5 py-1.5 text-[11.5px] font-semibold inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs ${
                                            isDone
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                              : 'bg-slate-900 hover:bg-blue-600 text-white border border-transparent hover:shadow-blue-500/20'
                                          }`}
                                        >
                                          {isRunning && <Loader2 size={12} className="animate-spin" />}
                                          {isDone && <CheckCircle2 size={12} className="text-emerald-600" />}
                                          <span>{isDone ? 'Completado exitosamente' : card.action.label}</span>
                                        </button>
                                      </div>
                                    )}
                                  </motion.div>
                                );
                              })}
                            </motion.div>
                          )}
                        </motion.div>

                        {/* Timestamp sutil */}
                        <motion.div layout="position" className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 pl-1">
                          {msg.timestamp}
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Indicador de escritura animado (Typing Indicator con 3 puntos rebotando) */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                    className="flex items-center gap-2 self-start mr-auto mt-1"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/nexo-orb.png"
                      alt="Nexo"
                      width={20}
                      height={20}
                      className="rounded-full object-contain flex-shrink-0"
                    />
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl rounded-tl-xs px-3.5 py-2.5 flex items-center gap-1.5 shadow-2xs">
                      <motion.span
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                        className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                      />
                      <motion.span
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                        className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                      />
                      <motion.span
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                        className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* ── FOOTER: INPUT ANCLADO EN LA PARTE INFERIOR (STICKY) ───── */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-700 flex flex-col gap-1.5 flex-shrink-0 sticky bottom-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregunta a Nexo o escribe una acción..."
                  autoComplete="off"
                  disabled={isLoading}
                  enterKeyHint="send"
                  aria-label="Escribe tu consulta para Nexo"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-sans shadow-2xs"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Enviar mensaje"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer ${
                    input.trim() && !isLoading
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={14} />
                </button>
              </form>

              <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
                <span className="hidden sm:inline">Enter para enviar · Esc para cerrar</span>
                <span className="sm:hidden">Presiona Enviar</span>
                <span className="font-semibold text-blue-600 flex items-center gap-1">
                  <Sparkles size={10} /> INVENTA.AI
                </span>
              </div>
            </div>
          </motion.div>
        </div>
        )}
      </AnimatePresence>

      {/* Animación flotante global */}
      <style>{`
        @keyframes nexo-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </>
  );
}

export default NexoChat;
