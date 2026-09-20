import { NextRequest, NextResponse } from 'next/server';
import { PurchaseOrderService } from '@/services/PurchaseOrderService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pdfBuffer = PurchaseOrderService.generatePdfBuffer(id);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Error al generar PDF de la orden de compra' },
      { status: 404 }
    );
  }
}
