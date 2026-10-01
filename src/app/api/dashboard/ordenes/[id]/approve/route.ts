import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/services/PurchaseOrderService';
import { requireWorkspace } from '@/lib/requireWorkspace';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const { id } = await params;
    const userEmail = auth.ctx.email;

    const result = await PurchaseOrderService.approveOrder(auth.ctx.workspaceId, id, userEmail);

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
