import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { requireWorkspace } from '@/lib/requireWorkspace';
export async function GET(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const provider = searchParams.get('provider');

    let logs = db.getLogs(limit);
    if (provider) {
      logs = logs.filter(l => l.provider.toLowerCase() === provider.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      count: logs.length,
      logs: logs.map(log => ({
        id: log.id,
        fecha: log.created_at,
        usuario: log.user_email,
        integracion: log.provider,
        nivel: log.level,
        accion: log.action,
        resultado: log.result,
        errores: log.error_details || null,
        ip: log.ip_address
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener logs' },
      { status: 500 }
    );
  }
}
