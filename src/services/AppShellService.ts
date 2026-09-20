import { db } from '@/lib/db';
import { IntegrationEngineService } from './IntegrationEngineService';
import { AppShellState } from '@/types/appShell';

export class AppShellService {
  /**
   * Obtiene el estado consolidado del App Shell para el layout global
   */
  public static getAppShellState(): AppShellState {
    const health = IntegrationEngineService.checkIntegrationsHealth();
    
    // Obtener órdenes de compra que requieren atención (estado 'draft')
    const orders = db.getPurchaseOrders();
    const pendingOrdersCount = orders.filter((o) => o.status === 'draft').length;

    const logs = db.getLogs(5);
    const lastSuccess = logs.find((l) => l.level === 'SUCCESS');

    return {
      companyName: 'Distribuidora San Martín',
      companyInitials: 'I.AI',
      pageTitle: 'Cerebro de Compras',
      hasActiveIntegrations: health.hasActive,
      statusText: health.statusText,
      integrationBadgeStatus: health.hasActive ? 'active' : 'pending',
      pendingOrdersCount,
      providers: health.providers,
      lastSyncTimestamp: lastSuccess?.created_at || null,
    };
  }
}
