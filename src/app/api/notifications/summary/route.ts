import { NextResponse } from 'next/server';
import { NotificationService } from '@/services/NotificationService';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const counts = await NotificationService.getAlertSummary();

    return NextResponse.json({
      success: true,
      counts,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in GET /api/notifications/summary:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener el resumen de notificaciones',
      },
      { status: 500 }
    );
  }
}
