import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveWhatsAppCredentials, sendWhatsAppCloudMessage } from '@/lib/dispatchers';

import { requireWorkspace } from '@/lib/requireWorkspace';
export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json().catch(() => ({}));
    const { to, message, templateName } = body;

    const integration = db.getIntegration('whatsapp');
    const tokenRecord = db.getOAuthToken('whatsapp');

    const creds = resolveWhatsAppCredentials({
      access_token:
        tokenRecord?.access_token || integration?.config?.access_token,
      phone_number_id: integration?.config?.phone_number_id,
    });

    if (!to || (!message && !templateName)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parámetros incompletos: Se requiere número de destino ("to") y mensaje o plantilla.' 
        },
        { status: 400 }
      );
    }

    if (!creds) {
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

    if (templateName) {
      return NextResponse.json(
        { success: false, error: 'Plantillas no soportadas en este endpoint. Envía "message" de texto.' },
        { status: 400 }
      );
    }

    // Envío real vía Meta Graph API (librería compartida con reabastecimiento)
    const result = await sendWhatsAppCloudMessage(to, message, creds);

    if (!result.ok) {
      db.addLog(
        'whatsapp',
        'ERROR',
        'SEND_MESSAGE',
        'FALLIDO',
        `Error Meta API: ${result.error}`
      );

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 502 }
      );
    }

    // Success
    db.addLog(
      'whatsapp',
      'SUCCESS',
      'SEND_MESSAGE',
      'EXITOSO',
      `Mensaje enviado a ${to}. ID: ${result.messageId || 'OK'}`
    );

    return NextResponse.json({
      success: true,
      message_id: result.messageId,
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
