import { NextRequest, NextResponse } from 'next/server';
import { FinancingService } from '@/services/FinancingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const amount = Number(searchParams.get('amount')) || 45000;
    const termDays = Number(searchParams.get('days')) || 30;

    const creditLine = FinancingService.getCreditSummary();
    const simulation = FinancingService.simulateFinancing(amount, termDays);

    return NextResponse.json({
      success: true,
      creditLine,
      simulation,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener datos de financiamiento' },
      { status: 500 }
    );
  }
}
