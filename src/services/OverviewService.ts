import { createClient } from '@/utils/supabase/server';
import { LocationsService, type LocationFilter } from '@/services/LocationsService';
import { computeRestockItem } from '@/services/RestockCalculatorService';

export interface OverviewKpis {
  /** Nivel 1a: monto valorizado del stock físico en el alcance. */
  inventoryValue: number;
  /** Nivel 1b: SKUs con cobertura < 3 días. */
  breakRiskCount: number;
  /** Nivel 1b: ventas bajo riesgo =Σ sugerido×precio en quiebre. */
  breakRiskAmount: number;
  /** Nivel 1c: capital sin señal de rotación (velocidad 0) valorizado a costo. */
  deadStockAmount: number;
  /** Nivel 1d: caja necesaria = Σ sugerido×costo. */
  requiredCapital: number;
}

export interface ForecastPoint {
  day: number;
  projectedDemand: number;
  stockLeft: number;
}

export interface TopAction {
  id: string;
  sku: string;
  productName: string;
  provider: string;
  coverageDays: number;
  suggestedQty: number;
  investment: number;
  status: 'critical' | 'warning' | 'optimal';
}

export interface WatchItem {
  id: string;
  sku: string;
  productName: string;
  provider: string;
  stock: number;
  value: number;
}

export interface AttentionItem {
  id: string;
  sku: string;
  name: string;
  stock: number;
}

export interface OverviewData {
  kpis: OverviewKpis;
  forecast: { points: ForecastPoint[]; breakDay: number | null; dailyDemand: number; totalStock: number };
  health: { critical: number; low: number; healthy: number; total: number };
  topActions: TopAction[];
  /** SKUs sin stock de seguridad: lo que bloquea el forecast (accionable). */
  attention: { missingSafety: AttentionItem[]; missingSafetyCount: number; scopedTotal: number };
  /** Top 5 por valor cuando aún no hay punto de reorden (vigilancia honesta). */
  watchlist: WatchItem[];
}

/** Cobertura bajo la cual un SKU cuenta como quiebre inminente en el Panel. */
export const BREAK_COVERAGE_DAYS = 3;

/**
 * OverviewService — consolida el Panel ejecutivo en UNA sola ronda de
 * consultas (products + levels + suppliers + POs + lines + placement en
 * paralelo, columnas mínimas). Sin mocks: sin filas en BD el resultado es
 * ceros y arreglos vacíos con estados honestos en el frontend.
 */
export class OverviewService {
  static async getOverview(workspaceId: string, filter?: LocationFilter): Promise<OverviewData> {
    const supabase = await createClient();

    const [{ data: products }, { data: levels }, { data: suppliers }, { data: orders }, { data: lines }] =
      await Promise.all([
        supabase.from('products').select('id,sku_code,name,unit_cost,unit_price').eq('status', 'active'),
        supabase.from('inventory_levels').select('product_id,physical_stock,safety_stock'),
        supabase.from('suppliers').select('id,name,integration_type,lead_time_days,contact_info'),
        supabase.from('purchase_orders').select('id,supplier_id,created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('purchase_order_lines').select('po_id,sku').limit(1000),
      ]);

    let placement: Record<string, { branch: string; locationRef: string }> = {};
    try {
      placement = await LocationsService.getPlacement(supabase, workspaceId);
    } catch {
      placement = {};
    }

    const scoped = (products || []).filter((p: any) =>
      filter?.locationRef || filter?.branch
        ? LocationsService.matchesLocation(placement[p.id], filter as LocationFilter)
        : true
    );

    const levelByProduct = new Map((levels || []).map((l: any) => [l.product_id, l]));
    const supplierById = new Map((suppliers || []).map((s: any) => [s.id, s]));
    const poSupplierById = new Map((orders || []).map((o: any) => [o.id, o.supplier_id]));
    const lastSupplierBySku = new Map<string, string>();
    for (const line of lines || []) {
      if (line?.sku && !lastSupplierBySku.has(line.sku)) {
        const supId = poSupplierById.get(line.po_id);
        if (supId) lastSupplierBySku.set(line.sku, supId);
      }
    }
    const supplierNameFor = (sku: string): string => {
      const histId = lastSupplierBySku.get(sku);
      if (histId && supplierById.get(histId)) return supplierById.get(histId).name;
      const byCat = (suppliers || []).find((s: any) =>
        Array.isArray((s.contact_info as any)?.skus) && (s.contact_info as any).skus.includes(sku)
      );
      return byCat?.name || 'Sin asignar';
    };
    const leadFor = (sku: string): number => {
      const histId = lastSupplierBySku.get(sku);
      if (histId && supplierById.get(histId)) return Number(supplierById.get(histId).lead_time_days) || 0;
      const byCat = (suppliers || []).find((s: any) =>
        Array.isArray((s.contact_info as any)?.skus) && (s.contact_info as any).skus.includes(sku)
      );
      return Number(byCat?.lead_time_days) || 0;
    };

    const computed = scoped.map((p: any) => {
      const level = levelByProduct.get(p.id) || {};
      return {
        product: p,
        unitCost: Number(p.unit_cost) || 0,
        unitPrice: Number(p.unit_price) || 0,
        currentStock: Number(level.physical_stock ?? 0),
        safetyStock: Number(level.safety_stock ?? 0),
        restock: computeRestockItem({
          id: p.id,
          sku: p.sku_code,
          name: p.name,
          unitCost: Number(p.unit_cost) || 0,
          currentStock: Number(level.physical_stock ?? 0),
          safetyStock: Number(level.safety_stock ?? 0),
          leadTimeDays: leadFor(p.sku_code),
          provider: supplierNameFor(p.sku_code),
          providerId: null,
          providerType: 'traditional' as const,
        }),
      };
    });

    // ── Nivel 1: 4 KPIs ──
    const inventoryValue = Number(
      computed.reduce((s, c) => s + c.currentStock * c.unitCost, 0).toFixed(2)
    );
    const breaking = computed.filter((c) => c.restock.dailyVelocity > 0 && c.restock.coverageDays < BREAK_COVERAGE_DAYS);
    const breakRiskAmount = Number(
      breaking.reduce((s, c) => s + c.restock.suggestedQty * c.unitPrice, 0).toFixed(2)
    );
    const deadStockAmount = Number(
      computed
        .filter((c) => c.restock.dailyVelocity <= 0 && c.currentStock > 0)
        .reduce((s, c) => s + c.currentStock * c.unitCost, 0)
        .toFixed(2)
    );
    const requiredCapital = Number(
      computed.reduce((s, c) => s + c.restock.investment, 0).toFixed(2)
    );

    // ── Nivel 2: forecast 90 días (demanda diaria real derivada) ──
    const dailyDemand = Number(computed.reduce((s, c) => s + c.restock.dailyVelocity, 0).toFixed(2));
    const totalStock = computed.reduce((s, c) => s + c.currentStock, 0);
    const points: ForecastPoint[] = [];
    let breakDay: number | null = null;
    if (dailyDemand > 0 && totalStock > 0) {
      for (let d = 1; d <= 90; d += 1) {
        const projectedDemand = Number((dailyDemand * d).toFixed(1));
        const stockLeft = Number(Math.max(totalStock - dailyDemand * d, 0).toFixed(1));
        points.push({ day: d, projectedDemand, stockLeft });
        if (breakDay === null && stockLeft <= 0) breakDay = d;
      }
    }

    const critical = computed.filter((c) => c.restock.status === 'critical').length;
    const low = computed.filter((c) => c.restock.status === 'warning').length;
    const healthy = computed.length - critical - low;

    // ── Nivel 3: top 5 acciones por cobertura ──
    const topActions: TopAction[] = computed
      .filter((c) => c.restock.suggestedQty > 0)
      .sort((a, b) => a.restock.coverageDays - b.restock.coverageDays)
      .slice(0, 5)
      .map((c) => ({
        id: c.product.id,
        sku: c.product.sku_code,
        productName: c.product.name,
        provider: c.restock.provider,
        coverageDays: c.restock.coverageDays,
        suggestedQty: c.restock.suggestedQty,
        investment: c.restock.investment,
        status: c.restock.status,
      }));

    const topIds = new Set(topActions.map((a) => a.id));

    // Atención: SKUs sin stock de seguridad (bloquean velocidad y forecast).
    const withoutSafety = computed.filter((c) => c.safetyStock <= 0);
    const attention = {
      missingSafety: withoutSafety
        .sort((a, b) => b.currentStock * b.unitCost - a.currentStock * a.unitCost)
        .slice(0, 5)
        .map((c) => ({ id: c.product.id, sku: c.product.sku_code, name: c.product.name, stock: c.currentStock })),
      missingSafetyCount: withoutSafety.length,
      scopedTotal: computed.length,
    };

    // Vigilancia: capital concentrado cuando aún no hay punto de reorden.
    const watchlist: WatchItem[] = computed
      .filter((c) => !topIds.has(c.product.id))
      .sort((a, b) => b.currentStock * b.unitCost - a.currentStock * a.unitCost)
      .slice(0, 5)
      .map((c) => ({
        id: c.product.id,
        sku: c.product.sku_code,
        productName: c.product.name,
        provider: c.restock.provider,
        stock: c.currentStock,
        value: Number((c.currentStock * c.unitCost).toFixed(2)),
      }));

    return {
      kpis: {
        inventoryValue,
        breakRiskCount: breaking.length,
        breakRiskAmount,
        deadStockAmount,
        requiredCapital,
      },
      forecast: { points, breakDay, dailyDemand, totalStock },
      health: { critical, low, healthy, total: computed.length },
      topActions,
      attention,
      watchlist,
    };
  }
}
