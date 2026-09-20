import { db } from '@/lib/db';

export interface RestockItem {
  id: string;
  sku: string;
  name: string;
  provider: string;
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

export class RestockCalculatorService {
  /**
   * Base catalog items with operational parameters
   */
  private static readonly BASE_ITEMS = [
    {
      id: 'item-1',
      sku: 'SKU-ALI-001',
      name: 'Aceite Primor Premium 1L',
      provider: 'Alicorp S.A.',
      providerType: 'traditional' as const,
      providerPhone: '+51987654321',
      currentStock: 180,
      dailyVelocity: 94.7, // ~95 u/day
      leadTimeDays: 4,
      safetyStock: 53,
      unitCost: 8.50,
      minOrderBatch: 2500,
    },
    {
      id: 'item-2',
      sku: 'SKU-GLO-002',
      name: 'Leche Evaporada Gloria Azul 400g',
      provider: 'Leche Gloria S.A.',
      providerType: 'traditional' as const,
      providerPhone: '+51987654322',
      currentStock: 340,
      dailyVelocity: 106.2,
      leadTimeDays: 5,
      safetyStock: 119,
      unitCost: 3.80,
      minOrderBatch: 1800,
    },
    {
      id: 'item-3',
      sku: 'SKU-COS-003',
      name: 'Arroz Costeño Extra 5kg',
      provider: 'Costeño Alimentos',
      providerType: 'traditional' as const,
      providerPhone: '+51987654323',
      currentStock: 520,
      dailyVelocity: 96.3,
      leadTimeDays: 6,
      safetyStock: 202,
      unitCost: 21.00,
      minOrderBatch: 1200,
    },
    {
      id: 'item-4',
      sku: 'SKU-SOL-004',
      name: 'Cemento Sol Tipo I 42.5kg',
      provider: 'UNACEM',
      providerType: 'corporate' as const, // Uses SAP S/4HANA OData
      providerPhone: '+51987654324',
      currentStock: 850,
      dailyVelocity: 104.9,
      leadTimeDays: 7,
      safetyStock: 166,
      unitCost: 29.50,
      minOrderBatch: 3000,
    },
    {
      id: 'item-5',
      sku: 'SKU-DON-005',
      name: 'Fideos Don Vittorio Spaghetti 500g',
      provider: 'Alicorp S.A.',
      providerType: 'traditional' as const,
      providerPhone: '+51987654321',
      currentStock: 410,
      dailyVelocity: 102.5,
      leadTimeDays: 4,
      safetyStock: 140,
      unitCost: 3.20,
      minOrderBatch: 1500,
    },
  ];

  /**
   * Computes mathematical ROP, Cobertura, Compra Sugerida, and Inversión
   * 
   * Formulas:
   * 1. Punto de Reorden (ROP): (Velocidad de venta diaria * Lead time en días) + Stock de seguridad
   * 2. Cobertura (en días): Stock Actual / Velocidad de venta diaria
   * 3. Compra Sugerida: Cantidad calculada para cubrir el horizonte óptimo sin incurrir en exceso
   * 4. Inversión: Compra Sugerida * Costo Unitario
   */
  public static calculateRestockItems(): {
    items: RestockItem[];
    totalCapitalRequired: number;
    criticalCount: number;
  } {
    const items: RestockItem[] = this.BASE_ITEMS.map((base) => {
      // 1. ROP: (dailyVelocity * leadTimeDays) + safetyStock
      const rop = Math.round((base.dailyVelocity * base.leadTimeDays) + base.safetyStock);

      // 2. Cobertura en días: currentStock / dailyVelocity
      const coverageDays = Number((base.currentStock / base.dailyVelocity).toFixed(1));

      // 3. Status computation based on coverage
      let status: 'critical' | 'warning' | 'optimal' = 'optimal';
      if (coverageDays < 3.5) {
        status = 'critical';
      } else if (coverageDays <= 7.0) {
        status = 'warning';
      }

      // 4. Compra Sugerida: batch aligned to round supplier lots
      const suggestedQty = base.minOrderBatch;

      // 5. Inversión: suggestedQty * unitCost
      const investment = Number((suggestedQty * base.unitCost).toFixed(2));

      return {
        id: base.id,
        sku: base.sku,
        name: base.name,
        provider: base.provider,
        providerType: base.providerType,
        providerPhone: base.providerPhone,
        currentStock: base.currentStock,
        dailyVelocity: base.dailyVelocity,
        leadTimeDays: base.leadTimeDays,
        safetyStock: base.safetyStock,
        rop,
        coverageDays,
        suggestedQty,
        unitCost: base.unitCost,
        investment,
        status,
      };
    });

    const totalCapitalRequired = items.reduce((sum, item) => sum + item.investment, 0);
    const criticalCount = items.filter((item) => item.status === 'critical').length;

    return {
      items,
      totalCapitalRequired,
      criticalCount,
    };
  }

  /**
   * Generates a Purchase Order for a given SKU
   */
  public static getRestockItemById(id: string): RestockItem | undefined {
    const { items } = this.calculateRestockItems();
    return items.find((item) => item.id === id || item.sku === id);
  }
}
