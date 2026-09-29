import { createClient } from '@/utils/supabase/server';
import { LocationsService, type LocationFilter } from '@/services/LocationsService';

export interface ExecutiveDashboardData {
  summary: {
    totalSkus: number;
    stockoutRiskCount: number;
    deadStockAmount: number;
    recommendedPurchaseAmount: number;
    availableCreditLine: number;
    forecastAccuracy: number | null;
  };
  modules: {
    riesgoQuiebre: Array<{ id: string; sku: string; name: string; currentStock: number; safetyStock: number; daysRemaining: number; leadTimeDays: number; urgency: 'CRITICAL' | 'WARNING' | 'STABLE'; }>;
    inventarioInmovilizado: Array<{ id: string; sku: string; name: string; deadQuantity: number; capitalTiedUp: number; daysInactive: number; }>;
    comprasRecomendadas: Array<{ id: string; supplierName: string; sku: string; productName: string; suggestedQuantity: number; unitCost: number; totalCost: number; priority: 'HIGH' | 'MEDIUM' | 'LOW'; }>;
    capitalRequerido: { totalRequired: number; immediate7Days: number; horizon30Days: number; currency: string; };
    financiamientoDisponible: Array<{ id: string; bankName: string; totalLine: number; availableLine: number; monthlyRate: number; status: string; }>;
    forecast90Dias: Array<{ month: string; projectedDemand: number; actualHistorical: number; lowerBound: number; upperBound: number; }>;
    rentabilidadSKU: Array<{ sku: string; name: string; unitCost: number; unitPrice: number; marginPercent: number; totalRevenue: number; }>;
    proveedoresCriticos: Array<{ id: string; name: string; leadTimeDays: number; activePOs: number; reliabilityScore: number; integrationType: string; }>;
  };
}

export class DashboardService {
  static async getExecutiveMetrics(workspaceId: string, filter?: LocationFilter): Promise<ExecutiveDashboardData> {
    const supabase = await createClient();
    const hasFilter = Boolean(filter?.locationRef || filter?.branch);

    // Consultar datos reales de base de datos
    const { data: dbProducts } = await supabase.from('products').select('*');
    const { data: dbInventory } = await supabase.from('inventory_levels').select('*');
    const { data: dbSuppliers } = await supabase.from('suppliers').select('*');
    const { data: dbCreditLines } = await supabase.from('credit_lines').select('*');

    const products = dbProducts || [];
    const inventoryMap = new Map((dbInventory || []).map((inv) => [inv.product_id, inv]));

    // Filtrado relacional por ubicación: solo productos cuyo placement
    // pertenece a la ubicación/sucursal seleccionada. Sin filtro = todo.
    let scopedProducts = products;
    if (hasFilter) {
      try {
        const placement = await LocationsService.getPlacement(supabase, workspaceId);
        scopedProducts = products.filter((p: any) =>
          LocationsService.matchesLocation(placement[p.id], filter as LocationFilter)
        );
      } catch {
        scopedProducts = products;
      }
    }
    const productsInScope = scopedProducts;

    // 1. Módulo: Riesgo de Quiebre (Ajustado para no usar mocks cuando la DB está vacía)
    const riesgoQuiebre = productsInScope
      .map((p) => {
        const inv = inventoryMap.get(p.id);
        const physicalStock = inv?.physical_stock ?? 0;
        const safetyStock = inv?.safety_stock ?? 0;
        const daysRemaining = physicalStock > 0 ? 999 : 0; // Aproximación básica sin demanda

        let urgency: 'CRITICAL' | 'WARNING' | 'STABLE' = 'STABLE';
        if (physicalStock <= safetyStock) urgency = 'CRITICAL';
        else if (physicalStock <= safetyStock * 1.5) urgency = 'WARNING';

        return {
          id: p.id,
          sku: p.sku_code,
          name: p.name,
          currentStock: physicalStock,
          safetyStock,
          daysRemaining,
          leadTimeDays: 0,
          urgency,
        };
      })
      .filter((item) => item.urgency !== 'STABLE')
      .slice(0, 5);

    // 2. Módulo: Inventario Inmovilizado
    const inventarioInmovilizado = productsInScope
      .map((p) => {
        const inv = inventoryMap.get(p.id);
        const physicalStock = inv?.physical_stock ?? 0;
        const capitalTiedUp = physicalStock * Number(p.unit_cost || 0);

        return {
          id: p.id,
          sku: p.sku_code,
          name: p.name,
          deadQuantity: physicalStock, // Asumimos inmovilizado todo por ahora si no hay ventas (hasta conectar facturación)
          capitalTiedUp,
          daysInactive: 0,
        };
      })
      .filter((item) => item.capitalTiedUp > 0)
      .slice(0, 5);

    const totalDeadStock = inventarioInmovilizado.reduce((acc, curr) => acc + curr.capitalTiedUp, 0);

    // 3. Módulo: Compras Recomendadas (Calculadas sólo sobre quiebre inminente)
    const comprasRecomendadas = riesgoQuiebre.map((r, idx) => {
      const suggestedQuantity = Math.max(0, r.safetyStock * 2 - r.currentStock);
      const product = productsInScope.find(p => p.id === r.id);
      const unitCost = Number(product?.unit_cost || 0);
      const totalCost = suggestedQuantity * unitCost;

      return {
        id: `rec-${r.id}`,
        supplierName: 'Sin Asignar', // En DB real requiere mapeo producto-proveedor
        sku: r.sku,
        productName: r.name,
        suggestedQuantity,
        unitCost,
        totalCost,
        priority: (r.urgency === 'CRITICAL' ? 'HIGH' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
      };
    }).filter(c => c.suggestedQuantity > 0);

    const totalRecommendedAmount = comprasRecomendadas.reduce((acc, curr) => acc + curr.totalCost, 0);

    // 4. Módulo: Capital Requerido
    const capitalRequerido = {
      totalRequired: totalRecommendedAmount,
      immediate7Days: Math.round(totalRecommendedAmount * 0.6),
      horizon30Days: totalRecommendedAmount,
      currency: 'USD',
    };

    // 5. Módulo: Financiamiento Disponible (Sin fallbacks estáticos)
    const rawCreditLines = dbCreditLines || [];
    const financiamientoDisponible = rawCreditLines.map((cl) => ({
      id: cl.id,
      bankName: cl.partner_bank_id,
      totalLine: Number(cl.total_amount),
      availableLine: Number(cl.available_amount),
      monthlyRate: Number(cl.monthly_interest_rate),
      status: cl.status,
    }));

    const totalAvailableCredit = financiamientoDisponible.reduce((acc, curr) => acc + curr.availableLine, 0);

    // 6. Módulo: Forecast de 90 Días (Vacío hasta tener datos reales de demanda)
    const forecast90Dias: any[] = [];

    // 7. Módulo: Rentabilidad por SKU
    const rentabilidadSKU = productsInScope.slice(0, 5).map((p) => {
      const cost = Number(p.unit_cost) || 0;
      const price = Number(p.unit_price) || 0;
      const margin = price > 0 ? ((price - cost) / price) * 100 : 0;

      return {
        sku: p.sku_code,
        name: p.name,
        unitCost: cost,
        unitPrice: price,
        marginPercent: Math.round(margin * 10) / 10,
        totalRevenue: 0, // Sin datos de ventas reales
      };
    });

    // 8. Módulo: Proveedores Críticos (Sin fallbacks estáticos)
    const rawSuppliers = dbSuppliers || [];
    const proveedoresCriticos = rawSuppliers.map((s) => ({
      id: s.id,
      name: s.name,
      leadTimeDays: s.lead_time_days || 0,
      activePOs: 0,
      reliabilityScore: 100, // Neutro inicial
      integrationType: s.integration_type || 'corporate',
    }));

    return {
      summary: {
        totalSkus: productsInScope.length,
        stockoutRiskCount: riesgoQuiebre.length,
        deadStockAmount: totalDeadStock,
        recommendedPurchaseAmount: totalRecommendedAmount,
        availableCreditLine: totalAvailableCredit,
        forecastAccuracy: null, 
      },
      modules: {
        riesgoQuiebre,
        inventarioInmovilizado,
        comprasRecomendadas,
        capitalRequerido,
        financiamientoDisponible,
        forecast90Dias,
        rentabilidadSKU,
        proveedoresCriticos,
      },
    };
  }
}
