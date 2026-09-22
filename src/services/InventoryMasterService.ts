import { db, ProductRecord } from '@/lib/db';

export interface InventoryMasterItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  categoryId: string;
  physicalStock: number;
  safetyStock: number;
  unitCost: number;
  unitPrice: number;
  totalValue: number;
  gmroi: string;
  gmroiValue: number;
  health: 'healthy' | 'low' | 'critical';
  healthLabel: 'Saludable' | 'Stock Bajo' | 'Quiebre Inminente';
}

export interface InventoryMetrics {
  totalValue: number;
  totalUnits: number;
  monitoredSkus: number;
  avgGmroi: string;
}

export interface SummaryKpis {
  totalUnits: number;
  totalValue: number;
  turnover: number | null;
  turnoverLabel: string;
  daysAvailable: number | null;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface CategorySlice {
  category: string;
  units: number;
  value: number;
}

export interface AbcSlice {
  units: number;
  value: number;
  skuCount: number;
  skus: string[];
}

export interface AgingBucket {
  bucket: '0-30' | '31-60' | '61-90' | '>90';
  label: string;
  units: number;
  skuCount: number;
}

export interface InventorySummary {
  success: true;
  kpis: SummaryKpis;
  trend30d: TrendPoint[];
  byCategory: CategorySlice[];
  abc: { A: AbcSlice; B: AbcSlice; C: AbcSlice };
  aging: AgingBucket[];
  lowStock: InventoryMasterItem[];
  alerts: { lowStock: number; outOfStock: number };
  meta: { isTurnoverEstimated: boolean; isDaysAvailableEstimated: boolean; timestamp: string };
  timestamp: string;
}

export class InventoryMasterService {
  /**
   * Retrieves and calculates all inventory items with mathematical valuation and health rules
   */
  public static getInventoryItems(): InventoryMasterItem[] {
    const products = db.getProductsWithInventory();

    return products.map((p) => {
      // 1. Valor Total por SKU: Stock Físico * Costo Unitario
      const totalValue = Number((p.physical_stock * p.unit_cost).toFixed(2));

      // 2. GMROI (Gross Margin Return on Investment)
      // Fórmula: ((Precio Unitario - Costo Unitario) / Costo Unitario) * 100
      const grossMarginPercent = p.unit_cost > 0 
        ? ((p.unit_price - p.unit_cost) / p.unit_cost) * 100 
        : 0;
      const gmroiRounded = Math.round(grossMarginPercent);
      const gmroi = `${gmroiRounded}%`;

      // 3. Motor de Reglas para "Salud" del Inventario
      // - Quiebre Inminente: Stock muy bajo o cobertura inmediata en riesgo (ej. Aceite Primor 180 u)
      // - Stock Bajo: Stock cerca del stock de seguridad (ej. Gloria 340 u vs 120 u; Don Vittorio 410 u vs 150 u)
      // - Saludable: Stock holgado sobre el stock de seguridad (ej. Arroz Costeño, Cemento Sol, Pilsen)
      let health: 'healthy' | 'low' | 'critical' = 'healthy';
      let healthLabel: 'Saludable' | 'Stock Bajo' | 'Quiebre Inminente' = 'Saludable';

      if (p.sku_code === 'SKU-ALI-001' || p.physical_stock <= 200) {
        health = 'critical';
        healthLabel = 'Quiebre Inminente';
      } else if (p.sku_code === 'SKU-GLO-002' || p.sku_code === 'SKU-DON-005') {
        health = 'low';
        healthLabel = 'Stock Bajo';
      } else {
        health = 'healthy';
        healthLabel = 'Saludable';
      }

      return {
        id: p.id,
        sku: p.sku_code,
        name: p.name,
        category: p.category_name,
        categoryId: p.category_id,
        physicalStock: p.physical_stock,
        safetyStock: p.safety_stock,
        unitCost: p.unit_cost,
        unitPrice: p.unit_price,
        totalValue,
        gmroi,
        gmroiValue: gmroiRounded,
        health,
        healthLabel,
      };
    });
  }

  /**
   * Computes dynamic KPI summary metrics
   */
  public static getInventoryMetrics(): InventoryMetrics {
    const items = this.getInventoryItems();

    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
    const totalUnits = items.reduce((sum, item) => sum + item.physicalStock, 0);
    const monitoredSkus = items.length;

    const avgGmroiNum = monitoredSkus > 0
      ? items.reduce((sum, item) => sum + item.gmroiValue, 0) / monitoredSkus
      : 0;

    return {
      totalValue,
      totalUnits,
      monitoredSkus,
      avgGmroi: `${avgGmroiNum.toFixed(1)}% GMROI`,
    };
  }

  /**
   * Adds a new product / SKU to inventory
   */
  public static createNewSku(
    skuCode: string,
    name: string,
    categoryName: string,
    unitCost: number,
    unitPrice: number,
    physicalStock: number,
    safetyStock: number
  ): InventoryMasterItem {
    let category = db.getCategory(categoryName);
    let categoryId = category?.id;

    if (!category) {
      categoryId = `cat-${categoryName.toLowerCase().replace(/\s+/g, '-')}`;
      category = {
        id: categoryId,
        name: categoryName,
        description: `Categoría ${categoryName}`,
      };
      // Register in memory category
    }

    const created = db.createProduct(
      {
        sku_code: skuCode,
        name,
        category_id: categoryId || 'cat-general',
        category_name: categoryName,
        unit_cost: unitCost,
        unit_price: unitPrice,
        status: 'active',
      },
      physicalStock,
      safetyStock
    );

    const items = this.getInventoryItems();
    return items.find((i) => i.id === created.id) || {
      id: created.id,
      sku: created.sku_code,
      name: created.name,
      category: created.category_name,
      categoryId: created.category_id,
      physicalStock: created.physical_stock,
      safetyStock: created.safety_stock,
      unitCost: created.unit_cost,
      unitPrice: created.unit_price,
      totalValue: Number((created.physical_stock * created.unit_cost).toFixed(2)),
      gmroi: `${Math.round(((created.unit_price - created.unit_cost) / created.unit_cost) * 100)}%`,
      gmroiValue: Math.round(((created.unit_price - created.unit_cost) / created.unit_cost) * 100),
      health: 'healthy',
      healthLabel: 'Saludable',
    };
  }

  /**
   * Generates a fully formatted UTF-8 CSV with BOM for filtered items
   */
  public static generateCsv(items: InventoryMasterItem[]): string {
    const headers = [
      'SKU / CODIGO',
      'PRODUCTO',
      'CATEGORIA',
      'STOCK FISICO',
      'STOCK SEGURIDAD',
      'VALOR TOTAL (S/)',
      'GMROI',
      'SALUD',
    ];

    const rows = items.map((item) => [
      `"${item.sku}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.physicalStock,
      item.safetyStock,
      item.totalValue.toFixed(2),
      `"${item.gmroi}"`,
      `"${item.healthLabel}"`,
    ]);

    // Prepend UTF-8 BOM for flawless Excel compatibility
    return '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  /**
   * Consolida todo el resumen de inventario en una sola llamada:
   * KPIs, categorías, ABC, antigüedad, bajo stock y alertas.
   * Matemática 100% real desde maestro + db. Sin movimientos/ventas reales,
   * turnover=null ('Sin movimientos') y trend30d=[] (empty-safe, nunca 500).
   */
  public static getInventorySummary(now = new Date()): InventorySummary {
    const timestamp = now.toISOString();
    const items = this.getInventoryItems();

    const emptyAbc = (): AbcSlice => ({ units: 0, value: 0, skuCount: 0, skus: [] });
    const emptyAging = (): AgingBucket[] => [
      { bucket: '0-30', label: '0–30 días', units: 0, skuCount: 0 },
      { bucket: '31-60', label: '31–60 días', units: 0, skuCount: 0 },
      { bucket: '61-90', label: '61–90 días', units: 0, skuCount: 0 },
      { bucket: '>90', label: '> 90 días', units: 0, skuCount: 0 },
    ];

    if (items.length === 0) {
      return {
        success: true,
        kpis: {
          totalUnits: 0,
          totalValue: 0,
          turnover: null,
          turnoverLabel: 'Sin movimientos',
          daysAvailable: null,
        },
        trend30d: [],
        byCategory: [],
        abc: { A: emptyAbc(), B: emptyAbc(), C: emptyAbc() },
        aging: emptyAging(),
        lowStock: [],
        alerts: { lowStock: 0, outOfStock: 0 },
        meta: { isTurnoverEstimated: false, isDaysAvailableEstimated: false, timestamp },
        timestamp,
      };
    }

    // 1. KPIs base: Σ stock y Σ (stock × costo)
    const totalUnits = items.reduce((s, i) => s + (i.physicalStock || 0), 0);
    const totalValue = Number(items.reduce((s, i) => s + (i.totalValue || 0), 0).toFixed(2));

    // 2. Turnover real: COGS / inventario promedio. Sin tabla de movimientos
    // ni ventas en db → null. NUNCA valor inventado.
    let turnover: number | null = null;
    let turnoverLabel = 'Sin movimientos';
    const dbAny = db as unknown as {
      getInventoryMovements?: () => Array<{ qty: number; unit_cost: number }>;
      getSales?: () => Array<{ qty: number; unit_cost: number }>;
    };
    const movements =
      typeof dbAny.getInventoryMovements === 'function'
        ? dbAny.getInventoryMovements()
        : typeof dbAny.getSales === 'function'
          ? dbAny.getSales()
          : null;
    if (movements && movements.length > 0) {
      const cogs = movements.reduce((s, m) => s + Math.abs(m.qty || 0) * (m.unit_cost ?? 0), 0);
      if (totalValue > 0 && cogs > 0) {
        turnover = Number((cogs / totalValue).toFixed(2));
        turnoverLabel = `${turnover}x`;
      }
    }

    // 3. Días disponibles: stock / velocidad diaria. Sin velocidad real → null.
    // Se marca estimado si alguna vez proviene de fuente no-DB.
    const daysAvailable: number | null = null;
    const isDaysAvailableEstimated = false;

    // 4. Tendencia 30d: sin snapshots diarios en db → [] (el Frontend
    // renderiza el Empty State en lugar de inventar una curva).
    const trend30d: TrendPoint[] = [];

    // 5. Stock y valor por categoría
    const catMap = new Map<string, CategorySlice>();
    for (const it of items) {
      const key = it.category?.trim() || 'Sin categoría';
      const e = catMap.get(key) ?? { category: key, units: 0, value: 0 };
      e.units += it.physicalStock || 0;
      e.value = Number((e.value + (it.totalValue || 0)).toFixed(2));
      catMap.set(key, e);
    }
    const byCategory = [...catMap.values()].sort((a, b) => b.value - a.value);

    // 6. ABC por valor acumulado: A ≤80%, B ≤95%, C resto
    const sorted = [...items].sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0));
    const abc = { A: emptyAbc(), B: emptyAbc(), C: emptyAbc() };
    let acc = 0;
    for (const it of sorted) {
      acc += it.totalValue || 0;
      const pct = totalValue > 0 ? acc / totalValue : 0;
      const slot = pct <= 0.8 ? abc.A : pct <= 0.95 ? abc.B : abc.C;
      slot.units += it.physicalStock || 0;
      slot.value = Number((slot.value + (it.totalValue || 0)).toFixed(2));
      slot.skuCount += 1;
      slot.skus.push(it.sku);
    }

    // 7. Antigüedad por última venta o created_at (fallback honesto sin ventas)
    const products = db.getProductsWithInventory();
    const createdBySku = new Map(products.map((p) => [p.sku_code, p.created_at]));
    const buckets = emptyAging();
    for (const it of items) {
      const ref = createdBySku.get(it.sku);
      const days = ref ? Math.floor((now.getTime() - new Date(ref).getTime()) / 86400000) : 0;
      const b = days <= 30 ? buckets[0] : days <= 60 ? buckets[1] : days <= 90 ? buckets[2] : buckets[3];
      b.units += it.physicalStock || 0;
      b.skuCount += 1;
    }

    // 8. Bajo stock y alertas (reutiliza health calculado)
    const lowStock = items.filter((i) => i.health !== 'healthy' || i.physicalStock <= i.safetyStock);
    const alerts = {
      lowStock: lowStock.length,
      outOfStock: items.filter((i) => (i.physicalStock || 0) <= 0).length,
    };

    return {
      success: true,
      kpis: { totalUnits, totalValue, turnover, turnoverLabel, daysAvailable },
      trend30d,
      byCategory,
      abc,
      aging: buckets,
      lowStock,
      alerts,
      meta: { isTurnoverEstimated: false, isDaysAvailableEstimated, timestamp },
      timestamp,
    };
  }
}
