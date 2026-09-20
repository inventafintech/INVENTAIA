import { NextResponse } from 'next/server';
import { PurchasingBrainService } from '@/services/PurchasingBrainService';

export async function GET() {
  try {
    const summary = await PurchasingBrainService.getSummary();
    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener resumen de compras' },
      { status: 500 }
    );
  }
}
