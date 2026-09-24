import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { NexoEngineService } from '@/services/NexoEngineService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nexo/query — interpreta un mensaje en lenguaje natural
 * (enrutador determinista en español, sin LLM) y responde con texto +
 * tarjetas accionables calculadas sobre datos reales.
 * Body: { message?: string, pathname?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const message = typeof body?.message === 'string' ? body.message.slice(0, 500) : '';
    const pathname = typeof body?.pathname === 'string' ? body.pathname.slice(0, 200) : '';

    const session = await SessionManager.getSession().catch(() => null);
    const email = session?.email || 'sistema@inventa.ai';

    const result = await NexoEngineService.query(message, pathname, email);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error en POST /api/nexo/query:', error);
    return NextResponse.json({ error: 'Nexo no pudo procesar tu mensaje.' }, { status: 500 });
  }
}
