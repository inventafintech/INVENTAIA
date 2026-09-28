import { NextRequest, NextResponse } from 'next/server';
import { RestockCalculatorService } from '@/services/RestockCalculatorService';
import { normalizeLocationFilter } from '@/services/LocationsService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const filter = normalizeLocationFilter(
      params.get('location_id') || params.get('locationId') || params.get('location'),
      params.get('branch')
    );
    const data = await RestockCalculatorService.calculateRestockItems(filter);

    return NextResponse.json({
      success: true,
      items: data.items,
      totalCapitalRequired: data.totalCapitalRequired,
      criticalCount: data.criticalCount,
      locationFilter: filter,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al calcular reabastecimiento inteligente',
      },
      { status: 500 }
    );
  }
}
