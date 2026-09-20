import { NextRequest, NextResponse } from 'next/server';
import { RestockCalculatorService, RestockItem } from '@/services/RestockCalculatorService';
import { WhatsAppService } from '@/services/WhatsAppService';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface OCExecutionResult {
  sku: string;
  product: string;
  provider: string;
  integration: 'sap' | 'whatsapp';
  status: 'sent' | 'pending_configuration' | 'failed';
  message: string;
  poNumber: string;
  jobId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, approveAll, userEmail = 'operaciones@distribuidorasanmartin.pe' } = body;

    const { items } = RestockCalculatorService.calculateRestockItems();

    let targetItems: RestockItem[] = [];

    if (approveAll) {
      targetItems = items;
    } else if (itemId) {
      const found = items.find((i) => i.id === itemId || i.sku === itemId);
      if (!found) {
        return NextResponse.json(
          { success: false, error: `SKU / Item '${itemId}' no encontrado en el catálogo de reabastecimiento.` },
          { status: 404 }
        );
      }
      targetItems = [found];
    } else {
      return NextResponse.json(
        { success: false, error: 'Debe especificar un itemId o el flag approveAll.' },
        { status: 400 }
      );
    }

    const results: OCExecutionResult[] = [];

    for (const item of targetItems) {
      const poNumber = `OC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      if (item.providerType === 'corporate') {
        // Corporate Provider -> SAP S/4HANA REST / OData Connector
        const job = db.createSyncJob('int-sap', 'SAP_ODATA_PURCHASE_ORDER');
        const integration = db.getIntegration('sap');
        const sapHost = process.env.SAP_HOST || integration?.config?.host;
        const sapApiKey = process.env.SAP_API_KEY || integration?.config?.api_key;
        const sapUser = process.env.SAP_USERNAME || integration?.config?.username;
        const sapPassword = process.env.SAP_PASSWORD || integration?.config?.password;
        const sapClient = process.env.SAP_CLIENT || integration?.config?.client || '100';

        if (!sapHost || (!sapApiKey && (!sapUser || !sapPassword))) {
          const errorMsg = 'Conector SAP S/4HANA OData no configurado (Pendiente de configuración).';
          db.updateSyncJob(job.id, 'failed', errorMsg);
          db.addLog(
            'sap',
            'ERROR',
            `GENERAR_OC_${poNumber}`,
            'FALLIDO',
            `${errorMsg} SKU: ${item.sku}, Cantidad: ${item.suggestedQty}`,
            userEmail
          );

          results.push({
            sku: item.sku,
            product: item.name,
            provider: item.provider,
            integration: 'sap',
            status: 'pending_configuration',
            message: `SAP OData: ${errorMsg}`,
            poNumber,
            jobId: job.id,
          });
        } else {
          try {
            const headers: Record<string, string> = {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'sap-client': sapClient,
            };
            if (sapApiKey) {
              headers['APIKey'] = sapApiKey;
            } else if (sapUser && sapPassword) {
              const auth = Buffer.from(`${sapUser}:${sapPassword}`).toString('base64');
              headers['Authorization'] = `Basic ${auth}`;
            }

            const poPayload = {
              PurchaseOrderType: 'NB',
              CompanyCode: '1000',
              PurchasingOrganization: '1000',
              PurchasingGroup: '001',
              Supplier: item.provider,
              to_PurchaseOrderItem: [
                {
                  PurchaseOrderItemText: item.name,
                  Material: item.sku,
                  OrderQuantity: item.suggestedQty.toString(),
                  PurchaseOrderQuantityUnit: 'EA',
                  NetPriceAmount: item.unitCost.toString(),
                },
              ],
            };

            const sapUrl = `${sapHost.replace(/\/$/, '')}/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder`;
            const sapRes = await fetch(sapUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(poPayload),
            });

            if (!sapRes.ok) {
              const errText = await sapRes.text();
              throw new Error(`SAP OData Error HTTP ${sapRes.status}: ${errText}`);
            }

            db.updateSyncJob(job.id, 'completed');
            db.addLog(
              'sap',
              'SUCCESS',
              `GENERAR_OC_${poNumber}`,
              'EXITOSO',
              `OC ${poNumber} enviada exitosamente vía SAP S/4HANA OData para ${item.provider}. Cantidad: ${item.suggestedQty} u`,
              userEmail
            );

            results.push({
              sku: item.sku,
              product: item.name,
              provider: item.provider,
              integration: 'sap',
              status: 'sent',
              message: `Orden ${poNumber} transmitida a SAP S/4HANA OData exitosamente.`,
              poNumber,
              jobId: job.id,
            });
          } catch (sapErr: any) {
            db.updateSyncJob(job.id, 'failed', sapErr.message);
            db.addLog(
              'sap',
              'ERROR',
              `GENERAR_OC_${poNumber}`,
              'FALLIDO',
              sapErr.message,
              userEmail
            );

            results.push({
              sku: item.sku,
              product: item.name,
              provider: item.provider,
              integration: 'sap',
              status: 'failed',
              message: `Fallo de transmisión SAP OData: ${sapErr.message}`,
              poNumber,
              jobId: job.id,
            });
          }
        }
      } else {
        // Traditional Provider -> Meta WhatsApp Cloud API
        const job = db.createSyncJob('int-whatsapp', 'WHATSAPP_CLOUD_API_PURCHASE_ORDER');
        const phone = item.providerPhone || '+51987654321';
        const formattedAmount = item.investment.toLocaleString('es-PE', { minimumFractionDigits: 2 });
        const waMessage = 
`*ORDEN DE COMPRA GENERADA - DISTRIBUIDORA SAN MARTÍN*
OC N°: ${poNumber}
Proveedor: ${item.provider}
SKU: ${item.sku}
Producto: ${item.name}
Cantidad Solicitada: ${item.suggestedQty.toLocaleString()} unidades
Inversión Estimada: S/ ${formattedAmount}
Fecha de Emisión: ${new Date().toLocaleDateString('es-PE')}
Estado: Pedido automatizado emitido por IA de Reabastecimiento.`;

        try {
          await WhatsAppService.sendMessage(phone, waMessage);
          db.updateSyncJob(job.id, 'completed');
          db.addLog(
            'whatsapp',
            'SUCCESS',
            `GENERAR_OC_${poNumber}`,
            'EXITOSO',
            `OC ${poNumber} enviada por WhatsApp a ${item.provider} (${phone}).`,
            userEmail
          );

          results.push({
            sku: item.sku,
            product: item.name,
            provider: item.provider,
            integration: 'whatsapp',
            status: 'sent',
            message: `OC ${poNumber} enviada vía Meta WhatsApp Cloud API a ${item.provider}.`,
            poNumber,
            jobId: job.id,
          });
        } catch (waErr: any) {
          const isPending = waErr.message.includes('Pendiente de configuración') || waErr.message.includes('no configuradas');
          db.updateSyncJob(job.id, 'failed', waErr.message);
          db.addLog(
            'whatsapp',
            'ERROR',
            `GENERAR_OC_${poNumber}`,
            'FALLIDO',
            waErr.message,
            userEmail
          );

          results.push({
            sku: item.sku,
            product: item.name,
            provider: item.provider,
            integration: 'whatsapp',
            status: isPending ? 'pending_configuration' : 'failed',
            message: isPending 
              ? `Meta WhatsApp Cloud API no configurada (Pendiente de configuración). Se registró log de auditoría.`
              : `Fallo al enviar mensaje WhatsApp: ${waErr.message}`,
            poNumber,
            jobId: job.id,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
      summary: `Se procesaron ${results.length} órdenes de compra en el motor de integraciones. Registros almacenados en sync_jobs e integration_logs.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar órdenes de compra' },
      { status: 500 }
    );
  }
}
