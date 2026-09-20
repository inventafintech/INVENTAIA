import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { to, message, templateName, languageCode } = body;

    const integration = db.getIntegration('whatsapp');
    const tokenRecord = db.getOAuthToken('whatsapp');

    const accessToken = 
      process.env.WHATSAPP_ACCESS_TOKEN || 
      tokenRecord?.access_token || 
      integration?.config?.access_token;

    const phoneNumberId = 
      process.env.WHATSAPP_PHONE_NUMBER_ID || 
      integration?.config?.phone_number_id;

    if (!to || (!message && !templateName)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parámetros incompletos: Se requiere número de destino ("to") y mensaje o plantilla.' 
        },
        { status: 400 }
      );
    }

    if (!accessToken || !phoneNumberId) {
      db.addLog(
        'whatsapp',
        'ERROR',
        'SEND_MESSAGE',
        'FALLIDO',
        'Credenciales de Meta WhatsApp Cloud API no configuradas (WHATSAPP_ACCESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID faltante).'
      );

      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales de Meta WhatsApp Cloud API no configuradas. El conector se encuentra en estado Pendiente de configuración.',
          status: 'pending_configuration'
        },
        { status: 400 }
      );
    }

    // Build real Meta WhatsApp Cloud API payload
    const payload: Record<string, any> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/[^0-9]/g, ''),
    };

    if (templateName) {
      payload.type = 'template';
      payload.template = {
        name: templateName,
        language: { code: languageCode || 'es' }
      };
    } else {
      payload.type = 'text';
      payload.text = { preview_url: false, body: message };
    }

    // Real call to Meta Graph API
    const metaUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const metaResponse = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const metaData = await metaResponse.json();

    if (!metaResponse.ok) {
      const errorMsg = metaData.error?.message || `Meta API error HTTP ${metaResponse.status}`;
      db.addLog(
        'whatsapp',
        'ERROR',
        'SEND_MESSAGE',
        'FALLIDO',
        `Error Meta API: ${errorMsg}`
      );

      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          meta_response: metaData
        },
        { status: metaResponse.status }
      );
    }

    // Success
    db.addLog(
      'whatsapp',
      'SUCCESS',
      'SEND_MESSAGE',
      'EXITOSO',
      `Mensaje enviado a ${to}. ID: ${metaData.messages?.[0]?.id || 'OK'}`
    );

    return NextResponse.json({
      success: true,
      message_id: metaData.messages?.[0]?.id,
      contacts: metaData.contacts,
      status: 'sent'
    });

  } catch (error: any) {
    db.addLog(
      'whatsapp',
      'ERROR',
      'SEND_MESSAGE',
      'EXCEPCION',
      error.message || 'Error inesperado al enviar mensaje de WhatsApp'
    );

    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
