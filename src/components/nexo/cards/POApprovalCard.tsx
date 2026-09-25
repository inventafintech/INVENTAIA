import React, { useState } from 'react';
import { ShoppingCart, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface POApprovalCardProps {
  cardId: string;
  title: string;
  skusCount: number;
  totalInvestment: number;
  onApprove: (id: string) => Promise<void>;
  status: 'idle' | 'loading' | 'success';
}

export function POApprovalCard({ cardId, title, skusCount, totalInvestment, onApprove, status }: POApprovalCardProps) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-xl p-3.5 my-2 w-full shadow-sm"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
            <ShoppingCart size={16} />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-slate-900 leading-tight">{title}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Acción requerida para evitar quiebre</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-2.5 flex items-center justify-between mb-3 border border-slate-100">
        <div>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">SKUs a comprar</div>
          <div className="text-[13px] font-bold text-slate-700">{skusCount} ítems</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Inversión Est.</div>
          <div className="text-[13px] font-bold text-emerald-600">S/ {totalInvestment.toLocaleString()}</div>
        </div>
      </div>

      <button
        onClick={() => onApprove(cardId)}
        disabled={status !== 'idle'}
        className={`w-full relative overflow-hidden rounded-lg py-2 px-4 text-[12px] font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
          status === 'success' 
            ? 'bg-emerald-500 text-white border-transparent' 
            : 'bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg'
        }`}
      >
        {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
        {status === 'success' && <CheckCircle2 size={14} />}
        {status === 'idle' && <ArrowRight size={14} />}
        
        <span>
          {status === 'idle' ? 'Aprobar Órdenes en Borrador' : 
           status === 'loading' ? 'Procesando...' : 
           'Órdenes Generadas'}
        </span>
      </button>
    </motion.div>
  );
}
