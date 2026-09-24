import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integraciones/stats — KPIs reales del hub desde integration_logs:
 * sincronizaciones de hoy y última actualización global.
 */
export async function GET() {
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    const { data: logs } = await supabase
      .from('integration_logs')
      .select('fecha')
      .order('fecha', { ascending: false })
      .limit(500);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const syncsToday = (logs || []).filter((l: any) => new Date(l.fecha).getTime() >= startOfToday.getTime()).length;
    const lastSyncAt = (logs || [])[0]?.fecha || null;

    return NextResponse.json({ success: true, syncsToday, lastSyncAt });
  } catch (error: any) {
    console.error('Error en GET integraciones/stats:', error);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
