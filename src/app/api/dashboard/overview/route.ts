import { NextRequest, NextResponse } from 'next/server';
import { OverviewService } from '@/services/OverviewService';
import { LocationsService, normalizeLocationFilter } from '@/services/LocationsService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/overview?location_id=&branch=
 * Endpoint unificado del Panel ejecutivo: 4 KPIs + serie forecast 90d +
 * distribución de salud + top 5 acciones, en UNA sola llamada.
 * location_id recalcula todo el payload en tiempo real (verdad de BD).
 * Incluye durationMs para auditar el TTFB (<200ms con índices y selects mínimos).
 */
export async function GET(req: NextRequest) {
  const started = Date.now();
  try {
    const params = req.nextUrl.searchParams;
    const filter = normalizeLocationFilter(
      params.get('location_id') || params.get('locationId') || params.get('location'),
      params.get('branch')
    );

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const workspaceId = await LocationsService.resolveWorkspaceId(supabase);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Sin workspace disponible.' }, { status: 404 });
    }

    const overview = await OverviewService.getOverview(workspaceId, filter);

    return NextResponse.json({
      success: true,
      locationFilter: filter,
      durationMs: Date.now() - started,
      timestamp: new Date().toISOString(),
      ...overview,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al consolidar el panel' },
      { status: 500 }
    );
  }
}
