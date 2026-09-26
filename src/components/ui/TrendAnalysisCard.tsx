import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react'; 

export function TrendAnalysisCard({ result }: { result: any }) {
  const { productName, currentStock, analysis } = result;
  const isCritical = analysis.totalProjectedDemand > currentStock;

  return (
    <div className="w-full max-w-md bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden my-3">
      <div className="bg-neutral-900 text-white p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Proyección: {productName}
            </h3>
            <p className="text-neutral-400 text-sm mt-1">Próximos 7 días</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-400">Stock Actual</p>
            <p className="font-bold text-xl">{currentStock} und.</p>
          </div>
        </div>
      </div>
      <div className="p-4 bg-neutral-50 border-b border-neutral-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-neutral-500">Demanda Estimada</p>
            <p className="text-2xl font-bold text-neutral-800">{analysis.totalProjectedDemand} und.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-neutral-500">Crecimiento Diario</p>
            <p className="text-lg font-bold text-green-600">+{analysis.dailyGrowthRate}</p>
          </div>
        </div>
      </div>
      <div className={`p-4 ${isCritical ? 'bg-red-50' : 'bg-green-50'}`}>
        <div className="flex gap-3">
          {isCritical && <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />}
          <p className={`text-sm font-medium ${isCritical ? 'text-red-700' : 'text-green-700'}`}>
            {analysis.recommendation}
          </p>
        </div>
        {isCritical && (
          <button className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            Generar Orden de Compra Ahora
          </button>
        )}
      </div>
    </div>
  );
}
