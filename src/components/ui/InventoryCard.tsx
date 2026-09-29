
interface Product {
  id: string;
  name: string;
  stock: number;
  status: 'Óptimo' | 'Crítico' | string;
}

interface InventoryCardProps {
  items: Product[];
  insight?: string;
}

export function InventoryCard({ items, insight }: InventoryCardProps) {
  return (
    <div className="w-full max-w-sm bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden my-2 font-sans">
      <div className="bg-neutral-50 p-4 border-b border-neutral-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          <h3 className="text-sm font-semibold text-neutral-800">Análisis de Nexo</h3>
        </div>
        {insight && <p className="text-xs text-neutral-500">{insight}</p>}
      </div>
      <div className="p-2">
        <ul className="divide-y divide-neutral-100">
          {items.map((item) => (
            <li key={item.id} className="p-3 flex justify-between items-center hover:bg-neutral-50 rounded-lg transition-colors">
              <div>
                <p className="text-sm font-medium text-neutral-800">{item.name}</p>
                <p className="text-xs text-neutral-400">ID: {item.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-neutral-800">{item.stock} und.</p>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ${
                  item.status === 'Crítico' 
                    ? 'bg-red-100 text-red-600' 
                    : 'bg-green-100 text-green-600'
                }`}>
                  {item.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-3 border-t border-neutral-100 bg-neutral-50">
        <button className="w-full py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
          Solicitar Reposición Automática
        </button>
      </div>
    </div>
  );
}
