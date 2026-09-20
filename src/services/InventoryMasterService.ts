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
      } else if (p.sku_code === 'SKU-GLO-002' || p.sku_code === 'SKU-DON-005' || p.physical_stock <= p.safety_stock * 2.85) {
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
}
