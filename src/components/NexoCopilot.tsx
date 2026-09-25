"use client";

import { useChat } from "ai/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Terminal, TrendingDown, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function NexoCopilot() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  // HIBRIDACIÓN PERFECTA 1: Listener de Navegación Segura
  // QA Validado: El enrutamiento ocurre sin perder el estado de la conversación.
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant" && lastMessage.toolInvocations) {
      lastMessage.toolInvocations.forEach((tool) => {
        if (tool.toolName === "navigate_platform" && tool.state === "result") {
          const { route } = tool.result;
          router.push(route); // El chofer virtual entra en acción
        }
      });
    }
  }, [messages, router]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // HIBRIDACIÓN PERFECTA 2: Renderizado de Datos (Generative UI)
  const renderToolInvocation = (toolCallId: string, tool: any) => {
    // Si el LLM está llamando la herramienta, mostramos estado de carga (TTFB aparente = instantáneo)
    if (tool.state === "call") {
      return (
        <div key={toolCallId} className="my-2 flex items-center gap-2 text-slate-400 text-sm">
          <Loader2 className="w-3 h-3 animate-spin" />
          Consultando bases de datos...
        </div>
      );
    }

    // Si la herramienta retornó datos, inyectamos un gráfico en el chat
    if (tool.toolName === "analyze_stock_risk" && tool.state === "result") {
      return (
        <div key={toolCallId} className="my-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
          <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            Análisis de Inmovilización
          </h4>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tool.result}>
                <XAxis dataKey="sku" tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
                <Bar dataKey="currentStock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }
    
    // Feedback visual de navegación
    if (tool.toolName === "navigate_platform" && tool.state === "result") {
      return (
        <div key={toolCallId} className="my-2 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg text-blue-400 text-sm flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          Te he redirigido a: {tool.result.route}
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Botón flotante para abrir/cerrar */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-xl flex items-center justify-center transition-all z-[60]"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Ventana de chat flotante */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[400px] h-[600px] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50">
          {/* Header Minimalista Vercel-style */}
          <div className="px-5 py-4 bg-slate-800/80 backdrop-blur border-b border-slate-700 flex justify-between items-center rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-sm font-medium text-slate-100">Nexo Copilot</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-200">
              Cerrar
            </button>
          </div>

          {/* Historial Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-sm text-slate-500 mt-10">
                Hola, soy Nexo. ¿Qué quieres analizar hoy?
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className="flex flex-col">
                {m.content && (
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user" ? "bg-blue-600 text-white self-end rounded-br-sm" 
                                      : "bg-slate-800 text-slate-200 self-start rounded-bl-sm whitespace-pre-wrap"
                  }`}>
                    {m.content}
                  </div>
                )}
                {/* Inyección de UI Generativa */}
                {m.toolInvocations?.map((tool) => renderToolInvocation(tool.toolCallId, tool))}
              </div>
            ))}
            {isLoading && messages[messages.length-1]?.role !== 'assistant' && (
              <div className="text-slate-500 flex items-center gap-2 text-sm">
                <Loader2 className="w-3 h-3 animate-spin" /> Analizando métricas...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de Comandos */}
          <form onSubmit={handleSubmit} className="p-4 bg-slate-800/50 border-t border-slate-700 rounded-b-2xl">
            <div className="relative flex items-center">
              <input
                className="w-full bg-slate-900 border border-slate-700 text-sm text-slate-200 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={input}
                placeholder="Ej: ¿Qué productos están inmovilizados?"
                onChange={handleInputChange}
              />
              <button type="submit" disabled={isLoading || !input.trim()} className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
