import { NextResponse } from 'next/server';
import { RestockCalculatorService } from '@/services/RestockCalculatorService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = RestockCalculatorService.calculateRestockItems();

    return NextResponse.json({
      success: true,
      items: data.items,
      totalCapitalRequired: data.totalCapitalRequired,
      criticalCount: data.criticalCount,
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
