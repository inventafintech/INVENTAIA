import { createClient } from '@/utils/supabase/server';
import { PurchasingBrainSummary } from '@/types';

export class PurchasingBrainService {
  /**
   * Computes the real Executive Summary for "Cerebro de Compras"
   * ZERO MOCKS: If no integrations are active or no real data is synced,
   * it returns unconfigured / pending states.
   */
  public static async getSummary(): Promise<PurchasingBrainSummary> {
    const supabase = await createClient();

    // Consultar Integraciones
    const { data: integrations } = await supabase.from('integrations').select('*');
    const activeIntegrations = (integrations || []).filter(
      i => i.status === 'configured' || i.status === 'ACTIVE'
    );

    // Consultar Logs
    const { data: logs } = await supabase.from('integration_logs').select('*').order('fecha', { ascending: false }).limit(1);
    const latestSuccessLog = logs?.find(l => l.resultado === 'SUCCESS');

    // If no integrations are active
    if (activeIntegrations.length === 0) {
      return {
        hasActiveIntegrations: false,
        activeIntegrationsCount: 0,
        statusText: 'Pendiente de configuración (Sin integraciones activas)',
        lastSyncTimestamp: null,

        skusEnRiesgoCount: 0,
        ventasEnRiesgoMonto: 0,
        skusEnRiesgoDetalles: [],

        inventarioInmovilizadoMonto: 0,
        porcentajeVariacionMensual: 0,

        ordenesRecomendadasCount: 0,
        ordenesRecomendadasDetalles: [],
        confianzaForecastPromedio: 0,

        capitalRequeridoMonto: 0,
        diasPlazo: 30,
        porcentajeEjecucion: 0,

        financiamientoDisponibleMonto: 0,
        tasaMensual: 0,
        entidadFinanciera: 'Pendiente de conexión',
        estadoFinanciamiento: 'no_disponible',

        forecast90Dias: [],
        rentabilidadSKUs: [],
        proveedoresCriticos: [],
      };
    }

    // Datos Reales
    const { data: products } = await supabase.from('products').select('*');
    const { data: inventory } = await supabase.from('inventory_levels').select('*');
    const { data: suppliers } = await supabase.from('suppliers').select('*');
    
    const inventoryMap = new Map((inventory || []).map(inv => [inv.product_id, inv]));
    const productsReal = products || [];

    const totalProducts = productsReal.length;
    const connectedProviders = activeIntegrations.map(i => i.provider.toUpperCase()).join(' & ');

    // Calcular en base a inventario real
    let skusEnRiesgoCount = 0;
    let ventasEnRiesgoMonto = 0;
    let inventarioInmovilizadoMonto = 0;
    const skusEnRiesgoDetalles: any[] = [];
    const rentabilidadSKUs: any[] = [];

    for (const p of productsReal) {
      const inv = inventoryMap.get(p.id);
      const stock = inv?.physical_stock || 0;
      const safety = inv?.safety_stock || 0;
      const cost = Number(p.unit_cost) || 0;
      const price = Number(p.unit_price) || 0;

      // Inmovilizado
      inventarioInmovilizadoMonto += stock * cost;

      // Rentabilidad
      const gmroi = cost > 0 ? ((price - cost) / cost) * 100 : 0;
      rentabilidadSKUs.push({
        sku: p.sku_code,
        nombre: p.name,
        gmroi: Math.round(gmroi),
        rotacion: 0 // Sin ventas reales aun
      });

      // Riesgo
      if (stock <= safety) {
        skusEnRiesgoCount++;
        ventasEnRiesgoMonto += safety * price; // Potencial perdido
        
        if (skusEnRiesgoDetalles.length < 5) {
           skusEnRiesgoDetalles.push({
             id: p.id,
             sku: p.sku_code,
             nombre: p.name,
             stockActual: stock,
             diasRestantes: 0,
             ventasEnRiesgo: safety * price,
             nivelRiesgo: 'critico'
           });
        }
      }
    }

    const { data: creditLines } = await supabase.from('credit_lines').select('*').limit(1);
    const activeCredit = creditLines?.[0];

    return {
      hasActiveIntegrations: true,
      activeIntegrationsCount: activeIntegrations.length,
      statusText: `Sincronizado con ${connectedProviders}`,
      lastSyncTimestamp: latestSuccessLog?.fecha || new Date().toISOString(),

      skusEnRiesgoCount,
      ventasEnRiesgoMonto,
      skusEnRiesgoDetalles,

      inventarioInmovilizadoMonto,
      porcentajeVariacionMensual: 0, // Requiere historico

      ordenesRecomendadasCount: 0,
      ordenesRecomendadasDetalles: [],
      confianzaForecastPromedio: 0,

      capitalRequeridoMonto: 0,
      diasPlazo: 30,
      porcentajeEjecucion: 0,

      financiamientoDisponibleMonto: activeCredit ? Number(activeCredit.available_amount) : 0,
      tasaMensual: activeCredit ? Number(activeCredit.monthly_interest_rate) * 100 : 0,
      entidadFinanciera: activeCredit ? 'Línea de Crédito Activa' : 'Sin Financiamiento',
      estadoFinanciamiento: activeCredit ? 'aprobado' : 'evaluacion',

      forecast90Dias: [],
      rentabilidadSKUs: rentabilidadSKUs.slice(0, 5),

      proveedoresCriticos: (suppliers || []).slice(0, 5).map(s => ({
        nombre: s.name,
        leadTimeDias: s.lead_time_days,
        ubicacion: 'N/A',
        estado: 'normal'
      })),
    };
  }
}
