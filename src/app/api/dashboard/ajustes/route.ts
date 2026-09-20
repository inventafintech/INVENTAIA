import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SessionManager } from '@/lib/session';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace?.id ||
      'ws-default';

    const workspace = db.getWorkspace(workspaceId);
    const companyName =
      workspace?.name ||
      customSession?.workspaceName ||
      (nextAuthSession?.user as any)?.workspace?.name ||
      'Distribuidora San Martín S.A.C.';

    return NextResponse.json({
      success: true,
      settings: {
        companyName,
        ruc: '20601234567',
        leadTime: 5,
        sla: '95',
        currency: 'PEN',
        horizon: '30',
        notifyWhatsApp: true,
        notifyEmail: true,
      },
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const customSession = await SessionManager.getSession();
    const nextAuthSession = await getServerSession(authOptions);

    const body = await req.json().catch(() => ({}));
    const { companyName, ruc, leadTime, sla, currency, horizon, notifyWhatsApp, notifyEmail } = body;

    const trimmedName = typeof companyName === 'string' ? companyName.trim() : '';
    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'La Razón Social debe tener al menos 2 caracteres.' },
        { status: 400 }
      );
    }

    const workspaceId =
      customSession?.workspaceId ||
      (nextAuthSession?.user as any)?.workspace?.id ||
      'ws-default';

    // Persistir en base de datos
    const updated = db.updateWorkspace(workspaceId, {
      name: trimmedName,
    });

    // Actualizar sesión activa
    if (customSession) {
      await SessionManager.createSession({
        ...customSession,
        workspaceName: trimmedName,
      });
    }

    db.addLog(
      'system',
      'INFO',
      'WORKSPACE_UPDATED',
      'EXITOSO',
      `Razón Social actualizada a "${trimmedName}" en base de datos.`,
      customSession?.email || 'admin@inventa.ai'
    );

    return NextResponse.json({
      success: true,
      workspaceName: trimmedName,
      workspace: updated || { id: workspaceId, name: trimmedName },
      message: 'Configuración guardada exitosamente en la base de datos.',
    });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
