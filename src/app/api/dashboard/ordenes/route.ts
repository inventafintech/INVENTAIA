import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/services/PurchaseOrderService';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await PurchaseOrderService.getAllOrders();
    const metrics = await PurchaseOrderService.getMetrics();
    
    const supabase = await createClient();
    const { data: suppliers } = await supabase.from('suppliers').select('*');

    return NextResponse.json({
      success: true,
      orders,
      metrics,
      suppliers,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener órdenes de compra' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supplierId, condition, estimatedArrival, lines } = body;

    if (!supplierId || !condition || !estimatedArrival || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campos requeridos faltantes: supplierId, condition, estimatedArrival, y al menos 1 línea.',
        },
        { status: 400 }
      );
    }

    const result = PurchaseOrderService.createOrder(
      supplierId,
      condition,
      estimatedArrival,
      lines
    );

    return NextResponse.json({
      success: true,
      order: result.po,
      lines: result.lines,
      message: `Orden ${result.po.order_number} creada exitosamente en estado Borrador.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear la orden de compra' },
      { status: 500 }
    );
  }
}
