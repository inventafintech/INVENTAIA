import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { NexoEngineService, NexoAction } from '@/services/NexoEngineService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/nexo/execute — ejecuta una acción transaccional real propuesta
 * por Nexo. EXIGE confirm:true (el clic final del usuario); sin ella → 400.
 * Toda ejecución se audita en integration_logs como "Asistida por Nexo".
 * Body: { action: { type, label, payload }, confirm: true }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const action = body?.action as NexoAction | undefined;
    const confirm = body?.confirm === true;

    if (!action || typeof action.type !== 'string') {
      return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
    }
    if (!confirm) {
      return NextResponse.json(
        { error: 'Falta la confirmación explícita del usuario. Sin tu clic final no ejecuto nada.' },
        { status: 400 }
      );
    }

    const session = await SessionManager.getSession().catch(() => null);
    const email = session?.email || 'sistema@inventa.ai';

    const result = await NexoEngineService.execute(action, email, confirm);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (error: any) {
    console.error('Error en POST /api/nexo/execute:', error);
    return NextResponse.json({ error: 'No se pudo ejecutar la acción.' }, { status: 500 });
  }
}
