import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/services/PurchaseOrderService';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = PurchaseOrderService.getAllOrders();
    const metrics = PurchaseOrderService.getMetrics();
    const suppliers = db.getSuppliers();

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
