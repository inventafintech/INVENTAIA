import { NextRequest, NextResponse } from 'next/server';
import { InventoryMasterService } from '@/services/InventoryMasterService';
import { normalizeLocationFilter } from '@/services/LocationsService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/inventario/resumen?location_id=&branch=
 * Consolida KPIs, categorías, ABC, antigüedad, bajo stock y alertas
 * en una sola llamada. Empty-safe: arreglos [] y nulls, nunca 500
 * por falta de datos o integraciones no conectadas.
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const filter = normalizeLocationFilter(
      params.get('location_id') || params.get('locationId') || params.get('location'),
      params.get('branch')
    );
    const metrics = await InventoryMasterService.getInventoryMetrics(filter);
    return NextResponse.json({ success: true, locationFilter: filter, ...metrics }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al consolidar resumen de inventario';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
