import { createClient } from '@/utils/supabase/server';

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
  totalSkus: number;
  totalValue: number;
  lowStockCount: number;
  criticalStockCount: number;
  globalGmroi: string;
}

export class InventoryMasterService {
  static async getInventoryItems(): Promise<InventoryMasterItem[]> {
    const supabase = await createClient();
    
    // Obtener productos, categorías y niveles de inventario reales
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(name),
        inventory_levels(physical_stock, safety_stock)
      `);
      
    if (error || !products) {
      console.error('Error fetching real inventory:', error);
      return [];
    }

    return products.map((p: any) => {
      const physicalStock = p.inventory_levels?.[0]?.physical_stock || 0;
      const safetyStock = p.inventory_levels?.[0]?.safety_stock || 0;
      const unitCost = Number(p.unit_cost) || 0;
      const unitPrice = Number(p.unit_price) || 0;
      const totalValue = physicalStock * unitCost;
      
      const margin = unitPrice - unitCost;
      const gmroiValue = totalValue > 0 ? (margin / unitCost) * 100 : 0;
      
      let health: 'healthy' | 'low' | 'critical' = 'healthy';
      let healthLabel: 'Saludable' | 'Stock Bajo' | 'Quiebre Inminente' = 'Saludable';
      
      if (physicalStock <= safetyStock * 0.5) {
        health = 'critical';
        healthLabel = 'Quiebre Inminente';
      } else if (physicalStock <= safetyStock) {
        health = 'low';
        healthLabel = 'Stock Bajo';
      }

      return {
        id: p.id,
        sku: p.sku_code,
        name: p.name,
        category: p.categories?.name || 'Sin Categoría',
        categoryId: p.category_id,
        physicalStock,
        safetyStock,
        unitCost,
        unitPrice,
        totalValue,
        gmroiValue,
        gmroi: `${gmroiValue.toFixed(1)}%`,
        health,
        healthLabel
      };
    });
  }

  static async getInventoryMetrics(): Promise<InventoryMetrics> {
    const items = await this.getInventoryItems();
    
    const totalSkus = items.length;
    let totalValue = 0;
    let totalMargin = 0;
    let totalCost = 0;
    let lowStockCount = 0;
    let criticalStockCount = 0;

    items.forEach(item => {
      totalValue += item.totalValue;
      totalMargin += (item.unitPrice - item.unitCost) * item.physicalStock;
      totalCost += item.unitCost * item.physicalStock;
      if (item.health === 'low') lowStockCount++;
      if (item.health === 'critical') criticalStockCount++;
    });

    const globalGmroi = totalCost > 0 ? (totalMargin / totalCost) * 100 : 0;

    return {
      totalSkus,
      totalValue,
      lowStockCount,
      criticalStockCount,
      globalGmroi: `${globalGmroi.toFixed(1)}%`
    };
  }
}
