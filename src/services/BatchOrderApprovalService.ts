import { RestockCalculatorService, RestockItem } from './RestockCalculatorService';
import { resolveAuthIdentity } from '@/lib/currentUser';
import {
  resolveWhatsAppCredentials,
  sendWhatsAppCloudMessage,
  resolveSapCredentials,
  postSapPurchaseOrder,
  buildOrderWhatsAppMessage,
} from '@/lib/dispatchers';

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

function uniquePoNumber(index: number): string {
  const year = new Date().getFullYear();
  return `OC-${year}-${Date.now().toString(36).toUpperCase()}${index}`;
}

export class BatchOrderApprovalService {
  /**
   * Aprueba y genera órdenes de compra reales en Supabase (purchase_orders +
   * purchase_order_lines), intenta el despacho según el proveedor (SAP OData
   * para corporativos, WhatsApp Cloud API para tradicionales) y deja
   * trazabilidad completa en sync_jobs + integration_logs.
   * Sin conector configurado, la OC queda en 'draft' con estado
   * 'pending_configuration' (regla del core, sin mocks).
   */
  public static async processBatchApproval(options: {
    itemIds?: string[];
    approveAll?: boolean;
    userEmail?: string;
  }): Promise<BatchApprovalResponse> {
    const { itemIds, approveAll } = options;
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const identity = await resolveAuthIdentity().catch(() => ({} as any));
    const userEmail = options.userEmail || identity.email || 'sistema@inventa.ai';

    const { items } = await RestockCalculatorService.calculateRestockItems();

    let targetItems: RestockItem[] = [];
    if (approveAll) {
      targetItems = items.filter((i) => i.suggestedQty > 0);
    } else if (itemIds && itemIds.length > 0) {
      targetItems = items
        .filter((i) => itemIds.includes(i.id) || itemIds.includes(i.sku))
        .filter((i) => i.suggestedQty > 0);
    } else {
      targetItems = items.filter((i) => i.suggestedQty > 0);
    }

    if (targetItems.length === 0) {
      return {
        success: true,
        count: 0,
        summary: 'No hay ítems con cantidad sugerida mayor a cero para generar órdenes.',
        results: [],
      };
    }

    // Workspace para FK de sync_jobs + lookup de integraciones.
    // Se leen también los settings: son el almacén principal de config_* y el
    // respaldo de trazabilidad sync_jobs cuando la tabla dedicada no existe
    // (cero DDL requerido).
    const { data: workspaces } = await supabase.from('workspaces').select('id,settings').limit(1);
    const workspaceId = workspaces?.[0]?.id || 'ws-default';
    const workspaceSettings = ((workspaces?.[0] as any)?.settings as Record<string, any>) || {};

    const { data: integrations } = await supabase
      .from('integrations')
      .select('provider,status,config')
      .eq('workspace_id', workspaceId);
    const configByProvider = new Map(
      (integrations || [])
        .filter((r: any) => r.status === 'ACTIVE')
        .map((r: any) => [r.provider, (r.config as Record<string, any>) || {}])
    );
    // Respaldo: config guardada por el hub en settings (config_sap, config_whatsapp, ...)
    for (const p of ['sap', 'whatsapp']) {
      if (!configByProvider.has(p)) {
        const fromSettings = workspaceSettings[`config_${p}`];
        if (fromSettings && Object.keys(fromSettings).length > 0) configByProvider.set(p, fromSettings);
      }
    }

    // Respaldo de trazabilidad en settings cuando falta la tabla sync_jobs.
    // Acotado a los últimos 100 para no inflar el JSONB del workspace.
    const appendSettingsJob = async (job: Record<string, any>) => {
      try {
        const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
        const s = { ...(((ws as any)?.settings as any) || {}) };
        const arr = Array.isArray(s.sync_jobs) ? s.sync_jobs : [];
        s.sync_jobs = [job, ...arr].slice(0, 100);
        const { error } = await supabase.from('workspaces').update({ settings: s }).eq('id', workspaceId);
        return !error;
      } catch {
        return false;
      }
    };
    const updateSettingsJob = async (jobId: string, patch: Record<string, any>) => {
      try {
        const { data: ws } = await supabase.from('workspaces').select('settings').eq('id', workspaceId).maybeSingle();
        const s = { ...(((ws as any)?.settings as any) || {}) };
        const arr = Array.isArray(s.sync_jobs) ? s.sync_jobs : [];
        const ix = arr.findIndex((j: any) => j?.id === jobId);
        if (ix < 0) return;
        arr[ix] = { ...arr[ix], ...patch };
        s.sync_jobs = arr;
        await supabase.from('workspaces').update({ settings: s }).eq('id', workspaceId);
      } catch {
        /* mejor esfuerzo */
      }
    };

    const results: BatchItemExecutionResult[] = [];

    for (let index = 0; index < targetItems.length; index++) {
      const item = targetItems[index];
      const poNumber = uniquePoNumber(index);
      const poId = `po-${Date.now().toString(36)}-${index}`;
      const eta = new Date(Date.now() + item.leadTimeDays * 86400000).toISOString().slice(0, 10);

      // 1. OC real en Supabase (siempre, incluso sin conector)
      const { error: poError } = await supabase.from('purchase_orders').insert({
        id: poId,
        order_number: poNumber,
        supplier_id: item.providerId,
        condition: 'Crédito 30d',
        total_amount: item.investment,
        estimated_arrival: eta,
        status: 'draft',
      });
      if (poError) {
        results.push({
          sku: item.sku,
          product: item.name,
          poNumber,
          message: `No se pudo registrar la OC: ${poError.message}`,
          provider: item.provider,
          connector: item.providerType === 'corporate' ? 'SAP S/4HANA OData' : 'Meta WhatsApp Cloud API',
          jobId: '-',
          status: 'failed',
        });
        continue;
      }
      const { error: lineError } = await supabase.from('purchase_order_lines').insert({
        id: `pol-${Date.now().toString(36)}-${index}`,
        po_id: poId,
        sku: item.sku,
        quantity: item.suggestedQty,
        unit_price: item.unitCost,
      });
      if (lineError) {
        await supabase.from('purchase_orders').delete().eq('id', poId);
        results.push({
          sku: item.sku,
          product: item.name,
          poNumber,
          message: `No se pudo registrar la línea de la OC: ${lineError.message}`,
          provider: item.provider,
          connector: item.providerType === 'corporate' ? 'SAP S/4HANA OData' : 'Meta WhatsApp Cloud API',
          jobId: '-',
          status: 'failed',
        });
        continue;
      }

      // 2. sync_job real (se usa el id retornado, no uno inventado).
      // Tabla dedicada si existe; si no, respaldo en settings.sync_jobs del
      // workspace (cero DDL). Los logs siempre se guardan en integration_logs.
      const attemptedJobId = `job-${Date.now().toString(36)}-${index}`;
      let jobId = attemptedJobId;
      let jobLogged = false;
      let jobInSettings = false;
      const jobProvider = item.providerType === 'corporate' ? 'sap' : 'whatsapp';
      const jobType = item.providerType === 'corporate'
        ? 'SAP_ODATA_PURCHASE_ORDER'
        : 'WHATSAPP_CLOUD_API_PURCHASE_ORDER';
      try {
        const { data: job, error: jobError } = await supabase
          .from('sync_jobs')
          .insert({
            id: attemptedJobId,
            workspace_id: workspaceId,
            provider: jobProvider,
            job_type: jobType,
            status: 'RUNNING',
          })
          .select('id')
          .single();
        if (!jobError && job?.id) {
          jobId = job.id;
          jobLogged = true;
        }
      } catch {
        jobLogged = false;
      }
      if (!jobLogged) {
        jobInSettings = await appendSettingsJob({
          id: attemptedJobId,
          workspace_id: workspaceId,
          provider: jobProvider,
          job_type: jobType,
          status: 'RUNNING',
          started_at: new Date().toISOString(),
        });
        jobLogged = jobInSettings;
      }

      const finishJob = async (status: string, errorMessage?: string) => {
        if (!jobLogged) return;
        if (jobInSettings) {
          await updateSettingsJob(jobId, {
            status,
            finished_at: new Date().toISOString(),
            error_message: errorMessage || null,
          });
          return;
        }
        await supabase
          .from('sync_jobs')
          .update({ status, finished_at: new Date().toISOString(), error_message: errorMessage || null })
          .eq('id', jobId);
      };
      // Nota honesta solo si no hubo trazabilidad de job en ningún almacén
      const traceNote = jobLogged
        ? (jobInSettings ? ' (Trazabilidad en ajustes del workspace.)' : '')
        : ' (Trazabilidad parcial: no se pudo registrar el job.)';
      const addLog = async (integration: string, resultado: string, errores?: string) => {
        await supabase.from('integration_logs').insert({
          id: `log-${Date.now().toString(36)}-${index}-${Math.floor(Math.random() * 1000)}`,
          usuario: userEmail,
          integracion: integration,
          resultado,
          errores: errores || null,
        });
      };

      // 3. Despacho según tipo de proveedor
      if (item.providerType === 'corporate') {
        const sapCreds = resolveSapCredentials(configByProvider.get('sap') || {});
        if (!sapCreds) {
          const msg = 'SAP: Conector disponible. Instancia SAP no configurada. La OC quedó en borrador.' + traceNote;
          await finishJob('FAILED', msg);
          await addLog('SAP', 'PENDIENTE', `${msg} Job: ${jobId}. OC ${poNumber} en borrador.`);
          results.push({ sku: item.sku, product: item.name, poNumber, message: msg, provider: item.provider, connector: 'SAP S/4HANA OData', jobId, status: 'pending_configuration' });
          continue;
        }
        const sent = await postSapPurchaseOrder(
          {
            poNumber,
            supplierName: item.provider,
            lines: [{ sku: item.sku, productName: item.name, quantity: item.suggestedQty, unitPrice: item.unitCost }],
          },
          sapCreds
        );
        if (sent.ok) {
          await supabase.from('purchase_orders').update({ status: 'sent' }).eq('id', poId);
          await finishJob('COMPLETED');
          await addLog('SAP', 'EXITOSO', `OC ${poNumber} transmitida a SAP. Doc: ${sent.docId}. Job: ${jobId}. Usuario: ${userEmail}.`);
          results.push({ sku: item.sku, product: item.name, poNumber, message: `OC transmitida a SAP (${sent.docId}).`, provider: item.provider, connector: 'SAP S/4HANA OData', jobId, status: 'sent' });
        } else {
          await finishJob('FAILED', sent.error);
          await addLog('SAP', 'FALLIDO', `OC ${poNumber}: ${sent.error}. Job: ${jobId}.`);
          results.push({ sku: item.sku, product: item.name, poNumber, message: `SAP rechazó la OC: ${sent.error}`, provider: item.provider, connector: 'SAP S/4HANA OData', jobId, status: 'failed' });
        }
      } else {
        const waCreds = resolveWhatsAppCredentials(configByProvider.get('whatsapp') || {});
        if (!waCreds || !item.providerPhone) {
          const msg = (
            !item.providerPhone
              ? `Sin teléfono del proveedor (${item.provider}). La OC quedó en borrador.`
              : 'Meta WhatsApp Cloud API no configurada (Pendiente de configuración). La OC quedó en borrador.'
          ) + traceNote;
          await finishJob('FAILED', msg);
          await addLog('WhatsApp', 'PENDIENTE', `${msg} Job: ${jobId}. OC ${poNumber} en borrador.`);
          results.push({ sku: item.sku, product: item.name, poNumber, message: msg, provider: item.provider, connector: 'Meta WhatsApp Cloud API', jobId, status: 'pending_configuration' });
          continue;
        }
        const sent = await sendWhatsAppCloudMessage(
          item.providerPhone,
          buildOrderWhatsAppMessage({
            poNumber,
            supplierName: item.provider,
            buyerName: 'INVENTA Comercial',
            lines: [{ sku: item.sku, productName: item.name, quantity: item.suggestedQty, unitPrice: item.unitCost }],
            total: item.investment,
            eta,
          }),
          waCreds
        );
        if (sent.ok) {
          await supabase.from('purchase_orders').update({ status: 'sent' }).eq('id', poId);
          await finishJob('COMPLETED');
          await addLog('WhatsApp', 'EXITOSO', `OC ${poNumber} enviada a ${item.providerPhone}. Msg: ${sent.messageId}. Job: ${jobId}.`);
          results.push({ sku: item.sku, product: item.name, poNumber, message: `Pedido enviado por WhatsApp (${sent.messageId}).`, provider: item.provider, connector: 'Meta WhatsApp Cloud API', jobId, status: 'sent' });
        } else {
          await finishJob('FAILED', sent.error);
          await addLog('WhatsApp', 'FALLIDO', `OC ${poNumber}: ${sent.error}. Job: ${jobId}.`);
          results.push({ sku: item.sku, product: item.name, poNumber, message: `WhatsApp falló: ${sent.error}`, provider: item.provider, connector: 'Meta WhatsApp Cloud API', jobId, status: 'failed' });
        }
      }
    }

    const sent = results.filter((r) => r.status === 'sent').length;
    const pending = results.filter((r) => r.status === 'pending_configuration').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const summary = `Se procesaron ${results.length} órdenes: ${sent} enviadas, ${pending} pendientes de configuración, ${failed} fallidas. Trazabilidad en purchase_orders, jobs (tabla o ajustes del workspace) e integration_logs.`;

    return { success: true, count: results.length, summary, results };
  }
}
