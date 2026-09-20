import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/services/PurchaseOrderService';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const userEmail = body?.userEmail || 'operaciones@distribuidorasanmartin.pe';

    const result = await PurchaseOrderService.approveOrder(id, userEmail);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al aprobar la orden de compra',
      },
      { status: 500 }
    );
  }
}
