import { NextResponse } from 'next/server';
import { InventoryMasterService } from '@/services/InventoryMasterService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/inventario/resumen
 * Consolida KPIs, categorías, ABC, antigüedad, bajo stock y alertas
 * en una sola llamada. Empty-safe: arreglos [] y nulls, nunca 500
 * por falta de datos o integraciones no conectadas.
 */
export async function GET() {
  try {
    const summary = InventoryMasterService.getInventorySummary();
    return NextResponse.json(summary, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Error al consolidar resumen de inventario';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
