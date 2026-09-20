import { db } from '@/lib/db';
import { RestockCalculatorService } from './RestockCalculatorService';
import { InventoryMasterService } from './InventoryMasterService';

export interface NotificationSummary {
  reabastecimiento: number;
  ordenes: number;
  inventario: number;
  integraciones: number;
}

export interface NotificationSummaryResponse {
  success: boolean;
  counts: NotificationSummary;
  timestamp: string;
}

export class NotificationService {
  /**
   * Ejecuta consultas eficientes y concurrentes (Promise.all) a la base de datos
   * para consolidar los conteos de alertas de todos los módulos del Sidebar.
   */
  public static async getAlertSummary(): Promise<NotificationSummary> {
    const [reabastecimientoCount, ordenesCount, inventarioCount, integracionesCount] = await Promise.all([
      // 1. Reabastecimiento / IA Predictiva:
      // Conteo de productos donde la cobertura sea menor al umbral de Quiebre Inminente (< 3 días).
      Promise.resolve().then(() => {
        const { items } = RestockCalculatorService.calculateRestockItems();
        return items.filter((item) => item.coverageDays < 3.0).length;
      }),

      // 2. Órdenes:
      // Conteo de la tabla purchase_orders donde el estado sea "Borrador" o "Por Aprobar" ('draft' o 'borrador')
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
      // Conteo de SKUs con estado "Stock Bajo" (salud 'low')
      Promise.resolve().then(() => {
        const items = InventoryMasterService.getInventoryItems();
        return items.filter(
          (item) => item.health === 'low' || item.healthLabel === 'Stock Bajo'
        ).length;
      }),

      // 4. Integraciones:
      // Conteo de integration_logs donde el resultado en las últimas 24 horas haya sido "Error" o requiera reconexión
      Promise.resolve().then(() => {
        const logs = db.getLogs(500);
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // Últimas 24 horas
        
        return logs.filter((l) => {
          const logTime = new Date(l.created_at).getTime();
          const isLastError =
            l.level === 'ERROR' ||
            l.result === 'Error' ||
            (l.error_details && l.error_details.length > 0);
          return logTime >= cutoffTime && isLastError;
        }).length;
      }),
    ]);

    return {
      reabastecimiento: reabastecimientoCount,
      ordenes: ordenesCount,
      inventario: inventarioCount,
      integraciones: integracionesCount,
    };
  }
}
