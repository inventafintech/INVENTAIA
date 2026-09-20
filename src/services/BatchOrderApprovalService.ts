import { db } from '@/lib/db';
import { RestockCalculatorService, RestockItem } from './RestockCalculatorService';

export interface BatchItemExecutionResult {
  sku: string;
  product: string;
  poNumber: string;
  message: string;
  provider: string;
  connector: string;
  jobId: string;
  status: 'pending_configuration' | 'sent' | 'failed';
}

export interface BatchApprovalResponse {
  success: boolean;
  count: number;
  summary: string;
  results: BatchItemExecutionResult[];
}

export class BatchOrderApprovalService {
  /**
   * Procesa la aprobación por lote (1-Clic) de órdenes de compra
   * Ejecuta transacciones en base de datos: purchase_orders, sync_jobs, integration_logs
   */
  public static async processBatchApproval(options: {
    itemIds?: string[];
    approveAll?: boolean;
    userEmail?: string;
  }): Promise<BatchApprovalResponse> {
    const { itemIds, approveAll, userEmail = 'operaciones@distribuidorasanmartin.pe' } = options;
    const { items } = RestockCalculatorService.calculateRestockItems();

    let targetItems: RestockItem[] = [];

    if (approveAll) {
      targetItems = items;
    } else if (itemIds && itemIds.length > 0) {
      targetItems = items.filter((i) => itemIds.includes(i.id) || itemIds.includes(i.sku));
    } else {
      targetItems = items;
    }

    const results: BatchItemExecutionResult[] = [];
    const baseTimestamp = Date.now();

    for (let index = 0; index < targetItems.length; index++) {
      const item = targetItems[index];
      const sequentialSuffix = Math.floor(1000 + Math.random() * 9000);
      const poNumber = `OC-2026-${sequentialSuffix}`;
      const jobId = `job-${baseTimestamp + index}`;

      // 1. Crear registro oficial de la orden en la tabla purchase_orders
      db.createPurchaseOrder(
        {
          order_number: poNumber,
          supplier_id: `sup-${item.provider.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          supplier_name: item.provider,
          condition: 'Crédito 30d',
          total_amount: item.investment,
          estimated_arrival: new Date(Date.now() + item.leadTimeDays * 86400000).toISOString(),
          status: 'draft',
          lines_count: 1,
        },
        [
          {
            sku: item.sku,
            product_name: item.name,
            quantity: item.suggestedQty,
            unit_price: item.unitCost,
            subtotal: item.investment,
          },
        ]
      );

      // 2. Generar tarea en la tabla sync_jobs con Job ID único
      const integrationType = item.providerType === 'corporate' ? 'int-sap' : 'int-whatsapp';
      const jobType = item.providerType === 'corporate' ? 'SAP_ODATA_PURCHASE_ORDER' : 'WHATSAPP_CLOUD_API_PURCHASE_ORDER';
      db.createSyncJob(integrationType, jobType);

      // 3. Enrutamiento dinámico según el tipo de integración requerida por el proveedor
      if (item.providerType === 'corporate') {
        // Proveedores Corporativos (ej. UNACEM) -> Conector SAP S/4HANA OData
        const connectorName = 'SAP S/4HANA OData';
        const integration = db.getIntegration('sap');
        const sapConfig = integration?.config || {};
        const sapValid = Boolean(
          process.env.SAP_HOST || sapConfig.baseUrl || sapConfig.host
        );

        const errorMessage = 'SAP OData: Conector SAP S/4HANA OData no configurado (Pendiente de configuración).';

        // Actualizar sync_job a failed por falta de credenciales
        db.updateSyncJob(jobId, 'failed', errorMessage);

        // Registrar auditoría en integration_logs
        db.addLog(
          'SAP',
          'ERROR',
          `GENERAR_OC_${poNumber}`,
          'FALLIDO',
          userEmail,
          `${errorMessage} Job ID: ${jobId}`
        );

        results.push({
          sku: item.sku,
          product: item.name,
          poNumber,
          message: errorMessage,
          provider: item.provider,
          connector: connectorName,
          jobId,
          status: 'pending_configuration',
        });
      } else {
        // Proveedores Tradicionales (ej. Alicorp, Leche Gloria, Costeño) -> Meta WhatsApp Cloud API
        const connectorName = 'Meta WhatsApp Cloud API';
        const errorMessage = 'Meta WhatsApp Cloud API no configurada (Pendiente de configuración). Se registró log de auditoría.';

        // Actualizar sync_job
        db.updateSyncJob(jobId, 'failed', errorMessage);

        // Registrar auditoría en integration_logs
        db.addLog(
          'WhatsApp',
          'ERROR',
          `GENERAR_OC_${poNumber}`,
          'FALLIDO',
          userEmail,
          `${errorMessage} Job ID: ${jobId}`
        );

        results.push({
          sku: item.sku,
          product: item.name,
          poNumber,
          message: errorMessage,
          provider: item.provider,
          connector: connectorName,
          jobId,
          status: 'pending_configuration',
        });
      }
    }

    const summary = `Se procesaron ${results.length} órdenes de compra en el motor de integraciones. Registros almacenados en sync_jobs e integration_logs.`;

    return {
      success: true,
      count: results.length,
      summary,
      results,
    };
  }
}
