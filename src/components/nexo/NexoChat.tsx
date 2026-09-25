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
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'nexo';
  content: string;
  timestamp: string;
  cards?: Array<{
    id: string;
    kind: 'sku' | 'oc' | 'financing' | 'connector' | 'info' | 'summary' | 'history';
    title: string;
    subtitle?: string;
    metric?: string;
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
    <div className="flex flex-col gap-1 text-[13px] leading-relaxed break-words text-slate-800 font-sans">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-0.5" />;

        if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
          return (
            <div key={idx} className="font-bold text-slate-900 text-[13.5px] mt-1 mb-0.5">
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
      return <strong key={i} className="text-slate-950 font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={i} className="bg-slate-100 text-blue-700 px-1 py-0.5 rounded text-xs font-mono font-medium">
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

          // 9: Invocación de tool
          if (line.startsWith('9:')) {
            try {
              const toolData = JSON.parse(line.slice(2));
              if (toolData.toolName === 'navigate_platform' && toolData.args?.route) {
                detectedToolRoute = toolData.args.route;
              }
            } catch {
              /* ignore */
            }
          }

          // a: Resultado de tool (tarjetas generativas)
          if (line.startsWith('a:')) {
            try {
              const toolResult = JSON.parse(line.slice(2));
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
      {isOpen && (
        <div className="fixed inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 flex flex-col justify-end pointer-events-auto">
          {/* Backdrop en móviles para cerrar al tocar afuera */}
          <div
            className="sm:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Contenedor del Chat: Drawer en mobile y tarjeta flotante en desktop */}
          <div className="relative w-full sm:w-[440px] md:w-[460px] h-[85dvh] sm:h-[580px] max-h-[85dvh] sm:max-h-[min(580px,calc(100dvh-3.5rem))] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden font-sans z-10 transition-all duration-200">
            
            {/* ── HEADER DEL CHAT ────────────────────────────────────── */}
            <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
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
            </div>

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
              {messages.map((msg) => {
                // 1. Mensaje del Usuario (Alineado a la derecha, tono corporativo)
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-[13px] leading-relaxed shadow-xs break-words">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                // 2. Mensaje de Nexo (Alineado a la izquierda con Avatar)
                return (
                  <div key={msg.id} className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[90%]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/nexo-orb.png"
                      alt=""
                      width={22}
                      height={22}
                      className="rounded-full object-contain flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-3 text-[13px] text-slate-800 shadow-2xs space-y-2">
                        {/* Contenido Markdown Renderizado */}
                        <div>{renderMarkdown(msg.content)}</div>

                        {/* Redirección automática sugerida */}
                        {msg.toolCall?.route && (
                          <div className="p-2.5 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between gap-2 mt-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ExternalLink size={13} className="text-blue-600 flex-shrink-0" />
                              <span className="text-xs font-semibold text-slate-800 truncate">
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
                          </div>
                        )}

                        {/* Micro-tarjetas Generativas */}
                        {msg.cards && msg.cards.length > 0 && (
                          <div className="space-y-1.5 mt-2 pt-1 border-t border-slate-200/60">
                            {msg.cards.map((card) => {
                              const isRunning = executingActionId === card.id;
                              const isDone = actionSuccessId === card.id;

                              return (
                                <div
                                  key={card.id}
                                  className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 shadow-2xs text-xs"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="min-w-0">
                                      <div className="font-semibold text-slate-900 truncate">
                                        {card.title}
                                      </div>
                                      {card.subtitle && (
                                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                          {card.subtitle}
                                        </div>
                                      )}
                                    </div>
                                    {card.metric && (
                                      <div className="font-bold text-blue-600 font-mono text-xs flex-shrink-0">
                                        {card.metric}
                                      </div>
                                    )}
                                  </div>

                                  {card.action && (
                                    <div className="mt-2">
                                      <button
                                        type="button"
                                        disabled={isRunning || isDone}
                                        onClick={() => handleExecuteCardAction(card.id, card.action)}
                                        className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                          isDone
                                            ? 'bg-emerald-600 text-white cursor-default'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                      >
                                        {isRunning && <Loader2 size={11} className="animate-spin" />}
                                        {isDone && <CheckCircle2 size={11} />}
                                        <span>{isDone ? 'Completado' : card.action.label}</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Timestamp sutil */}
                      <div className="text-[10px] text-slate-400 mt-1 pl-1">
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Indicador de escritura animado (Typing Indicator con 3 puntos rebotando) */}
              {isLoading && (
                <div className="flex items-center gap-2 self-start mr-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/nexo-orb.png"
                    alt="Nexo"
                    width={20}
                    height={20}
                    className="rounded-full object-contain flex-shrink-0"
                  />
                  <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-3.5 py-2.5 flex items-center gap-1.5 shadow-2xs">
                    <span
                      className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDuration: '0.9s', animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDuration: '0.9s', animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDuration: '0.9s', animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── FOOTER: INPUT ANCLADO EN LA PARTE INFERIOR (STICKY) ───── */}
            <div className="p-3 bg-white border-t border-slate-200/80 flex flex-col gap-1.5 flex-shrink-0 sticky bottom-0 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                  className="flex-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-[13.5px] text-slate-900 outline-none transition-all placeholder:text-slate-400 font-sans shadow-2xs"
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
          </div>
        </div>
      )}

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
