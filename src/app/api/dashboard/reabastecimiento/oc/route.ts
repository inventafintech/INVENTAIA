import { NextRequest, NextResponse } from 'next/server';
import { BatchOrderApprovalService } from '@/services/BatchOrderApprovalService';
import { requireWorkspace } from '@/lib/requireWorkspace';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireWorkspace();
    if (auth.error) return auth.error;
    const body = await req.json();
    const { itemId, itemIds, approveAll } = body;
    const userEmail = auth.ctx.email;

    let targetIds: string[] | undefined = undefined;
    if (itemIds && Array.isArray(itemIds)) {
      targetIds = itemIds;
    } else if (itemId) {
      targetIds = [itemId];
    }

    const result = await BatchOrderApprovalService.processBatchApproval({
      itemIds: targetIds,
      approveAll: Boolean(approveAll),
      userEmail,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in POST /api/dashboard/reabastecimiento/oc:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar órdenes de compra' },
      { status: 500 }
    );
  }
}
