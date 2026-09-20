import { NextRequest, NextResponse } from 'next/server';
import { BatchOrderApprovalService } from '@/services/BatchOrderApprovalService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemId, itemIds, approveAll, userEmail } = body;

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
