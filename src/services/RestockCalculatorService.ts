export interface RestockItem {
  id: string;
  sku: string;
  name: string;
  provider: string;
  providerId: string | null;
  providerType: 'corporate' | 'traditional';
  providerPhone?: string;
  currentStock: number;
  dailyVelocity: number;
  leadTimeDays: number;
  safetyStock: number;
  rop: number;
  coverageDays: number;
  suggestedQty: number;
  unitCost: number;
  investment: number;
  status: 'critical' | 'warning' | 'optimal';
}

export interface RestockInput {
  id: string;
  sku: string;
  name: string;
  unitCost: number;
  currentStock: number;
  safetyStock: number;
  leadTimeDays: number;
  provider: string;
  providerId: string | null;
  providerType: 'corporate' | 'traditional';
  providerPhone?: string;
}

/**
 * Reglas de negocio del motor de reabastecimiento (documentadas y auditables):
 * - Velocidad diaria estimada = stock de seguridad / lead time (demanda diaria
 *   implícita en el dimensionamiento del colchón; se muestra como "Vel. est.").
 * - ROP = (velocidad × lead time) + stock de seguridad.
 * - Cobertura = stock actual / velocidad.
 * - Compra sugerida = order-up-to: max(0, velocidad × (LT + 14d revisión) − stock).
 * - Inversión = compra sugerida × costo unitario.
 * - Crítico: cobertura < 3.5 días. Alerta: cobertura ≤ 7 días. Si no,
 *   Normal. Sin velocidad (>0) no hay cálculo: se reporta como Normal con
 *   sugerencia 0 (nunca valores inventados).
 */
export const CRITICAL_COVERAGE_DAYS = 3.5;
export const WARNING_COVERAGE_DAYS = 7;
export const REVIEW_PERIOD_DAYS = 14;

export function computeRestockItem(input: RestockInput): RestockItem {
  const stock = Math.max(0, input.currentStock);
  const safety = Math.max(0, input.safetyStock);
  const leadTime = Math.max(0, input.leadTimeDays);
  const unitCost = Math.max(0, input.unitCost);

  const dailyVelocity = leadTime > 0 ? safety / leadTime : 0;

  if (dailyVelocity <= 0) {
    return {
      ...input,
      currentStock: stock,
      dailyVelocity: 0,
      leadTimeDays: leadTime,
      safetyStock: safety,
      unitCost,
      rop: Math.round(safety),
      coverageDays: 999,
      suggestedQty: 0,
      investment: 0,
      status: 'optimal',
    };
  }

  const rop = Math.round(dailyVelocity * leadTime + safety);
  const coverageDays = Number((stock / dailyVelocity).toFixed(1));
  const target = dailyVelocity * (leadTime + REVIEW_PERIOD_DAYS);
  const suggestedQty = Math.max(0, Math.round(target - stock));
  const investment = Number((suggestedQty * unitCost).toFixed(2));

  let status: RestockItem['status'] = 'optimal';
  if (coverageDays < CRITICAL_COVERAGE_DAYS) {
    status = 'critical';
  } else if (coverageDays <= WARNING_COVERAGE_DAYS) {
    status = 'warning';
  }

  return {
    ...input,
    currentStock: stock,
    dailyVelocity: Number(dailyVelocity.toFixed(2)),
    leadTimeDays: leadTime,
    safetyStock: safety,
    unitCost,
    rop,
    coverageDays,
    suggestedQty,
    investment,
    status,
  };
}

interface SupplierInfo {
  id: string;
  name: string;
  type: 'corporate' | 'traditional';
  phone?: string;
  leadTimeDays: number;
  skus: string[];
}

export class RestockCalculatorService {
  /**
   * Calcula sugerencias desde Supabase (products + inventory_levels +
   * suppliers + purchase_orders para el mapeo producto→proveedor).
   * Sin filas en BD el resultado es vacío (cero mocks).
   */
  public static async calculateRestockItems(filter?: import('@/services/LocationsService').LocationFilter): Promise<{
    items: RestockItem[];
    totalCapitalRequired: number;
    criticalCount: number;
  }> {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const [{ data: products }, { data: levels }, { data: suppliers }, { data: orders }, { data: lines }] =
      await Promise.all([
        supabase.from('products').select('id,sku_code,name,unit_cost,status').eq('status', 'active'),
        supabase.from('inventory_levels').select('product_id,physical_stock,safety_stock'),
        supabase.from('suppliers').select('id,name,integration_type,lead_time_days,contact_info'),
        supabase.from('purchase_orders').select('id,supplier_id,created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('purchase_order_lines').select('po_id,sku').limit(1000),
      ]);

    const levelByProduct = new Map((levels || []).map((l: any) => [l.product_id, l]));

    // Filtrado relacional por ubicación (placement real del workspace).
    let scopedProducts = products || [];
    if (filter?.locationRef || filter?.branch) {
      try {
        const { LocationsService } = await import('@/services/LocationsService');
        const { data: ws } = await supabase.from('workspaces').select('id,settings').limit(1).maybeSingle();
        if (ws?.id) {
          const placement = await LocationsService.getPlacement(supabase, ws.id);
          scopedProducts = (products || []).filter((p: any) =>
            LocationsService.matchesLocation(placement[p.id], filter)
          );
        }
      } catch {
        scopedProducts = products || [];
      }
    }

    const supplierInfos: SupplierInfo[] = (suppliers || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      type: s.integration_type === 'corporate' ? 'corporate' : 'traditional',
      phone: (s.contact_info as any)?.phone || (s.contact_info as any)?.email,
      leadTimeDays: Number(s.lead_time_days) || 0,
      skus: Array.isArray((s.contact_info as any)?.skus) ? (s.contact_info as any).skus : [],
    }));
    const supplierById = new Map(supplierInfos.map((s) => [s.id, s]));

    // Mapeo producto→proveedor: historial real de OC primero, catálogo (skus) después
    const poSupplierById = new Map((orders || []).map((o: any) => [o.id, o.supplier_id]));
    const lastSupplierBySku = new Map<string, string>();
    for (const line of lines || []) {
      if (line?.sku && !lastSupplierBySku.has(line.sku)) {
        const supId = poSupplierById.get(line.po_id);
        if (supId) lastSupplierBySku.set(line.sku, supId);
      }
    }

    const inputs: RestockInput[] = (scopedProducts || []).map((p: any) => {
      const level = levelByProduct.get(p.id) || {};
      let supplier: SupplierInfo | undefined;
      const historicSupplierId = lastSupplierBySku.get(p.sku_code);
      if (historicSupplierId) supplier = supplierById.get(historicSupplierId);
      if (!supplier) supplier = supplierInfos.find((s) => s.skus.includes(p.sku_code));

      return {
        id: p.id,
        sku: p.sku_code,
        name: p.name,
        unitCost: Number(p.unit_cost) || 0,
        currentStock: Number(level.physical_stock ?? 0),
        safetyStock: Number(level.safety_stock ?? 0),
        leadTimeDays: supplier?.leadTimeDays ?? 0,
        provider: supplier?.name || 'Sin asignar',
        providerId: supplier?.id || null,
        providerType: supplier?.type || 'traditional',
        providerPhone: supplier?.phone,
      };
    });

    const items = inputs.map(computeRestockItem);
    const totalCapitalRequired = Number(items.reduce((sum, i) => sum + i.investment, 0).toFixed(2));
    const criticalCount = items.filter((i) => i.status === 'critical').length;

    return { items, totalCapitalRequired, criticalCount };
  }

  public static async getRestockItemById(id: string): Promise<RestockItem | undefined> {
    const { items } = await this.calculateRestockItems();
    return items.find((i) => i.id === id || i.sku === id);
  }
}
