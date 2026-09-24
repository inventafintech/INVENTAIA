/**
 * Conectores reales de despacho de órdenes de compra.
 * - Corporativo: SAP S/4HANA OData (POST) si hay conector configurado.
 * - Tradicional: Meta WhatsApp Cloud API (POST a graph.facebook.com) si hay
 *   credenciales (env o tabla integrations) y teléfono del proveedor.
 * Sin configuración, devuelven { ok: false, pendingConfiguration: true } y el
 * llamador registra "Pendiente de configuración" en la trazabilidad.
 */

export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
}

export function resolveWhatsAppCredentials(integrationConfig: Record<string, any> = {}): WhatsAppCredentials | null {
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN || integrationConfig.access_token || integrationConfig.accessToken;
  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID || integrationConfig.phone_number_id || integrationConfig.phoneNumberId;
  if (!accessToken || !phoneNumberId) return null;
  return { accessToken, phoneNumberId };
}

export async function sendWhatsAppCloudMessage(
  to: string,
  message: string,
  creds: WhatsAppCredentials
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const digits = to.replace(/[^0-9]/g, '');
  if (!digits) return { ok: false, error: 'Número de destino inválido.' };
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: digits,
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (data as any)?.error?.message || `Meta API error HTTP ${res.status}` };
    }
    return { ok: true, messageId: (data as any)?.messages?.[0]?.id };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error de red con Meta API.' };
  }
}

export interface SapCredentials {
  baseUrl: string;
  username?: string;
  password?: string;
}

export function resolveSapCredentials(integrationConfig: Record<string, any> = {}): SapCredentials | null {
  const baseUrl =
    process.env.SAP_HOST || integrationConfig.baseUrl || integrationConfig.host;
  if (!baseUrl) return null;
  return {
    baseUrl: String(baseUrl).replace(/\/+$/, ''),
    username: process.env.SAP_USERNAME || integrationConfig.username,
    password: process.env.SAP_PASSWORD || integrationConfig.password,
  };
}

export interface SapPurchaseOrderPayload {
  poNumber: string;
  supplierName: string;
  currency?: string;
  lines: Array<{ sku: string; productName: string; quantity: number; unitPrice: number }>;
}

export async function postSapPurchaseOrder(
  po: SapPurchaseOrderPayload,
  creds: SapCredentials
): Promise<{ ok: boolean; docId?: string; error?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (creds.username) {
    headers.Authorization = `Basic ${Buffer.from(`${creds.username}:${creds.password || ''}`).toString('base64')}`;
  }
  try {
    const res = await fetch(
      `${creds.baseUrl}/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/A_PurchaseOrder`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          PurchaseOrder: po.poNumber,
          Supplier: po.supplierName,
          DocumentCurrency: po.currency || 'PEN',
          to_PurchaseOrderItem: po.lines.map((l, idx) => ({
            PurchaseOrderItem: String(idx + 1).padStart(5, '0'),
            Material: l.sku,
            OrderQuantity: l.quantity,
            NetPriceAmount: l.unitPrice,
          })),
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (data as any)?.error?.message?.value || `SAP OData error HTTP ${res.status}` };
    }
    return { ok: true, docId: (data as any)?.d?.PurchaseOrder || po.poNumber };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error de red con SAP OData.' };
  }
}

/** Mensaje de WhatsApp con el detalle de la OC (tradicionales). */
export function buildOrderWhatsAppMessage(input: {
  poNumber: string;
  supplierName: string;
  buyerName: string;
  lines: Array<{ sku: string; productName: string; quantity: number; unitPrice: number }>;
  total: number;
  eta: string;
}): string {
  const linesText = input.lines
    .map((l) => `• ${l.productName} (${l.sku}) x ${l.quantity} u — S/ ${l.unitPrice.toFixed(2)} c/u`)
    .join('\n');
  return (
    `Hola ${input.supplierName}, somos ${input.buyerName}. ` +
    `Solicitamos cotización/pedido ${input.poNumber}:\n${linesText}\n` +
    `Total estimado: S/ ${input.total.toFixed(2)}. Entrega estimada: ${input.eta}. ` +
    `Quedamos atentos a su confirmación.`
  );
}
