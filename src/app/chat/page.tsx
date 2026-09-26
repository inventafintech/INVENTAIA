'use client';
import { useChat } from 'ai/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { InventoryCard } from '@/components/ui/InventoryCard';
import { TrendAnalysisCard } from '@/components/ui/TrendAnalysisCard';

export default function NexoChatContainer() {
  const currentPath = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, input, handleInputChange, handleSubmit } = useChat({ 
    api: '/api/chat',
    body: { currentPath }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="fixed inset-0 sm:static flex flex-col h-[100dvh] sm:h-screen bg-neutral-50 overflow-hidden text-base">
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none p-4 space-y-6 pb-24">
        {messages.map(m => (
          <div key={m.id} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            {m.content && (
              <div className={`inline-block p-3 rounded-2xl max-w-[90%] sm:max-w-[75%] shadow-sm ${
                m.role === 'user' ? 'bg-black text-white' : 'bg-white border border-neutral-100 text-neutral-800'
              }`}>
                {m.content}
              </div>
            )}
            
            {m.toolInvocations?.map(tool => {
              if (tool.toolName === 'get_inventory_status' && 'result' in tool) {
                return (
                  <div key={tool.toolCallId} className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <InventoryCard items={tool.result.data} insight={tool.result.insight} />
                  </div>
                );
              }
              if (tool.toolName === 'analyze_sales_trend' && 'result' in tool) {
                return (
                  <div key={tool.toolCallId} className="mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <TrendAnalysisCard result={tool.result} />
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
            value={input}
            placeholder="Analizar datos..."
            onChange={handleInputChange}
          />
          <button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-black text-white rounded-full flex items-center justify-center hover:bg-neutral-800 transition-transform active:scale-95">
            ↗
          </button>
        </form>
      </div>
    </div>
  );
}
