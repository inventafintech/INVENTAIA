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
    <div className="fixed inset-0 sm:static flex flex-col h-[100dvh] sm:h-screen overflow-hidden text-base" style={{ background: 'var(--color-paper)', color: 'var(--color-charcoal)' }}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none p-4 space-y-6 pb-24">
        {messages.map((m: UIMessage) => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            {m.parts.map((part, index) => {
              if (part.type === 'text' && part.text) {
                return (
                  <div key={index} className="inline-block p-3 max-w-[90%] sm:max-w-[75%] shadow-sm" style={m.role === 'user'
                    ? { background: 'var(--color-forest-ink)', color: 'var(--color-paper)', borderRadius: '10px' }
                    : { background: 'var(--color-paper)', border: '1px solid var(--color-fog)', color: 'var(--color-charcoal)', borderRadius: '10px' }}>
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
                  <div key={index} className="text-sm animate-pulse mt-2" style={{ color: 'var(--color-pebble)' }}>
                    Consultando la base de datos...
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>
      <div className="absolute sm:relative bottom-0 left-0 right-0 p-3 sm:p-4 backdrop-blur-md border-t pb-safe" style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'var(--color-fog)' }}>
        <form onSubmit={handleSubmit} className="flex gap-2 relative max-w-3xl mx-auto">
          <input
            className="w-full p-3 sm:p-4 pl-4 transition-all text-[16px]"
            style={{ border: '1px solid var(--color-pebble)', borderRadius: '9999px', background: 'var(--color-paper)', color: 'var(--color-charcoal)' }}
            value={inputValue}
            placeholder="Analizar datos..."
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button
            type="submit"
            disabled={status === 'streaming'}
            className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--color-lime-voltage)', color: 'var(--color-forest-ink)' }}
          >
            ↗
          </button>
        </form>
      </div>
    </div>
  );
}
