import { IntegrationService } from './IntegrationService';

export class WhatsAppService {
  /**
   * Envía una notificación crítica de quiebre de stock por WhatsApp usando Meta Cloud API oficial.
   */
  static async sendStockAlert(
    workspaceId: string,
    recipientPhoneNumber: string,
    productName: string,
    daysRemaining: number
  ) {
    const apiToken = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!apiToken || !phoneNumberId) {
      // Registrar log si no está configurada la API Key
      await IntegrationService.logIntegrationEvent(
        workspaceId,
        'sistema@inventa.ai',
        'WhatsApp Cloud API',
        'PENDIENTE',
        'Variables WHATSAPP_CLOUD_API_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configuradas.'
      );
      return {
        success: false,
        message: 'WhatsApp Cloud API no está configurada con un token real.',
      };
    }

    const cleanPhone = recipientPhoneNumber.replace(/[^0-9]/g, '');

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: 'stockout_alert_critical',
          language: { code: 'es' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: productName },
                { type: 'text', text: String(daysRemaining) },
              ],
            },
          ],
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      await IntegrationService.logIntegrationEvent(
        workspaceId,
        'sistema@inventa.ai',
        'WhatsApp Cloud API',
        'ERROR',
        JSON.stringify(data)
      );
      throw new Error(`Falló el envío de WhatsApp: ${data.error?.message || res.statusText}`);
    }

    await IntegrationService.logIntegrationEvent(
      workspaceId,
      'sistema@inventa.ai',
      'WhatsApp Cloud API',
      'EXITOSO',
      `Alerta enviada a ${cleanPhone} para el producto "${productName}".`
    );

    return { success: true, data };
  }

  /**
   * Envía un mensaje de texto general por WhatsApp.
   */
  static async sendMessage(to: string, message: string) {
    return this.sendStockAlert('ws-default', to, message, 0);
  }
}
