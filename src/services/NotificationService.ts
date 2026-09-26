import { db } from '@/lib/db';
import { RestockCalculatorService } from './RestockCalculatorService';
import { InventoryMasterService } from './InventoryMasterService';

export interface NotificationSummary {
  reabastecimiento: number;
  ordenes: number;
  inventario: number;
  integraciones: number;
  riesgoQuiebre: number;
  proveedoresCriticos: number;
  inventarioInmovilizado: number;
}

export interface NotificationSummaryResponse {
  success: boolean;
  counts: NotificationSummary;
  timestamp: string;
}

export class NotificationService {
  /**
   * Ejecuta consultas eficientes y concurrentes (Promise.all) a la base de datos
   * para consolidar los conteos de alertas de todos los módulos estratégicos del Sidebar.
   */
  public static async getAlertSummary(): Promise<NotificationSummary> {
    const [restockData, ordenesCount, inventarioData, integracionesCount] = await Promise.all([
      // 1. Reabastecimiento / IA Predictiva:
      // Conteo de productos calculados con ROP y cobertura
      Promise.resolve().then(() => {
        return RestockCalculatorService.calculateRestockItems();
      }),

      // 2. Órdenes:
      // Conteo de la tabla purchase_orders donde el estado sea "Borrador" o "Por Aprobar"
      Promise.resolve().then(() => {
        const orders = db.getPurchaseOrders();
        return orders.filter(
          (o) =>
            o.status === 'draft' ||
            (o.status as string) === 'borrador' ||
            (o.status as string) === 'por_aprobar'
        ).length;
      }),

      // 3. Inventario:
      // Conteo de SKUs con estado "Stock Bajo" y "Stock Inmovilizado / Exceso"
      // REGLA ANTIGRAVITY: cero fallbacks. 0 si DB vacía, nunca valor inventado.
      Promise.resolve().then(async () => {
        const items = await InventoryMasterService.getInventoryItems();
        if (!items || items.length === 0) return { lowStock: 0, inmovilizado: 0 };
        const lowStock = items.filter(
          (item: any) => item.health === 'low' || item.healthLabel === 'Stock Bajo'
        ).length;
        const inmovilizado = items.filter(
          (item: any) => (item.physicalStock ?? 0) > 500 && item.health === 'healthy'
        ).length;
        return { lowStock, inmovilizado };
      }),

      // 4. Integraciones:
      // Conteo de integration_logs donde el resultado en las últimas 24 horas haya sido "Error"
      Promise.resolve().then(() => {
        const logs = db.getLogs(500);
        if (!logs || logs.length === 0) return 0;
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
        return logs.filter((l) => {
          const logTime = new Date(l.created_at).getTime();
          if (Number.isNaN(logTime)) return false;
          const isLastError =
            l.level === 'ERROR' ||
            l.result === 'Error' ||
            (l.error_details && l.error_details.length > 0);
          return logTime >= cutoffTime && isLastError;
        }).length;
      }),
    ]);

    // Filtrar SKUs en riesgo inminente de quiebre (cobertura < 3.5 días o status critical)
    // Conteo real DB. 0 si vacío. Sin fallbacks.
    const criticalItems = (restockData.items ?? []).filter(
      (item) => item.status === 'critical' || item.coverageDays < 3.5
    );
    const riesgoQuiebreCount = criticalItems.length;

    // Proveedores críticos: proveedores únicos que suministran SKUs en riesgo de quiebre
    const criticalProvidersSet = new Set(
      criticalItems.map((i) => i.provider).filter(Boolean)
    );

    return {
      reabastecimiento: (restockData.items ?? []).filter((i) => i.suggestedQty > 0).length,
      ordenes: ordenesCount ?? 0,
      inventario: inventarioData.lowStock ?? 0,
      integraciones: integracionesCount ?? 0,
      riesgoQuiebre: riesgoQuiebreCount,
      proveedoresCriticos: criticalProvidersSet.size,
      inventarioInmovilizado: inventarioData.inmovilizado,
    };
  }
}
