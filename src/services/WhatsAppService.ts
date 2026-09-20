import { db } from '@/lib/db';

export class WhatsAppService {
  private static readonly GRAPH_API_VERSION = 'v19.0';

  /**
   * Sends real WhatsApp message via Meta WhatsApp Cloud API
   */
  public static async sendMessage(to: string, message: string): Promise<{
    success: boolean;
    message_id?: string;
    status: string;
  }> {
    const integration = db.getIntegration('whatsapp');
    const tokenRecord = db.getOAuthToken('whatsapp');

    const accessToken = 
      process.env.WHATSAPP_ACCESS_TOKEN || 
      tokenRecord?.access_token || 
      integration?.config?.access_token;

    const phoneNumberId = 
      process.env.WHATSAPP_PHONE_NUMBER_ID || 
      integration?.config?.phone_number_id;

    if (!accessToken || !phoneNumberId) {
      db.addLog(
        'whatsapp',
        'ERROR',
        'SEND_MESSAGE',
        'FALLIDO',
        'Credenciales de Meta WhatsApp Cloud API no configuradas (WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID faltante).'
      );
      throw new Error('Credenciales de Meta WhatsApp Cloud API no configuradas. El conector se encuentra en estado Pendiente de configuración.');
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/[^0-9]/g, ''),
      type: 'text',
      text: { preview_url: false, body: message }
    };

    const url = `https://graph.facebook.com/${this.GRAPH_API_VERSION}/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || `Meta API error HTTP ${response.status}`;
      db.addLog(
        'whatsapp',
        'ERROR',
        'SEND_MESSAGE',
        'FALLIDO',
        `Error Meta API: ${errorMsg}`
      );
      throw new Error(errorMsg);
    }

    const messageId = data.messages?.[0]?.id;

    db.addLog(
      'whatsapp',
      'SUCCESS',
      'SEND_MESSAGE',
      'EXITOSO',
      `Mensaje enviado a ${to}. ID de mensaje Meta: ${messageId || 'OK'}`
    );

    return {
      success: true,
      message_id: messageId,
      status: 'sent',
    };
  }
}
