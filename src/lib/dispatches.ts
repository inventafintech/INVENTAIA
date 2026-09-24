export type DispatchType = 'venta' | 'traslado' | 'devolucion';
export type DispatchStatus = 'transito' | 'terminado';

export interface DispatchLine {
  productId: string;
  sku: string;
  name: string;
  qty: number;
}

export interface DispatchRecord {
  id: string;
  type: DispatchType;
  date: string;
  destination: string;
  clientRef: string | null;
  dispatchedBy: string;
  lines: DispatchLine[];
  totalQty: number;
  status: DispatchStatus;
  completedAt: string | null;
  note: string;
}

export const DISPATCH_TYPES: DispatchType[] = ['venta', 'traslado', 'devolucion'];

export const TYPE_LABEL: Record<DispatchType, string> = {
  venta: 'Venta',
  traslado: 'Traslado',
  devolucion: 'Devolución',
};
