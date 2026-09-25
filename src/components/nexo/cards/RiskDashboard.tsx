import React from 'react';
import { Package, TrendingDown, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

interface RiskItem {
  sku: string;
  name: string;
  coverageDays: number;
  stock: number;
}

interface RiskDashboardProps {
  data: RiskItem[];
  title?: string;
}

export function RiskDashboard({ data, title = "Análisis de Quiebre de Stock" }: RiskDashboardProps) {
  // Transformar datos para el gráfico
  const chartData = data.slice(0, 5).map(d => ({
    name: d.sku,
    dias: d.coverageDays,
    riesgo: d.coverageDays < 4 ? 'Critico' : 'Advertencia'
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 my-2 w-full shadow-lg"
    >
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown size={16} className="text-red-400" />
        <h4 className="text-[13px] font-semibold text-slate-100">{title}</h4>
      </div>

      <div className="h-40 w-full mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip 
              cursor={{ fill: '#334155', opacity: 0.4 }}
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#f1f5f9' }}
            />
            <Bar dataKey="dias" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.dias < 4 ? '#ef4444' : '#f59e0b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.slice(0, 3).map((item, idx) => (
          <div key={idx} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2 min-w-0">
              <Package size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-[11px] font-medium text-slate-200 truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-mono text-slate-400">{item.stock} u.</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${item.coverageDays < 4 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {item.coverageDays < 4 && <AlertTriangle size={10} />}
                {item.coverageDays}d
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
