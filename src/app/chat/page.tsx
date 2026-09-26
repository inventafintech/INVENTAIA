'use client';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { InventoryCard } from '@/components/ui/InventoryCard';
import { TrendAnalysisCard } from '@/components/ui/TrendAnalysisCard';

export default function NexoChatContainer() {
  const currentPath = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({
      api: '/api/chat',
      body: { currentPath },
    }),
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || status === 'streaming') return;
    const text = inputValue;
    setInputValue('');
    await sendMessage({ text });
  };

  return (
    <div className="fixed inset-0 sm:static flex flex-col h-[100dvh] sm:h-screen bg-neutral-50 overflow-hidden text-base">
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none p-4 space-y-6 pb-24">
        {messages.map((m: UIMessage) => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            {m.parts.map((part, index) => {
              if (part.type === 'text' && part.text) {
                return (
                  <div key={index} className={`inline-block p-3 rounded-2xl max-w-[90%] sm:max-w-[75%] shadow-sm ${
                    m.role === 'user' ? 'bg-black text-white' : 'bg-white border border-neutral-100 text-neutral-800'
                  }`}>
                    {part.text}
                  </div>
                );
              }
              if (part.type === 'tool-invocation' && part.state === 'output-available') {
                const output = part.output as any;
                const toolName = (part as any).toolName;
                if (toolName === 'get_inventory_status') {
                  return (
                    <div key={index} className="mt-3">
                      <InventoryCard items={output.data} insight={output.insight} />
                    </div>
                  );
                }
                if (toolName === 'analyze_sales_trend') {
                  return (
                    <div key={index} className="mt-3">
                      <TrendAnalysisCard result={output} />
                    </div>
                  );
                }
              }
              if (part.type === 'tool-invocation' && (part.state === 'input-available' || part.state === 'input-streaming')) {
                return (
                  <div key={index} className="text-sm text-neutral-400 animate-pulse mt-2">
                    Consultando la base de datos...
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
      <div className="absolute sm:relative bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/80 backdrop-blur-md border-t border-neutral-200 pb-safe">
        <form onSubmit={handleSubmit} className="flex gap-2 relative max-w-3xl mx-auto">
          <input
            className="w-full p-3 sm:p-4 pl-4 border border-neutral-300 rounded-full bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all text-[16px]"
            value={inputValue}
            placeholder="Analizar datos..."
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button
            type="submit"
            disabled={status === 'streaming'}
            className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-black text-white rounded-full flex items-center justify-center hover:bg-neutral-800 transition-transform active:scale-95 disabled:opacity-50"
          >
            ↗
          </button>
        </form>
      </div>
    </div>
  );
}
