import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/services/PurchaseOrderService';
import { createClient } from '@/utils/supabase/server';

import { requireWorkspace } from '@/lib/requireWorkspace';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
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
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
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

    const supabase = await createClient();
    
    // Calcular el total amount
    const totalAmount = lines.reduce((acc: number, line: any) => acc + (Number(line.quantity) * Number(line.unitPrice)), 0);
    const orderNumber = `OC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: order, error: orderError } = await supabase.from('purchase_orders').insert({
      order_number: orderNumber,
      supplier_id: supplierId,
      condition,
      estimated_arrival: estimatedArrival,
      total_amount: totalAmount,
      status: 'draft'
    }).select().single();

    if (orderError || !order) {
      throw new Error(orderError?.message || "Error al crear la orden de compra");
    }

    const orderLines = lines.map((line: any) => ({
      po_id: order.id,
      sku: line.sku,
      quantity: Number(line.quantity),
      unit_price: Number(line.unitPrice)
    }));

    await supabase.from('purchase_order_lines').insert(orderLines);

    return NextResponse.json({
      success: true,
      order: order,
      lines: orderLines,
      message: `Orden ${order.order_number} creada y lista para aprobación.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear la orden de compra' },
      { status: 500 }
    );
  }
}
